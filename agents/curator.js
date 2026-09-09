'use strict';

/**
 * Agent 3 · 知识梳理官
 * 职责：把资料整理成可执行、可复习的结构化产出——
 *       分阶段学习路径、核心概念清单、复习卡片。
 *
 * 输出物与使用场景：
 *  · stages      学习路径（阶段 → 目标 → 行动清单 → 技能）
 *  · concepts    核心概念（点击可翻转的术语卡）
 *  · flashcards  复习卡片（概念卡 + 行动卡，间隔复习用）
 */

const { GENERIC } = require('../data/scenarios');

async function build(topic, scenario, materials, ctx) {
  const { emit } = ctx;
  emit('curator', 'start', '正在把资料编织成学习路径与复习卡片…');

  const template = scenario || GENERIC;

  // 1) 学习路径
  const stages = (template.stages || []).map((s, idx) => ({
    order: idx + 1,
    title: s.title,
    goal: s.goal || '',
    actions: s.actions || [],
    skills: s.skills || [],
  }));

  // 2) 核心概念
  const concepts = (template.concepts || []).map((c, idx) => ({
    id: `c${idx + 1}`,
    name: c.name,
    explanation: c.explanation,
  }));

  // 3) 复习卡片：概念卡 + 行动卡
  const flashcards = [
    ...concepts.map((c) => ({
      id: `f-${c.id}`,
      type: '概念卡',
      front: `什么是「${c.name}」？`,
      back: c.explanation,
    })),
    ...stages.slice(0, 2).map((s, idx) => ({
      id: `a-${idx + 1}`,
      type: '行动卡',
      front: `「${s.title}」阶段最重要的一个动作是什么？`,
      back: s.actions[0] || s.goal,
    })),
  ];

  emit('curator', 'done', `知识梳理完成：${stages.length} 个阶段、${concepts.length} 个概念、${flashcards.length} 张卡片`);
  return {
    stages,
    concepts,
    flashcards,
    note: '学习路径基于知乎社区常见经验整理；配置 Access Secret 后将结合实时搜索结果与直答生成。',
  };
}

module.exports = { build };
