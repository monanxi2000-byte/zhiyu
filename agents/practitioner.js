'use strict';

/**
 * Agent 4 · 实践官（Practitioner）
 *
 * 基于学习路径和知乎资料，为用户生成可执行的小项目任务和实践练习。
 * 每个任务包含：目标、步骤、所需资源、验收标准、预计时间。
 *
 * 设计原则：
 *  · 任务必须可执行，不是空泛的"多练习"
 *  · 每个任务绑定知乎上的真实参考资料
 *  · 难度递进，从入门到进阶
 *  · 提供验收标准，用户可以自我评估
 */

const { matchScenario } = require('../data/scenarios');

/**
 * 生成实践任务列表
 * @param {string} topic 领域
 * @param {object} scenario 匹配的场景
 * @param {object} materials 资料收集官产出
 * @param {object} studyPlan 知识梳理官产出
 * @param {object} ctx 上下文 { live, emit }
 */
async function generatePractice(topic, scenario, materials, studyPlan, ctx = {}) {
  const emit = ctx.emit || (() => {});
  emit('practitioner', 'start', `实践官：正在为「${topic}」设计实践任务…`);

  // 从学习路径中提取阶段
  const stages = studyPlan?.stages || studyPlan?.timeline || [];
  const concepts = studyPlan?.concepts || [];

  // 从资料中提取高赞参考
  const references = (materials?.zhihuResults || materials?.results || [])
    .filter(r => r.title && (r.url || r.link))
    .slice(0, 10);

  // 场景内置实践任务
  const scenarioPractice = scenario?.practiceTasks || [];

  let tasks;
  if (scenarioPractice.length > 0) {
    tasks = scenarioPractice.map((t, i) => enrichTask(t, i, references));
  } else {
    tasks = generateGenericTasks(topic, stages, concepts, references);
  }

  emit('practitioner', 'done', `实践官：已生成 ${tasks.length} 个实践任务`);

  return {
    agent: 'practitioner',
    agentName: '实践官',
    emoji: '🛠️',
    topic,
    tasks,
    totalEstimatedHours: tasks.reduce((sum, t) => sum + (t.estimatedHours || 1), 0),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 丰富任务内容，绑定参考资料
 */
function enrichTask(task, index, references) {
  const ref = references[index % Math.max(references.length, 1)];
  return {
    id: `task_${index + 1}`,
    title: task.title || `实践任务 ${index + 1}`,
    description: task.description || '',
    difficulty: task.difficulty || ['入门', '进阶', '挑战'][Math.min(index, 2)],
    estimatedHours: task.estimatedHours || 1 + index * 0.5,
    steps: task.steps || generateSteps(task.title, index),
    resources: task.resources || (ref ? [{
      title: ref.title,
      url: ref.url || ref.link,
      author: ref.author || '知乎答主',
      type: '参考阅读',
    }] : []),
    acceptanceCriteria: task.acceptanceCriteria || generateAcceptanceCriteria(task.title, index),
    tips: task.tips || generateTips(index),
    completed: false,
  };
}

/**
 * 生成通用实践任务
 */
function generateGenericTasks(topic, stages, concepts, references) {
  const tasks = [];
  const taskTemplates = [
    {
      title: `「${topic}」入门实践：搭建你的第一个作品`,
      description: `从零开始，完成一个最小可用的 ${topic} 项目，验证你对核心概念的理解。`,
      difficulty: '入门',
      estimatedHours: 2,
    },
    {
      title: `「${topic}」进阶实践：解决一个真实问题`,
      description: `选择你在学习中遇到的真实问题，用 ${topic} 的方法给出完整解决方案。`,
      difficulty: '进阶',
      estimatedHours: 4,
    },
    {
      title: `「${topic}」挑战实践：输出你的经验总结`,
      description: `整理你的学习笔记和实践经验，形成一篇可分享的入门指南，帮助更多新人。`,
      difficulty: '挑战',
      estimatedHours: 3,
    },
  ];

  // 如果有阶段信息，为每个阶段生成任务
  if (stages.length > 0) {
    stages.slice(0, 4).forEach((stage, i) => {
      const stageTitle = stage.title || stage.name || `阶段 ${i + 1}`;
      tasks.push(enrichTask({
        title: `「${stageTitle}」实践练习`,
        description: `针对「${stageTitle}」阶段的核心知识点，完成配套实践练习，巩固学习效果。`,
        difficulty: ['入门', '入门', '进阶', '进阶'][i] || '进阶',
        estimatedHours: 1 + i * 0.5,
      }, i, references));
    });
  }

  // 补充通用任务
  taskTemplates.forEach((t, i) => {
    tasks.push(enrichTask(t, tasks.length + i, references));
  });

  return tasks.slice(0, 6);
}

function generateSteps(title, index) {
  const baseSteps = [
    '阅读参考资料，理解核心概念',
    '动手实践，完成最小可用版本',
    '遇到问题时回到知乎搜索解决方案',
    '整理笔记，记录踩坑经验',
  ];
  if (index >= 2) {
    baseSteps.push('将成果分享到知乎，获得社区反馈');
  }
  return baseSteps;
}

function generateAcceptanceCriteria(title, index) {
  return [
    '能够独立完成，不需要看教程',
    '代码/作品可以正常运行',
    '能够向他人解释每一步的原理',
    '整理了至少 3 条踩坑经验',
  ];
}

function generateTips(index) {
  const tips = [
    '不要追求完美，先完成再优化',
    '遇到问题先搜索知乎，90% 的问题都有人遇到过',
    '做好笔记，好记性不如烂笔头',
    '加入相关圈子，和同好交流进步更快',
  ];
  return tips[index % tips.length];
}

module.exports = { generatePractice };
