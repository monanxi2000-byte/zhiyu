'use strict';

/**
 * 内容共创模块
 * 将学习路径、观点对照、复习卡片等成果，一键生成适合知乎发布的内容。
 *
 * 支持生成：
 *  · 入门指南文章
 *  · 学习经验分享
 *  · 观点整理长文
 *  · 复习卡片合集
 *
 * 设计原则：
 *  · 内容必须基于真实产出，不编造
 *  · 保留原作者引用和链接
 *  · 格式符合知乎社区风格
 *  · 用户可编辑后再发布
 */

/**
 * 生成知乎分享内容
 * @param {object} result 完整的引路结果
 * @param {string} format 格式：guide / experience / debate / cards
 */
function generateZhihuPost(result, format = 'guide') {
  const topic = result.meta?.topic || result.topic || '这个领域';
  const materials = result.materials || {};
  const comparison = result.comparison || {};
  const studyPlan = result.studyPlan || {};

  switch (format) {
    case 'guide':
      return generateGuide(topic, materials, studyPlan);
    case 'experience':
      return generateExperience(topic, studyPlan);
    case 'debate':
      return generateDebate(topic, comparison);
    case 'cards':
      return generateCards(topic, studyPlan);
    default:
      return generateGuide(topic, materials, studyPlan);
  }
}

/**
 * 生成入门指南
 */
function generateGuide(topic, materials, studyPlan) {
  const stages = studyPlan.stages || studyPlan.timeline || [];
  const concepts = studyPlan.concepts || [];
  const recommendations = studyPlan.zhihuTopPicks || studyPlan.recommendations || [];

  let body = `# ${topic}入门指南：从零开始的完整学习路径\n\n`;
  body += `> 本文由「知遇」AI 引路助手生成，基于知乎优质内容整理。\n\n`;

  body += `## 写在前面\n\n`;
  body += `很多人想进入「${topic}」领域，但面对海量信息不知道从何开始。这篇指南把知乎上散落的优质经验，整理成一条可执行的学习路径，帮你少走弯路。\n\n`;

  if (stages.length > 0) {
    body += `## 学习路径\n\n`;
    stages.forEach((stage, i) => {
      const title = stage.title || stage.name || `阶段 ${i + 1}`;
      const desc = stage.description || stage.desc || '';
      const duration = stage.duration || stage.estimatedTime || '';
      body += `### 阶段 ${i + 1}：${title}${duration ? `（${duration}）` : ''}\n\n`;
      body += `${desc}\n\n`;
      if (stage.resources && stage.resources.length > 0) {
        body += `**推荐资源：**\n`;
        stage.resources.slice(0, 3).forEach(r => {
          body += `- [${r.title}](${r.url})（${r.author || '知乎答主'}）\n`;
        });
        body += `\n`;
      }
    });
  }

  if (concepts.length > 0) {
    body += `## 核心概念\n\n`;
    concepts.slice(0, 8).forEach((c, i) => {
      const name = c.name || c.concept || c.title || '';
      const desc = c.description || c.explanation || c.desc || '';
      body += `**${i + 1}. ${name}**\n\n${desc}\n\n`;
    });
  }

  if (recommendations.length > 0) {
    body += `## 知乎优质推荐\n\n`;
    recommendations.slice(0, 5).forEach(r => {
      body += `- [${r.title}](${r.url}) — ${r.author || ''}（${r.upvotes || r.voteCount || 0} 赞）\n`;
    });
    body += `\n`;
  }

  body += `## 写在最后\n\n`;
  body += `学习没有捷径，但有方法。希望这篇指南能帮你在「${topic}」的路上走得更顺。如果觉得有用，欢迎点赞收藏，也欢迎在评论区交流你的学习经验。\n\n`;
  body += `---\n\n`;
  body += `*本文由「知遇」AI 引路助手生成，内容基于知乎公开内容整理，如有侵权请联系删除。*`;

  return {
    format: 'guide',
    title: `${topic}入门指南：从零开始的完整学习路径`,
    body,
    tags: generateTags(topic),
    estimatedReadTime: Math.ceil(body.length / 500),
  };
}

/**
 * 生成学习经验分享
 */
function generateExperience(topic, studyPlan) {
  const stages = studyPlan.stages || studyPlan.timeline || [];

  let body = `# 我是如何入门${topic}的：一份真实的学习经验分享\n\n`;
  body += `> 本文由「知遇」AI 引路助手生成模板，可根据你的真实经历修改。\n\n`;

  body += `## 为什么学${topic}\n\n`;
  body += `（这里写你为什么想进入这个领域，是工作需要、兴趣驱动，还是其他原因。）\n\n`;

  body += `## 我踩过的坑\n\n`;
  body += `1. 一开始贪多求快，什么都想学，结果什么都没学精\n`;
  body += `2. 只收藏不实践，收藏夹吃灰\n`;
  body += `3. 遇到问题就放弃，没有坚持下来\n\n`;

  if (stages.length > 0) {
    body += `## 我的学习路径\n\n`;
    stages.forEach((stage, i) => {
      const title = stage.title || stage.name || `阶段 ${i + 1}`;
      body += `### ${i + 1}. ${title}\n\n`;
      body += `（这里写你在这个阶段做了什么，用了什么资源，花了多长时间，有什么收获。）\n\n`;
    });
  }

  body += `## 给新人的建议\n\n`;
  body += `1. **先完成再完美**：不要等准备好才开始，边做边学\n`;
  body += `2. **建立反馈循环**：学完就用，用错就改\n`;
  body += `3. **加入社区**：和同好交流，比一个人闷头学快得多\n`;
  body += `4. **做好笔记**：好记性不如烂笔头，整理笔记的过程就是深度学习\n\n`;

  body += `## 写在最后\n\n`;
  body += `学习是一场马拉松，不是百米冲刺。希望我的经验能帮到你。有问题欢迎评论区交流。\n\n`;
  body += `---\n\n`;
  body += `*本文由「知遇」AI 引路助手生成模板。*`;

  return {
    format: 'experience',
    title: `我是如何入门${topic}的：一份真实的学习经验分享`,
    body,
    tags: generateTags(topic),
    estimatedReadTime: Math.ceil(body.length / 500),
  };
}

/**
 * 生成观点整理长文
 */
function generateDebate(topic, comparison) {
  const views = comparison.views || comparison.debates || [];
  const summary = comparison.summary || comparison.consensus || '';

  let body = `# ${topic}领域的核心争议：知乎答主们都怎么看？\n\n`;
  body += `> 本文由「知遇」AI 引路助手生成，整理自知乎高赞回答。\n\n`;

  body += `## 背景\n\n`;
  body += `在「${topic}」领域，新人最困惑的往往不是"学什么"，而是"听谁的"。知乎上有很多高赞回答，但观点常常互相矛盾。这篇文章把这些观点整理在一起，帮你看清分歧在哪里，共识又在哪里。\n\n`;

  if (summary) {
    body += `## 核心共识\n\n`;
    body += `${summary}\n\n`;
  }

  if (views.length > 0) {
    body += `## 主要观点对比\n\n`;
    views.forEach((v, i) => {
      const stance = v.stance || v.position || `观点 ${i + 1}`;
      const content = v.content || v.argument || v.summary || '';
      const source = v.source || v.author || '';
      const url = v.url || v.link || '';
      body += `### 观点 ${i + 1}：${stance}\n\n`;
      body += `${content}\n\n`;
      if (source) {
        body += `*来源：[${source}](${url || '#'})*\n\n`;
      }
    });
  }

  body += `## 我的看法\n\n`;
  body += `（这里写你自己的判断和选择，没有绝对的对错，适合自己的才是最好的。）\n\n`;

  body += `## 写在最后\n\n`;
  body += `观点没有对错，只有适合不适合。希望这篇整理能帮你形成自己的判断。欢迎在评论区说说你的看法。\n\n`;
  body += `---\n\n`;
  body += `*本文由「知遇」AI 引路助手生成，内容基于知乎公开内容整理。*`;

  return {
    format: 'debate',
    title: `${topic}领域的核心争议：知乎答主们都怎么看？`,
    body,
    tags: generateTags(topic),
    estimatedReadTime: Math.ceil(body.length / 500),
  };
}

/**
 * 生成复习卡片合集
 */
function generateCards(topic, studyPlan) {
  const cards = studyPlan.reviewCards || studyPlan.cards || [];

  let body = `# ${topic}复习卡片合集：${cards.length} 个核心知识点\n\n`;
  body += `> 本文由「知遇」AI 引路助手生成，建议收藏后反复复习。\n\n`;

  if (cards.length > 0) {
    cards.forEach((card, i) => {
      const front = card.front || card.question || card.concept || `知识点 ${i + 1}`;
      const back = card.back || card.answer || card.explanation || '';
      body += `## ${i + 1}. ${front}\n\n`;
      body += `${back}\n\n`;
      body += `---\n\n`;
    });
  }

  body += `## 复习建议\n\n`;
  body += `1. **间隔重复**：第 1 天、第 3 天、第 7 天、第 14 天、第 30 天各复习一次\n`;
  body += `2. **主动回忆**：先看问题，尝试自己回答，再看答案\n`;
  body += `3. **标记难点**：不熟悉的卡片标记出来，重点复习\n\n`;

  body += `---\n\n`;
  body += `*本文由「知遇」AI 引路助手生成。*`;

  return {
    format: 'cards',
    title: `${topic}复习卡片合集：${cards.length} 个核心知识点`,
    body,
    tags: generateTags(topic),
    estimatedReadTime: Math.ceil(body.length / 500),
  };
}

/**
 * 生成标签
 */
function generateTags(topic) {
  return [
    topic,
    `${topic}入门`,
    '学习方法',
    '知识整理',
    '知乎好物推荐',
  ];
}

module.exports = {
  generateZhihuPost,
  generateGuide,
  generateExperience,
  generateDebate,
  generateCards,
};
