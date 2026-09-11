'use strict';

/**
 * Agent 2 · 观点对照官（增强版）
 * 职责：识别领域内核心讨论的分歧点与共识点，
 *       接入知乎真实搜索获取多视角观点，每条带来源标注。
 *
 * 数据来源：
 *  1. 场景库内置的领域常见讨论（演示模式）
 *  2. 匹配到的知乎知识内容描述（真实内容，提炼为共识）
 *  3. 知乎搜索结果（实时模式：从真实问答中提取多视角观点）
 *  4. 知乎直答综述（实时模式：基于知乎优质内容生成观点综述）
 */

const zhihu = require('../lib/zhihuClient');

/** 从知乎搜索结果中提取观点素材 */
function extractViewsFromZhihuResults(zhihuResults, topic) {
  const views = [];
  const seen = new Set();

  for (const item of zhihuResults || []) {
    const title = String(item.title || '').trim();
    const summary = String(item.summary || '').trim();
    if (!title || seen.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());

    // 根据标题和摘要判断立场标签
    let label = '社区观点';
    let stance = 'neutral';
    if (/推荐|建议|应该|必须|最好|首选/.test(title)) {
      label = '推荐派';
      stance = 'support';
    } else if (/不推荐|避免|不要|坑|雷区|误区/.test(title)) {
      label = '避坑派';
      stance = 'caution';
    } else if (/对比|区别|哪个|vs|还是/.test(title)) {
      label = '对比派';
      stance = 'compare';
    } else if (/经验|分享|我的|历程|心得/.test(title)) {
      label = '经验派';
      stance = 'experience';
    }

    views.push({
      stance,
      label,
      points: [title, summary.slice(0, 80)].filter(Boolean),
      source: item.author ? `知乎答主 @${item.author}` : '知乎问答',
      url: item.url || '',
      likes: item.likes || 0,
    });
  }

  return views.slice(0, 12);
}

async function compare(topic, scenario, materials, ctx) {
  const { live, emit } = ctx;
  emit('comparator', 'start', '正在对照不同答主的观点，寻找共识与分歧…');

  const debates = [];
  const consensus = [];
  const seenConsensus = new Set();

  // 1) 领域常见讨论（内置引导性内容，含引路人建议）
  if (scenario && Array.isArray(scenario.debates)) {
    for (const d of scenario.debates) {
      debates.push({
        question: d.question,
        consensus: d.consensus || '',
        guidance: d.guidance || '',
        views: (d.views || []).map((v) => ({
          stance: v.stance,
          label: v.label,
          points: v.points || [],
          source: v.source || '社区常见讨论',
        })),
      });
    }
    emit('comparator', 'info', `整理出 ${debates.length} 组领域核心讨论`);
  }

  // 2) 从真实知乎知识内容提炼共识性观点
  for (const k of materials.matchedKnowledge || []) {
    const point = (k.description || '').trim();
    if (!point || seenConsensus.has(k.title)) continue;
    seenConsensus.add(k.title);
    consensus.push({
      point,
      source: { title: k.title, type: '知乎知识内容', workId: k.workId },
    });
  }

  // 3) 实时模式：从知乎搜索结果中提取真实多视角观点
  let zhihuViews = [];
  if (live && materials.zhihuResults && materials.zhihuResults.length > 0) {
    emit('comparator', 'info', `正在从 ${materials.zhihuResults.length} 条知乎搜索结果中提取多视角观点…`);
    zhihuViews = extractViewsFromZhihuResults(materials.zhihuResults, topic);

    // 将知乎真实观点补充到讨论中
    if (zhihuViews.length > 0) {
      // 按立场分组
      const byStance = {};
      for (const v of zhihuViews) {
        if (!byStance[v.stance]) byStance[v.stance] = [];
        byStance[v.stance].push(v);
      }

      // 生成知乎真实讨论组
      const zhihuDebate = {
        question: `关于「${topic}」，知乎答主们怎么看？`,
        consensus: `综合 ${zhihuViews.length} 位知乎答主的真实经验，建议新手多参考不同立场的观点，避免单一视角。`,
        guidance: `新手建议：先看推荐派了解主流路径，再看避坑派少走弯路，最后结合经验派找到适合自己的方法。`,
        views: zhihuViews.slice(0, 6),
        isZhihuReal: true,
      };
      debates.unshift(zhihuDebate);
      emit('comparator', 'info', `从知乎搜索结果中提取了 ${zhihuViews.length} 条真实观点`);
    }
  }

  // 4) 实时模式：知乎直答综述
  let aiSummary = null;
  if (live) {
    emit('comparator', 'info', '正在调用知乎直答生成观点综述…');
    try {
      const prompt =
        `你是面向新人的领域引路人。针对「${topic}」这个入门话题，` +
        `请基于知乎社区的优质讨论，给出：1) 4-5 条新手最应该知道的共识建议；` +
        `2) 最常见的 3 个分歧点及双方理由。用中文分点回答，每条不超过 50 字，要具体、可操作。`;
      aiSummary = await zhihu.answer(prompt, 'zhida-fast-1p5');
    } catch (err) {
      emit('comparator', 'warn', `直答综述暂不可用：${err.message}`);
      aiSummary = null;
    }
  }

  // 5) 从知乎推荐中补充共识
  if (materials.zhihuRecommendations && materials.zhihuRecommendations.length > 0) {
    for (const rec of materials.zhihuRecommendations.slice(0, 5)) {
      const point = `高赞推荐：${rec.title}`;
      if (!seenConsensus.has(point)) {
        seenConsensus.add(point);
        consensus.push({
          point,
          source: { title: rec.title, type: '知乎高赞推荐', url: rec.url, likes: rec.likes },
        });
      }
    }
  }

  emit('comparator', 'done', `观点对照完成：${debates.length} 组讨论、${consensus.length} 条共识、${zhihuViews.length} 条知乎真实观点`);
  return { debates, consensus, aiSummary, zhihuViews, demo: !live };
}

module.exports = { compare };
