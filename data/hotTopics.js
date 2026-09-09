'use strict';

/**
 * 演示模式热榜数据。
 * Access Secret 配置后，热榜自动切换为知乎实时热榜接口（15 分钟缓存）。
 * 演示数据仅用于未配置凭证时保证流程可跑通，并在界面明确标注。
 */

const DEMO_HOT = [
  { rank: 1, title: '考研还剩一百天，数学还在基础阶段还有救吗？', heat: '1.2亿 热度', type: '考研', tag: '演示' },
  { rank: 2, title: '零基础转行数据分析，简历上应该放什么项目？', heat: '9800万 热度', type: '职业', tag: '演示' },
  { rank: 3, title: '工作三年想转程序员，还来得及吗？', heat: '8600万 热度', type: '职业', tag: '演示' },
  { rank: 4, title: '为什么说「费曼学习法」是最被低估的学习方法？', heat: '7300万 热度', type: '学习', tag: '演示' },
  { rank: 5, title: '新人做自媒体三个月没涨粉，问题出在哪？', heat: '6900万 热度', type: '自媒体', tag: '演示' },
  { rank: 6, title: '如何提高上班后的专注力？', heat: '5400万 热度', type: '职场', tag: '演示' },
  { rank: 7, title: '填报志愿：选学校还是选专业？', heat: '4600万 热度', type: '高考', tag: '演示' },
  { rank: 8, title: '产品经理入门应该先学什么？', heat: '3800万 热度', type: '职业', tag: '演示' },
];

module.exports = { DEMO_HOT };
