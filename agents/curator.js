'use strict';

/**
 * Agent 3 · 知识梳理官
 * 职责：把资料整理成可执行、可复习的结构化产出——
 *       分阶段学习路径（含避坑与里程碑）、核心概念（含例子）、
 *       复习卡片（概念卡 / 行动卡 / 避坑卡 / 决策卡）。
 *
 * v2 升级：答案更具体——每个阶段带「常见坑 + 里程碑 + 建议用时」，
 *          每个概念带「一句话例子」，复习卡覆盖 4 种题型。
 */

const { GENERIC } = require('../data/scenarios');

async function build(topic, scenario, materials, ctx) {
  const { emit } = ctx;
  emit('curator', 'start', '正在把资料编织成学习路径与复习卡片…');

  const template = scenario || GENERIC;

  // 1) 学习路径（含避坑 / 里程碑 / 建议用时）
  const stages = (template.stages || []).map((s, idx) => ({
    order: idx + 1,
    title: s.title,
    goal: s.goal || '',
    actions: s.actions || [],
    skills: s.skills || [],
    pitfalls: s.pitfalls || [],
    milestone: s.milestone || '',
    timeHint: s.timeHint || '',
  }));

  // 2) 核心概念（含例子）
  const concepts = (template.concepts || []).map((c, idx) => ({
    id: `c${idx + 1}`,
    name: c.name,
    explanation: c.explanation,
    example: c.example || '',
  }));

  // 3) 复习卡片：概念卡 + 行动卡 + 避坑卡 + 决策卡
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
  ];

  emit('curator', 'done', `知识梳理完成：${stages.length} 个阶段、${concepts.length} 个概念、${flashcards.length} 张卡片`);
  return {
    stages,
    concepts,
    flashcards,
    timePlan: template.timePlan || '',
    note: '学习路径基于知乎社区常见经验整理；配置 Access Secret 后将结合实时搜索结果与直答生成。',
  };
}

module.exports = { build };
