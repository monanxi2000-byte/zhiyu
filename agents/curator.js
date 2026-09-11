'use strict';

/**
 * Agent 3 · 知识梳理官（增强版）
 * 职责：把资料编织成可执行、可复习的结构化产出，
 *       每个阶段/概念都附带知乎推荐资源和参考链接。
 *
 * v3 增强：
 *  - 每个学习阶段附带知乎推荐资源（高赞问答/文章）
 *  - 每个核心概念附带知乎参考链接
 *  - 复习卡片融入知乎真实案例
 *  - 增加知乎优质推荐模块
 */

const { GENERIC } = require('../data/scenarios');

/** 从知乎搜索结果中为关键词匹配推荐资源 */
function matchZhihuResources(zhihuResults, keywords, count = 3) {
  if (!zhihuResults || !zhihuResults.length || !keywords || !keywords.length) return [];
  const results = [];
  const seen = new Set();

  for (const item of zhihuResults) {
    const title = String(item.title || '').toLowerCase();
    const summary = String(item.summary || '').toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      const k = String(kw || '').toLowerCase();
      if (k && title.includes(k)) score += 5;
      if (k && summary.includes(k)) score += 2;
    }
    if (score > 0 && !seen.has(title)) {
      seen.add(title);
      results.push({ ...item, matchScore: score });
    }
  }

  return results
    .sort((a, b) => b.matchScore - a.matchScore || (b.likes || 0) - (a.likes || 0))
    .slice(0, count);
}

async function build(topic, scenario, materials, ctx) {
  const { emit } = ctx;
  emit('curator', 'start', '正在把资料编织成学习路径与复习卡片…');

  const template = scenario || GENERIC;
  const zhihuResults = materials.zhihuResults || [];
  const zhihuRecommendations = materials.zhihuRecommendations || [];

  // 1) 学习路径（含避坑 / 里程碑 / 建议用时 / 知乎推荐资源）
  const stages = (template.stages || []).map((s, idx) => {
    // 为每个阶段匹配知乎推荐资源
    const stageKeywords = [s.title, ...(s.skills || []), ...(s.actions || [])];
    const zhihuResources = matchZhihuResources(zhihuResults, stageKeywords, 3);

    return {
      order: idx + 1,
      title: s.title,
      goal: s.goal || '',
      actions: s.actions || [],
      skills: s.skills || [],
      pitfalls: s.pitfalls || [],
      milestone: s.milestone || '',
      timeHint: s.timeHint || '',
      zhihuResources,
    };
  });

  // 2) 核心概念（含例子 / 知乎参考链接）
  const concepts = (template.concepts || []).map((c, idx) => {
    // 为每个概念匹配知乎参考
    const conceptResources = matchZhihuResources(zhihuResults, [c.name, ...(c.keywords || [])], 2);
    return {
      id: `c${idx + 1}`,
      name: c.name,
      explanation: c.explanation,
      example: c.example || '',
      zhihuReferences: conceptResources,
    };
  });

  // 3) 复习卡片：概念卡 + 行动卡 + 避坑卡 + 决策卡 + 知乎案例卡
  const flashcards = [
    // 概念卡（问-答）
    ...concepts.map((c) => ({
      id: `f-${c.id}`,
      type: '概念卡',
      front: `什么是「${c.name}」？`,
      back: c.example ? `${c.explanation}\n\n💡 ${c.example}` : c.explanation,
    })),
    // 行动卡（阶段关键动作）
    ...stages.map((s, idx) => ({
      id: `a-${idx + 1}`,
      type: '行动卡',
      front: `「${s.title}」阶段最重要的一个动作是什么？`,
      back: s.actions[0] || s.goal,
    })),
    // 避坑卡（错误 → 正确）
    ...stages.flatMap((s, idx) =>
      (s.pitfalls || []).slice(0, 2).map((p, pi) => ({
        id: `p-${idx + 1}-${pi + 1}`,
        type: '避坑卡',
        front: `⚠️ 这个坑你避开了吗？\n${p.length > 24 ? p.slice(0, 24) + '…' : p}`,
        back: `正确做法：\n${s.actions[Math.min(pi, s.actions.length - 1)] || s.milestone}`,
      }))
    ),
    // 决策卡（来自观点对照的引路人建议）
    ...((scenario && scenario.debates) || []).map((d, idx) => ({
      id: `d-${idx + 1}`,
      type: '决策卡',
      front: `面对「${d.question}」怎么选？`,
      back: d.guidance || d.consensus,
    })),
    // 知乎案例卡（从知乎高赞推荐中提取）
    ...zhihuRecommendations.slice(0, 5).map((rec, idx) => ({
      id: `z-${idx + 1}`,
      type: '知乎案例卡',
      front: `📖 知乎高赞：${rec.title.slice(0, 30)}${rec.title.length > 30 ? '…' : ''}`,
      back: `${rec.summary || '来自知乎社区的真实经验分享'}\n\n👍 ${rec.likes || 0} 赞 · 作者：${rec.author || '匿名'}`,
    })),
  ];

  // 4) 知乎优质推荐模块（独立展示）
  const zhihuTopPicks = zhihuRecommendations.slice(0, 8).map((rec) => ({
    title: rec.title,
    summary: rec.summary,
    url: rec.url,
    author: rec.author,
    likes: rec.likes,
    comments: rec.comments,
  }));

  // 5) 相关话题推荐
  const relatedTopics = materials.relatedTopics || [];

  emit('curator', 'done', `知识梳理完成：${stages.length} 个阶段、${concepts.length} 个概念、${flashcards.length} 张卡片、${zhihuTopPicks.length} 条知乎推荐`);
  return {
    stages,
    concepts,
    flashcards,
    zhihuTopPicks,
    relatedTopics,
    timePlan: template.timePlan || '',
    note: '学习路径基于知乎社区真实经验与优质内容整理；每个阶段和概念都附带知乎推荐资源，点击可查看原文。',
  };
}

module.exports = { build };
