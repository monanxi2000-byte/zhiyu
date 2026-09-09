'use strict';

/**
 * Agent 2 · 观点对照官
 * 职责：识别领域内核心讨论的分歧点与共识点，把「谁在支持什么、
 *       为什么」摆出来对照，每条观点带来源标注，不做立场合并。
 *
 * 数据来源：
 *  1. 场景库内置的领域常见讨论（演示模式，明确标注「演示素材」）
 *  2. 匹配到的知乎知识内容描述（真实内容，提炼为共识）
 *  3. 实时模式：调用知乎直答，基于知乎优质内容生成观点综述
 *     （非流式、6 小时缓存，控制直答 100 次/天的额度）
 */

const zhihu = require('../lib/zhihuClient');

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

  // 3) 实时模式：直答综述
  let aiSummary = null;
  if (live) {
    emit('comparator', 'info', '正在调用知乎直答生成观点综述…');
    try {
      const prompt =
        `你是面向新人的领域引路人。针对「${topic}」这个入门话题，` +
        `请基于知乎社区的优质讨论，给出：1) 3-4 条新手最应该知道的共识建议；` +
        `2) 最常见的 2 个分歧点及双方理由。用中文分点回答，每条不超过 40 字。`;
      aiSummary = await zhihu.answer(prompt, 'zhida-fast-1p5');
    } catch (err) {
      emit('comparator', 'warn', `直答综述暂不可用：${err.message}`);
      aiSummary = null;
    }
  }

  emit('comparator', 'done', `观点对照完成：${debates.length} 组讨论、${consensus.length} 条共识`);
  return { debates, consensus, aiSummary, demo: !live };
}

module.exports = { compare };
