'use strict';

/**
 * Agent 1 · 资料收集官
 * 职责：围绕用户话题搜集、去重、筛选并排序原始资料，
 *       产出供「观点对照官」与「知识梳理官」使用的材料包。
 *
 * 数据来源（按优先级）：
 *  1. 知乎知识内容接口（无鉴权，真实内容，始终可用）
 *  2. 知乎搜索 / 全网搜索 / 实时热榜（配置 Access Secret 后启用，带缓存）
 *  3. 演示模式内置热榜（未配置凭证时兜底，明确标注）
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
    summary: (item.ContentText || item.Summary || item.content || item.summary || '').slice(0, 160),
    url: item.Url || item.url || item.link || '',
    sourceType,
    relevance: item.RelevanceScore ?? item.relevance_score ?? null,
    likes: item.LikeCount ?? item.like_count ?? null,
    comments: item.CommentCount ?? item.comment_count ?? null,
    publishedAt: item.PublishTime || item.published_at || null,
  };
}

/** 收集原始资料。 */
async function collect(topic, scenario, ctx) {
  const { live, emit } = ctx;
  emit('collector', 'start', `正在搜集「${topic}」的知乎知识与全网资料…`);

  // 1) 知乎知识内容匹配（真实、无鉴权）
  let matchedKnowledge = [];
  try {
    const list = await knowledgeApi.listKnowledge();
    matchedKnowledge = knowledgeApi.matchKnowledge(list, topic, (scenario && scenario.keywords) || [], 4);
  } catch (err) {
    emit('collector', 'warn', `知识内容接口暂不可用：${err.message}`);
  }
  if (matchedKnowledge.length) {
    emit('collector', 'info', `匹配到 ${matchedKnowledge.length} 篇知乎知识内容`);
  }

  // 2) 实时搜索（有凭证时）
  let zhihuResults = [];
  let webResults = [];
  let hotTopics = [];
  if (live) {
    try {
      zhihuResults = (await zhihu.searchZhihu(topic, 10))
        .map((i) => normalizeSearchItem(i, '知乎问答'))
        .filter((i) => scoreResult(i, topic) > 0);
      emit('collector', 'info', `知乎搜索返回 ${zhihuResults.length} 条相关内容`);
    } catch (err) {
      emit('collector', 'warn', `知乎搜索暂不可用：${err.message}`);
    }
    try {
      webResults = (await zhihu.searchGlobal(topic, 10))
        .map((i) => normalizeSearchItem(i, '全网来源'))
        .filter((i) => scoreResult(i, topic) > 0);
    } catch (err) {
      emit('collector', 'warn', `全网搜索暂不可用：${err.message}`);
    }
    try {
      hotTopics = (await zhihu.hot(20)).slice(0, 8).map((h, idx) => ({
        rank: idx + 1,
        title: h.Title || h.title || h.question_title || '',
        heat: h.HeatScore || h.heat_score || h.hot_value || '',
        type: h.Type || h.type || '热点',
        tag: '实时',
        audience: 'both',
      }));
    } catch (err) {
      emit('collector', 'warn', `热榜暂不可用：${err.message}`);
    }
  } else {
    hotTopics = DEMO_HOT.map((h) => ({ ...h }));
  }

  // 3) 资料整理：汇总来源清单
  const sources = [
    ...matchedKnowledge.map((k) => ({ kind: '知乎知识内容', title: k.title, desc: k.description, workId: k.workId, demo: true })),
    ...zhihuResults.map((r) => ({ kind: '知乎问答', title: r.title, desc: r.summary, url: r.url, demo: false })),
    ...webResults.map((r) => ({ kind: '全网来源', title: r.title, desc: r.summary, url: r.url, demo: false })),
  ];

  emit('collector', 'done', `资料整理完成，共 ${sources.length} 份素材`);
  return {
    topic,
    scenarioId: scenario ? scenario.id : 'generic',
    matchedKnowledge,
    zhihuResults,
    webResults,
    hotTopics,
    sources,
  };
}

module.exports = { collect };
