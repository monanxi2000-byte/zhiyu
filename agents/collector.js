'use strict';

/**
 * Agent 1 · 资料收集官（增强版）
 * 职责：围绕用户话题进行多维度、大量知乎检索，
 *       产出丰富的资料包、相关话题推荐和知乎优质内容。
 *
 * 数据来源（按优先级）：
 *  1. 知乎知识内容接口（无鉴权，真实内容，始终可用）
 *  2. 知乎多关键词搜索（入门/教程/经验/避坑/路线等维度）
 *  3. 全网搜索 + 实时热榜
 *  4. 演示模式内置热榜（未配置凭证时兜底）
 */

const knowledgeApi = require('./knowledgeApi');
const zhihu = require('../lib/zhihuClient');
const { DEMO_HOT } = require('../data/hotTopics');

/** 轻量相关度打分：标题命中 > 正文命中 > 权威度字段。 */
function scoreResult(item, topic) {
  const title = String(item.Title || item.title || '');
  const content = String(item.ContentText || item.content || item.Summary || item.summary || '');
  const authority = Number(item.AuthorityLevel || item.authority_level || 0) || 0;
  const t = String(topic || '').toLowerCase();
  let score = 0;
  if (t && title.toLowerCase().includes(t)) score += 10;
  if (t && content.toLowerCase().includes(t)) score += 3;
  score += Math.min(authority, 5);
  return score;
}

function normalizeSearchItem(item, sourceType) {
  return {
    title: item.Title || item.title || '(无标题)',
    author: item.AuthorName || item.author_name || item.author || '',
    summary: (item.ContentText || item.Summary || item.content || item.summary || '').slice(0, 200),
    url: item.Url || item.url || item.link || '',
    sourceType,
    relevance: item.RelevanceScore ?? item.relevance_score ?? null,
    likes: item.LikeCount ?? item.like_count ?? null,
    comments: item.CommentCount ?? item.comment_count ?? null,
    publishedAt: item.PublishTime || item.published_at || null,
  };
}

/** 生成多维度搜索关键词 */
function buildSearchQueries(topic) {
  const t = String(topic || '').trim();
  if (!t) return [];
  return [
    t,                          // 原始话题
    `${t} 入门`,                // 入门指南
    `${t} 教程`,                // 教程资源
    `${t} 经验`,                // 经验分享
    `${t} 避坑`,                // 避坑指南
    `${t} 学习路线`,            // 学习路线
    `${t} 推荐`,                // 资源推荐
    `${t} 新手`,                // 新手必看
  ];
}

/** 收集原始资料（增强版：多关键词、大量检索）。 */
async function collect(topic, scenario, ctx) {
  const { live, emit } = ctx;
  emit('collector', 'start', `正在全方位搜集「${topic}」的知乎知识与全网资料…`);

  // 1) 知乎知识内容匹配（真实、无鉴权）
  let matchedKnowledge = [];
  try {
    const list = await knowledgeApi.listKnowledge();
    matchedKnowledge = knowledgeApi.matchKnowledge(list, topic, (scenario && scenario.keywords) || [], 8);
  } catch (err) {
    emit('collector', 'warn', `知识内容接口暂不可用：${err.message}`);
  }
  if (matchedKnowledge.length) {
    emit('collector', 'info', `匹配到 ${matchedKnowledge.length} 篇知乎知识内容`);
  }

  // 2) 实时搜索（有凭证时）—— 多关键词、大量检索
  let zhihuResults = [];
  let webResults = [];
  let hotTopics = [];
  let relatedTopics = [];

  if (live) {
    const queries = buildSearchQueries(topic);
    emit('collector', 'info', `正在进行 ${queries.length} 个维度的知乎搜索…`);

    // 知乎多关键词搜索（并行，每个关键词返回15条）
    const zhihuSearchPromises = queries.map(async (q) => {
      try {
        const results = await zhihu.searchZhihu(q, 15);
        return results.map((i) => normalizeSearchItem(i, '知乎问答'))
          .filter((i) => scoreResult(i, topic) >= 0);
      } catch {
        return [];
      }
    });

    try {
      const zhihuBatches = await Promise.all(zhihuSearchPromises);
      // 合并去重（按标题）
      const seen = new Set();
      zhihuResults = [];
      for (const batch of zhihuBatches) {
        for (const item of batch) {
          const key = item.title.trim().toLowerCase();
          if (!seen.has(key) && item.title !== '(无标题)') {
            seen.add(key);
            zhihuResults.push(item);
          }
        }
      }
      // 按相关度排序，取前30条
      zhihuResults.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      zhihuResults = zhihuResults.slice(0, 30);
      emit('collector', 'info', `知乎多维度搜索返回 ${zhihuResults.length} 条优质内容`);
    } catch (err) {
      emit('collector', 'warn', `知乎搜索暂不可用：${err.message}`);
    }

    // 全网搜索（20条）
    try {
      webResults = (await zhihu.searchGlobal(topic, 20))
        .map((i) => normalizeSearchItem(i, '全网来源'))
        .filter((i) => scoreResult(i, topic) >= 0);
    } catch (err) {
      emit('collector', 'warn', `全网搜索暂不可用：${err.message}`);
    }

    // 热榜（30条，筛选相关话题）
    try {
      const hotList = await zhihu.hot(30);
      hotTopics = hotList.slice(0, 15).map((h, idx) => ({
        rank: idx + 1,
        title: h.Title || h.title || h.question_title || '',
        heat: h.HeatScore || h.heat_score || h.hot_value || '',
        type: h.Type || h.type || '热点',
        tag: '实时',
        audience: 'both',
      }));
      // 从热榜中提取相关话题（标题包含topic关键词）
      const topicLower = topic.toLowerCase();
      relatedTopics = hotList
        .filter((h) => {
          const title = (h.Title || h.title || h.question_title || '').toLowerCase();
          return topicLower.split('').some((word) => title.includes(word)) || title.includes(topicLower);
        })
        .slice(0, 8)
        .map((h) => ({
          title: h.Title || h.title || h.question_title || '',
          heat: h.HeatScore || h.heat_score || h.hot_value || '',
          url: h.Url || h.url || '',
        }));
    } catch (err) {
      emit('collector', 'warn', `热榜暂不可用：${err.message}`);
    }
  } else {
    hotTopics = DEMO_HOT.map((h) => ({ ...h }));
  }

  // 3) 资料整理：汇总来源清单（按类型分组）
  const sources = [
    ...matchedKnowledge.map((k) => ({ kind: '知乎知识内容', title: k.title, desc: k.description, workId: k.workId, demo: true })),
    ...zhihuResults.slice(0, 20).map((r) => ({ kind: '知乎问答', title: r.title, desc: r.summary, url: r.url, author: r.author, likes: r.likes, demo: false })),
    ...webResults.slice(0, 10).map((r) => ({ kind: '全网来源', title: r.title, desc: r.summary, url: r.url, demo: false })),
  ];

  // 4) 知乎优质推荐（高赞、高评论，放宽条件确保有数据）
  const zhihuRecommendations = zhihuResults
    .filter((r) => r.title && r.title !== '(无标题)')
    .sort((a, b) => (b.likes || 0) - (a.likes || 0) || (b.comments || 0) - (a.comments || 0))
    .slice(0, 10);

  emit('collector', 'done', `资料整理完成：${sources.length} 份素材、${zhihuRecommendations.length} 条知乎优质推荐、${relatedTopics.length} 个相关话题`);
  return {
    topic,
    scenarioId: scenario ? scenario.id : 'generic',
    matchedKnowledge,
    zhihuResults,
    webResults,
    hotTopics,
    relatedTopics,
    zhihuRecommendations,
    sources,
  };
}

module.exports = { collect };
