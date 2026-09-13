'use strict';

/**
 * 多 Agent 编排器
 *
 * 流水线：资料收集官 → 观点对照官 → 知识梳理官 → 实践官 → 答疑官，
 * 五个 Agent 顺序协作，通过「任务书」（materials 对象）传递中间产物，
 * 每个 Agent 独立负责一项职责，全程通过 emit 回调向前端推送进度事件（SSE）。
 *
 * 运行模式：
 *  · demo —— Access Secret 未配置：使用知乎知识内容接口（真实）+ 内置场景素材
 *  · live —— Access Secret 已配置：叠加知乎搜索、全网搜索、实时热榜、直答综述
 */

const zhihu = require('../lib/zhihuClient');
const { matchScenario } = require('../data/scenarios');
const collector = require('./collector');
const comparator = require('./comparator');
const curator = require('./curator');
const practitioner = require('./practitioner');

/**
 * 运行完整流水线。
 * @param {string} topic 用户想进入的领域
 * @param {object} hooks { emit(type, agentId, stage, message), includePractice }
 */
async function runPipeline(topic, { emit, includePractice = true } = {}) {
  const noop = () => {};
  const emitFn = typeof emit === 'function' ? emit : noop;

  const live = await zhihu.isLive();
  const ctx = {
    live,
    emit: (agent, stage, message) => emitFn('log', agent, stage, message),
  };
  const scenario = matchScenario(topic);
  const t0 = Date.now();

  emitFn('system', 'boot', 'start', `知遇小队集结完毕，开始为你引路「${topic}」`);
  emitFn('system', 'boot', 'info', live ? '已连接知乎开放平台（实时模式）' : '当前为演示模式：使用知乎知识内容接口与内置精选素材');

  const materials = await collector.collect(topic, scenario, ctx);
  const comparison = await comparator.compare(topic, scenario, materials, ctx);
  const studyPlan = await curator.build(topic, scenario, materials, ctx);

  // 实践官：生成实践任务（可选）
  let practice = null;
  if (includePractice) {
    try {
      practice = await practitioner.generatePractice(topic, scenario, materials, studyPlan, ctx);
    } catch (e) {
      // 实践官失败不影响主流程
      emitFn('system', 'practitioner', 'error', `实践官任务生成失败：${e.message}`);
    }
  }

  const result = {
    meta: {
      topic,
      scenarioId: scenario ? scenario.id : 'generic',
      scenarioName: scenario ? scenario.name : '通用新领域',
      live,
      elapsedMs: Date.now() - t0,
      generatedAt: new Date().toISOString(),
      agents: ['collector', 'comparator', 'curator', ...(practice ? ['practitioner'] : [])],
    },
    materials,
    comparison,
    studyPlan,
    ...(practice ? { practice } : {}),
  };

  emitFn('system', 'boot', 'done', `五份成果已就绪，祝你与新知相遇愉快 🦊`);
  return result;
}

module.exports = { runPipeline };
