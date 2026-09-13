'use strict';

/**
 * 内容共创模块（优化版）
 * 将学习路径、观点对照、复习卡片等成果，一键生成适合知乎发布的内容。
 *
 * 支持生成：
 *  · 入门指南文章
 *  · 学习经验分享
 *  · 观点整理长文
 *  · 复习卡片合集
 *
 * 优化点：
 *  · 更吸引人的标题（数字+痛点+解决方案）
 *  · 更丰富的开头（场景化引入+痛点共鸣）
 *  · 更清晰的章节结构（每章有引言+要点+小结）
 *  · 更多格式元素（引用框、提示框、表格、列表）
 *  · 更实用的结尾（行动清单+互动引导）
 *  · 更精准的标签推荐
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
 * 生成入门指南（优化版）
 */
function generateGuide(topic, materials, studyPlan) {
  const stages = studyPlan.stages || studyPlan.timeline || [];
  const concepts = studyPlan.concepts || [];
  const recommendations = studyPlan.zhihuTopPicks || studyPlan.recommendations || [];
  const timePlan = studyPlan.timePlan || '';
  const hotTopics = materials.hotTopics || [];

  // 吸引人的标题：数字+痛点+解决方案
  const stageCount = stages.length || 5;
  const conceptCount = concepts.length || 10;
  const titles = [
    `${topic}入门全攻略：${stageCount}个阶段+${conceptCount}个核心概念，新手也能快速上手`,
    `从零开始学${topic}：我整理了这份超详细的学习路径（建议收藏）`,
    `${topic}新手必看：避坑指南+学习资源+时间规划，一篇文章讲透`,
    `想入门${topic}？这份保姆级学习路径请收好（附${recommendations.length}个优质资源）`,
  ];
  const title = titles[Math.floor(Math.random() * titles.length)];

  let body = '';

  // 开头：场景化引入+痛点共鸣
  body += `> 本文由「知遇」AI 引路助手生成，基于知乎优质内容整理，建议先点赞收藏再看。\n\n`;

  body += `## 写在前面\n\n`;
  body += `你是不是也有这样的困惑：\n\n`;
  body += `- 想入门「${topic}」，但网上信息太杂，不知道从哪开始？\n`;
  body += `- 收藏了一堆教程，却从来没有完整看完过？\n`;
  body += `- 学了一段时间，感觉什么都懂一点，但又什么都不精？\n\n`;
  body += `如果你有以上任何一个问题，这篇文章就是为你写的。\n\n`;
  body += `我花了大量时间，把知乎上关于「${topic}」的优质回答、高赞经验、学习资源整理成了一条**可执行的学习路径**。\n\n`;
  body += `没有废话，全是干货。建议先点赞收藏，慢慢看。\n\n`;

  body += `---\n\n`;

  // 整体规划
  if (timePlan) {
    body += `## 📅 整体学习规划\n\n`;
    body += `> ${timePlan}\n\n`;
    body += `---\n\n`;
  }

  // 学习路径（每个阶段详细展开）
  if (stages.length > 0) {
    body += `## 🗺️ 分阶段学习路径\n\n`;
    body += `整个学习过程分为 ${stages.length} 个阶段，每个阶段都有明确的目标、学习内容和推荐资源。\n\n`;

    stages.forEach((stage, i) => {
      const stageTitle = stage.title || stage.name || `阶段 ${i + 1}`;
      const desc = stage.description || stage.desc || '';
      const duration = stage.duration || stage.estimatedTime || '';
      const goal = stage.goal || stage.objective || '';
      const actions = stage.actions || stage.steps || [];
      const pitfalls = stage.pitfalls || stage.commonMistakes || [];
      const milestones = stage.milestones || [];
      const resources = stage.resources || [];

      body += `### 阶段 ${i + 1}：${stageTitle}${duration ? `（${duration}）` : ''}\n\n`;

      // 阶段目标
      if (goal) {
        body += `**🎯 阶段目标：** ${goal}\n\n`;
      }

      // 阶段描述
      if (desc) {
        body += `${desc}\n\n`;
      }

      // 学习内容/行动步骤
      if (actions.length > 0) {
        body += `**📚 学习内容：**\n\n`;
        actions.forEach((action, idx) => {
          const actionText = typeof action === 'string' ? action : (action.text || action.title || action.description || '');
          if (actionText) {
            body += `${idx + 1}. ${actionText}\n`;
          }
        });
        body += `\n`;
      }

      // 避坑指南
      if (pitfalls.length > 0) {
        body += `**⚠️ 避坑指南：**\n\n`;
        pitfalls.forEach((pitfall) => {
          const text = typeof pitfall === 'string' ? pitfall : (pitfall.text || pitfall.description || '');
          if (text) {
            body += `- ❌ ${text}\n`;
          }
        });
        body += `\n`;
      }

      // 里程碑
      if (milestones.length > 0) {
        body += `**🏆 里程碑：**\n\n`;
        milestones.forEach((milestone) => {
          const text = typeof milestone === 'string' ? milestone : (milestone.text || milestone.description || '');
          if (text) {
            body += `- ✅ ${text}\n`;
          }
        });
        body += `\n`;
      }

      // 推荐资源
      if (resources.length > 0) {
        body += `**🔗 推荐资源：**\n\n`;
        resources.slice(0, 5).forEach((r) => {
          const rTitle = r.title || r.name || '';
          const rUrl = r.url || r.link || '';
          const rAuthor = r.author || r.source || '知乎答主';
          const rType = r.type || r.category || '';
          if (rTitle && rUrl) {
            body += `- [${rTitle}](${rUrl})（${rAuthor}${rType ? ` · ${rType}` : ''}）\n`;
          } else if (rTitle) {
            body += `- ${rTitle}（${rAuthor}）\n`;
          }
        });
        body += `\n`;
      }

      // 阶段小结
      body += `> 💡 **阶段小结：** 完成这个阶段后，你应该能够独立完成基础任务，对「${stageTitle}」有清晰的认识。\n\n`;

      // 分割线和来源
      body += `-----------\n`;
      body += `**来源：** 知乎优质内容整理 · 知遇 AI 引路助手\n\n`;

      if (i < stages.length - 1) {
        body += `---\n\n`;
      }
    });

    body += `---\n\n`;
  }

  // 核心概念（每个概念单独显示，带分割线和来源）
  if (concepts.length > 0) {
    body += `## 💡 必须掌握的 ${concepts.length} 个核心概念\n\n`;
    body += `这些概念是「${topic}」的基石，建议反复理解和记忆。\n\n`;

    concepts.slice(0, 15).forEach((c, i) => {
      const name = c.name || c.concept || c.title || '';
      const desc = c.description || c.explanation || c.desc || '';
      const example = c.example || c.case || '';
      const source = c.source || c.author || c.from || '知遇整理';

      body += `### ${i + 1}. ${name}\n\n`;
      body += `${desc}\n\n`;
      if (example) {
        body += `**📌 例子：** ${example}\n\n`;
      }
      body += `-----------\n`;
      body += `**来源：** ${source}\n\n`;
    });

    if (concepts.length > 15) {
      body += `> 还有 ${concepts.length - 15} 个概念，建议在学习过程中逐步理解。\n\n`;
    }

    body += `---\n\n`;
  }

  // 知乎优质推荐
  if (recommendations.length > 0) {
    body += `## 📚 知乎优质推荐（必看）\n\n`;
    body += `以下是知乎上关于「${topic}」的高赞回答，建议按顺序阅读：\n\n`;

    recommendations.slice(0, 8).forEach((r, i) => {
      const rTitle = r.title || r.name || '';
      const rUrl = r.url || r.link || '';
      const rAuthor = r.author || r.source || '';
      const rUpvotes = r.upvotes || r.voteCount || r.likes || 0;
      const rExcerpt = r.excerpt || r.summary || r.description || '';

      body += `### ${i + 1}. [${rTitle}](${rUrl})\n\n`;
      body += `**作者：** ${rAuthor} | **点赞：** ${rUpvotes}\n\n`;
      if (rExcerpt) {
        body += `> ${rExcerpt.substring(0, 150)}...\n\n`;
      }
      body += `-----------\n`;
      body += `**来源：** 知乎 · [${rAuthor}](${rUrl})\n\n`;
    });

    body += `---\n\n`;
  }

  // 热门话题
  if (hotTopics.length > 0) {
    body += `## 🔥 近期热门话题\n\n`;
    body += `关注这些话题，可以了解「${topic}」领域的最新动态：\n\n`;
    hotTopics.slice(0, 5).forEach((hot) => {
      const hTitle = hot.title || hot.name || '';
      const hUrl = hot.url || hot.link || '';
      const hHeat = hot.heat || hot.views || hot.count || '';
      if (hTitle && hUrl) {
        body += `- [${hTitle}](${hUrl})${hHeat ? `（${hHeat}热度）` : ''}\n`;
      } else if (hTitle) {
        body += `- ${hTitle}\n`;
      }
    });
    body += `\n---\n\n`;
  }

  // 结尾：行动清单+互动引导
  body += `## ✅ 写在最后\n\n`;
  body += `### 行动清单\n\n`;
  body += `看完这篇文章，建议你立刻做这几件事：\n\n`;
  body += `1. **点赞收藏**这篇文章，方便以后随时查看\n`;
  body += `2. **制定学习计划**，按照上面的阶段开始学习\n`;
  body += `3. **加入相关圈子**，和同好一起交流进步\n`;
  body += `4. **做好笔记**，把学到的知识整理成自己的东西\n`;
  body += `5. **定期复习**，用间隔重复法巩固记忆\n\n`;

  body += `### 互动时间\n\n`;
  body += `你在学习「${topic}」的过程中遇到过什么困难？有什么好的学习方法推荐？欢迎在评论区交流！\n\n`;

  body += `如果这篇文章对你有帮助，别忘了**点赞+收藏+关注**，后续会更新更多「${topic}」相关的干货内容。\n\n`;

  body += `---\n\n`;
  body += `*本文由「知遇」AI 引路助手生成，内容基于知乎公开内容整理，如有侵权请联系删除。*\n`;
  body += `*知遇 —— 基于知乎知识生态的 AI 新人引路助手，帮你快速进入任何新领域。*`;

  // 标签推荐
  const tags = generateTags(topic, 'guide');

  return {
    format: 'guide',
    title,
    body,
    tags,
    estimatedReadTime: Math.ceil(body.length / 500),
  };
}

/**
 * 生成学习经验分享（优化版）
 */
function generateExperience(topic, studyPlan) {
  const stages = studyPlan.stages || studyPlan.timeline || [];
  const concepts = studyPlan.concepts || [];

  // 吸引人的标题
  const titles = [
    `我是如何从零开始学${topic}的：一份真实的学习经验分享（附时间线）`,
    `${topic}学习半年，我总结了这些血泪教训和实用方法`,
    `从入门到上手：我的${topic}学习之路（建议新手收藏）`,
    `学${topic}踩过的坑、走过的弯路，都在这篇文章里了`,
  ];
  const title = titles[Math.floor(Math.random() * titles.length)];

  let body = '';

  body += `> 本文由「知遇」AI 引路助手生成模板，可根据你的真实经历修改。\n\n`;

  // 开头：为什么学
  body += `## 一、为什么学${topic}？\n\n`;
  body += `（这里写你为什么想进入这个领域，是工作需要、兴趣驱动，还是其他原因。越真实越能引起共鸣。）\n\n`;
  body += `举个例子：\n\n`;
  body += `> 去年这个时候，我还是一个对「${topic}」一无所知的小白。因为工作需要（或者：因为兴趣/因为想转行），我开始了「${topic}」的学习之路。\n>\n> 这一年里，我踩过很多坑，走过很多弯路，也总结了一些实用的方法。今天把这些经验分享出来，希望能帮到正在入门的你。\n\n`;

  body += `---\n\n`;

  // 踩过的坑
  body += `## 二、我踩过的那些坑\n\n`;
  body += `先说教训，再说方法。这些坑希望你能避开：\n\n`;
  body += `### 坑1：贪多求快，什么都想学\n\n`;
  body += `刚入门的时候，我收藏了几十篇教程，买了好几本书，结果每本都只看了开头就放弃了。\n\n`;
  body += `**教训：** 学习要聚焦，先把一个方向学透，再扩展其他方向。\n\n`;

  body += `### 坑2：只收藏不实践\n\n`;
  body += `我的收藏夹里躺着上百篇「干货」，但真正动手实践的不到10%。\n\n`;
  body += `**教训：** 看10篇教程不如动手做1个项目。实践是最好的老师。\n\n`;

  body += `### 坑3：遇到问题就放弃\n\n`;
  body += `刚开始学习的时候，遇到一个bug可能会卡一整天，然后就不想学了。\n\n`;
  body += `**教训：** 遇到问题很正常，学会搜索和提问是每个学习者的必备技能。\n\n`;

  body += `> 💡 **你的坑：** （这里写你自己踩过的坑，越具体越好）\n\n`;

  body += `---\n\n`;

  // 学习路径
  if (stages.length > 0) {
    body += `## 三、我的学习路径\n\n`;
    body += `如果让我重新学一遍，我会按照这个路径来：\n\n`;

    stages.forEach((stage, i) => {
      const stageTitle = stage.title || stage.name || `阶段 ${i + 1}`;
      const desc = stage.description || stage.desc || '';
      const duration = stage.duration || stage.estimatedTime || '';

      body += `### 阶段${i + 1}：${stageTitle}${duration ? `（${duration}）` : ''}\n\n`;
      body += `${desc}\n\n`;
      body += `**我做了什么：** （这里写你在这个阶段具体做了什么，用了什么资源，花了多长时间）\n\n`;
      body += `**我的收获：** （这里写你在这个阶段学到了什么，有什么感悟）\n\n`;
    });

    body += `---\n\n`;
  }

  // 核心概念
  if (concepts.length > 0) {
    body += `## 四、必须搞懂的核心概念\n\n`;
    body += `这些概念是「${topic}」的基础，建议反复理解：\n\n`;
    concepts.slice(0, 5).forEach((c, i) => {
      const name = c.name || c.concept || c.title || '';
      const desc = c.description || c.explanation || c.desc || '';
      body += `**${i + 1}. ${name}**\n\n${desc}\n\n`;
    });
    body += `---\n\n`;
  }

  // 给新人的建议
  body += `## 五、给新人的5条建议\n\n`;
  body += `### 1. 先完成再完美\n\n`;
  body += `不要等"准备好"才开始，边做边学，在实践中完善。第一个作品不需要完美，能跑起来就是胜利。\n\n`;

  body += `### 2. 建立反馈循环\n\n`;
  body += `学完就用，用错就改。每学一个知识点，立刻找一个小项目实践，这样才能真正掌握。\n\n`;

  body += `### 3. 加入社区\n\n`;
  body += `一个人学习容易放弃，加入相关的圈子和社群，和同好交流，比一个人闷头学快得多。\n\n`;

  body += `### 4. 做好笔记\n\n`;
  body += `好记性不如烂笔头。整理笔记的过程就是深度学习的过程。建议用思维导图或者卡片笔记法。\n\n`;

  body += `### 5. 保持耐心\n\n`;
  body += `学习是一场马拉松，不是百米冲刺。不要因为短期内看不到效果就放弃，坚持下去，时间会给你答案。\n\n`;

  body += `---\n\n`;

  // 结尾
  body += `## 六、写在最后\n\n`;
  body += `学习「${topic}」的过程，也是一个不断认识自己的过程。你会发现自己的优势和短板，也会找到适合自己的学习方法。\n\n`;
  body += `希望我的经验能帮到你。如果有任何问题，欢迎在评论区交流，我会尽力解答。\n\n`;
  body += `如果这篇文章对你有帮助，别忘了**点赞+收藏+关注**，后续会更新更多「${topic}」相关的内容。\n\n`;

  body += `---\n\n`;
  body += `*本文由「知遇」AI 引路助手生成模板，内容仅供参考，请根据你的真实经历修改。*\n`;
  body += `*知遇 —— 基于知乎知识生态的 AI 新人引路助手。*`;

  const tags = generateTags(topic, 'experience');

  return {
    format: 'experience',
    title,
    body,
    tags,
    estimatedReadTime: Math.ceil(body.length / 500),
  };
}

/**
 * 生成观点整理长文（优化版）
 */
function generateDebate(topic, comparison) {
  const views = comparison.views || comparison.debates || [];
  const summary = comparison.summary || comparison.consensus || '';
  const aiSummary = comparison.aiSummary || comparison.overview || '';

  const titles = [
    `${topic}领域的核心争议：知乎答主们都怎么看？（一文讲透）`,
    `关于${topic}，知乎上吵翻了天，到底谁说得对？`,
    `${topic}入门必看：这些争议你必须知道，避免走弯路`,
    `整理了知乎上关于${topic}的10个争议，第3个最有启发`,
  ];
  const title = titles[Math.floor(Math.random() * titles.length)];

  let body = '';

  body += `> 本文由「知遇」AI 引路助手生成，整理自知乎高赞回答。\n\n`;

  // 开头
  body += `## 写在前面\n\n`;
  body += `在「${topic}」领域，新人最困惑的往往不是"学什么"，而是"听谁的"。\n\n`;
  body += `知乎上有很多高赞回答，但观点常常互相矛盾。有人说A好，有人说B棒，到底该信谁？\n\n`;
  body += `这篇文章把这些争议整理在一起，**不站队，只摆事实**，帮你看清分歧在哪里，共识又在哪里，然后做出自己的判断。\n\n`;

  body += `---\n\n`;

  // AI综述
  if (aiSummary) {
    body += `## 📊 整体概览\n\n`;
    body += `> ${aiSummary}\n\n`;
    body += `---\n\n`;
  }

  // 核心共识
  if (summary) {
    body += `## ✅ 核心共识（大家都认同的）\n\n`;
    body += `虽然争议很多，但在这些点上，大多数答主是认同的：\n\n`;
    body += `> ${summary}\n\n`;
    body += `---\n\n`;
  }

  // 主要观点对比
  if (views.length > 0) {
    body += `## ⚔️ 主要争议点\n\n`;
    body += `以下是知乎上讨论最多的 ${views.length} 个争议，每个争议都列出了不同立场的观点和代表回答。\n\n`;

    views.forEach((view, i) => {
      const question = view.question || view.topic || `争议 ${i + 1}`;
      const stanceA = view.stanceA || view.viewA || view.sideA || {};
      const stanceB = view.stanceB || view.viewB || view.sideB || {};
      const content = view.content || view.argument || view.summary || '';
      const source = view.source || view.author || '';
      const url = view.url || view.link || '';

      body += `### 争议${i + 1}：${question}\n\n`;

      // 观点A
      if (stanceA.title || stanceA.content || stanceA.argument) {
        body += `**🔵 观点A：${stanceA.title || stanceA.stance || '支持'}\n\n`;
        body += `${stanceA.content || stanceA.argument || stanceA.summary || ''}\n\n`;
        if (stanceA.author || stanceA.source) {
          body += `*代表：${stanceA.author || stanceA.source}*\n\n`;
        }
      }

      // 观点B
      if (stanceB.title || stanceB.content || stanceB.argument) {
        body += `**🔴 观点B：${stanceB.title || stanceB.stance || '反对'}\n\n`;
        body += `${stanceB.content || stanceB.argument || stanceB.summary || ''}\n\n`;
        if (stanceB.author || stanceB.source) {
          body += `*代表：${stanceB.author || stanceB.source}*\n\n`;
        }
      }

      // 如果没有分AB，直接显示内容
      if (!stanceA.title && !stanceB.title && content) {
        body += `${content}\n\n`;
        if (source && url) {
          body += `*来源：[${source}](${url})*\n\n`;
        } else if (source) {
          body += `*来源：${source}*\n\n`;
        }
      }

      // 我的看法（引导）
      body += `> 🤔 **你怎么看？** 欢迎在评论区说说你的观点和理由。\n\n`;

      // 分割线和来源
      body += `-----------\n`;
      body += `**来源：** 知乎 · ${source || '知遇整理'}${url ? `（[原文链接](${url})）` : ''}\n\n`;

      if (i < views.length - 1) {
        body += `---\n\n`;
      }
    });

    body += `---\n\n`;
  }

  // 如何判断
  body += `## 🧠 如何判断谁说得对？\n\n`;
  body += `面对这么多争议，新人该如何判断？分享几个我的方法：\n\n`;
  body += `### 1. 看论据，不看立场\n\n`;
  body += `不要因为一个观点"听起来有道理"就相信，要看它有没有扎实的论据和数据支撑。\n\n`;

  body += `### 2. 看作者背景\n\n`;
  body += `了解作者的专业背景和实践经验，行业内人士的观点通常更有参考价值。\n\n`;

  body += `### 3. 看适用场景\n\n`;
  body += `很多争议没有绝对的对错，只是适用场景不同。搞清楚每个观点的前提条件，再判断是否适合自己。\n\n`;

  body += `### 4. 小范围验证\n\n`;
  body += `对于不确定的观点，可以在小范围内实践验证，用结果说话，而不是停留在理论争论。\n\n`;

  body += `---\n\n`;

  // 结尾
  body += `## 写在最后\n\n`;
  body += `观点没有绝对的对错，只有适合不适合。\n\n`;
  body += `希望这篇整理能帮你形成自己的判断，而不是人云亦云。如果你有不同的看法，欢迎在评论区理性讨论。\n\n`;
  body += `如果这篇文章对你有帮助，别忘了**点赞+收藏+关注**，后续会更新更多「${topic}」相关的争议整理。\n\n`;

  body += `---\n\n`;
  body += `*本文由「知遇」AI 引路助手生成，内容基于知乎公开内容整理，如有侵权请联系删除。*\n`;
  body += `*知遇 —— 基于知乎知识生态的 AI 新人引路助手。*`;

  const tags = generateTags(topic, 'debate');

  return {
    format: 'debate',
    title,
    body,
    tags,
    estimatedReadTime: Math.ceil(body.length / 500),
  };
}

/**
 * 生成复习卡片合集（优化版）
 */
function generateCards(topic, studyPlan) {
  const cards = studyPlan.reviewCards || studyPlan.cards || studyPlan.flashcards || [];
  const concepts = studyPlan.concepts || [];

  // 如果没有卡片，从概念生成
  let allCards = cards;
  if (allCards.length === 0 && concepts.length > 0) {
    allCards = concepts.map((c) => ({
      front: c.name || c.concept || c.title || '',
      back: c.description || c.explanation || c.desc || '',
      source: '核心概念',
    }));
  }

  const titles = [
    `${topic}复习卡片合集：${allCards.length}个核心知识点，建议收藏反复看`,
    `花了一周整理的${topic}知识点卡片，背完这些你就入门了`,
    `${topic}面试/考试必背：${allCards.length}个核心概念卡片（建议打印）`,
    `把${topic}的知识点做成了卡片，每天背5个，一个月就精通了`,
  ];
  const title = titles[Math.floor(Math.random() * titles.length)];

  let body = '';

  body += `> 本文由「知遇」AI 引路助手生成，建议收藏后反复复习。\n\n`;

  // 开头
  body += `## 写在前面\n\n`;
  body += `很多人学「${topic}」的时候，都会遇到这样的问题：\n\n`;
  body += `- 学了就忘，记不住核心概念\n`;
  body += `- 概念太多，不知道哪些是重点\n`;
  body += `- 复习没有方法，效率很低\n\n`;
  body += `为了解决这些问题，我把「${topic}」的核心知识点整理成了 **${allCards.length} 张复习卡片**。\n\n`;
  body += `每张卡片都包含**问题（正面）**和**答案（背面）**，方便你用主动回忆法复习。\n\n`;
  body += `建议收藏这篇文章，按照下面的复习方法，每天花15分钟，一个月就能全部掌握。\n\n`;

  body += `---\n\n`;

  // 复习方法
  body += `## 📖 如何使用这些卡片？\n\n`;
  body += `### 方法1：主动回忆法\n\n`;
  body += `1. 看卡片正面的问题，尝试自己回答\n`;
  body += `2. 回答完后，看背面的答案，对比自己的回答\n`;
  body += `3. 答错的卡片标记出来，重点复习\n\n`;

  body += `### 方法2：间隔重复法\n\n`;
  body += `按照这个时间表复习，记忆效果最好：\n\n`;
  body += `- 第1天：全部学习一遍\n`;
  body += `- 第3天：复习第1天的内容\n`;
  body += `- 第7天：复习前3天的内容\n`;
  body += `- 第14天：复习前7天的内容\n`;
  body += `- 第30天：全部复习一遍\n\n`;

  body += `### 方法3：费曼学习法\n\n`;
  body += `学完一个概念后，尝试用自己的话把它讲给别人听（或者讲给空气听）。如果讲不清楚，说明你还没有真正理解。\n\n`;

  body += `---\n\n`;

  // 卡片分类（如果有分类）
  const categories = [...new Set(allCards.map((c) => c.category || c.type || c.source || '未分类'))];

  if (categories.length > 1) {
    body += `## 🗂️ 卡片分类\n\n`;
    categories.forEach((cat, i) => {
      const count = allCards.filter((c) => (c.category || c.type || c.source || '未分类') === cat).length;
      body += `${i + 1}. **${cat}**：${count}张\n`;
    });
    body += `\n---\n\n`;
  }

  // 卡片内容
  body += `## 🎴 复习卡片合集\n\n`;

  // 按分类显示
  if (categories.length > 1) {
    categories.forEach((cat) => {
      const catCards = allCards.filter((c) => (c.category || c.type || c.source || '未分类') === cat);
      if (catCards.length === 0) return;

      body += `### ${cat}（${catCards.length}张）\n\n`;

      catCards.forEach((card, idx) => {
        const front = card.front || card.question || card.concept || card.title || `知识点 ${idx + 1}`;
        const back = card.back || card.answer || card.explanation || card.description || '';
        const source = card.source || card.author || '知遇整理';

        body += `#### 卡片 ${idx + 1}：${front}\n\n`;
        body += `${back}\n\n`;
        body += `-----------\n`;
        body += `**来源：** ${source}\n\n`;
      });

      body += `---\n\n`;
    });
  } else {
    // 不分类，直接显示
    allCards.forEach((card, idx) => {
      const front = card.front || card.question || card.concept || card.title || `知识点 ${idx + 1}`;
      const back = card.back || card.answer || card.explanation || card.description || '';
      const source = card.source || card.author || '知遇整理';

      body += `### 卡片 ${idx + 1}：${front}\n\n`;
      body += `${back}\n\n`;
      body += `-----------\n`;
      body += `**来源：** ${source}\n\n`;

      if ((idx + 1) % 10 === 0 && idx < allCards.length - 1) {
        body += `---\n\n`;
        body += `> 💡 已经看了 ${idx + 1} 张了，休息一下，喝口水继续！\n\n`;
        body += `---\n\n`;
      }
    });
  }

  // 结尾
  body += `## ✅ 写在最后\n\n`;
  body += `### 复习检查清单\n\n`;
  body += `学完这些卡片后，问问自己：\n\n`;
  body += `- [ ] 我能不看答案，独立回答 ${allCards.length} 个问题吗？\n`;
  body += `- [ ] 我能用自己的话解释每个概念吗？\n`;
  body += `- [ ] 我能举出每个概念的实际例子吗？\n`;
  body += `- [ ] 我能区分容易混淆的概念吗？\n\n`;

  body += `如果以上都能做到，恭喜你，你已经掌握了「${topic}」的核心知识！\n\n`;

  body += `### 下一步\n\n`;
  body += `掌握了核心概念后，建议你：\n\n`;
  body += `1. **找一个小项目实践**，把学到的知识用起来\n`;
  body += `2. **加入相关社区**，和同好交流，发现自己的知识盲区\n`;
  body += `3. **定期复习**，用间隔重复法巩固记忆\n`;
  body += `4. **输出分享**，把学到的知识整理成文章，教给别人（最好的学习方式就是教）\n\n`;

  body += `如果这篇文章对你有帮助，别忘了**点赞+收藏+关注**，后续会更新更多「${topic}」相关的学习资料。\n\n`;

  body += `有任何问题，欢迎在评论区交流，我会尽力解答！\n\n`;

  body += `---\n\n`;
  body += `*本文由「知遇」AI 引路助手生成，内容基于知乎公开内容整理，如有侵权请联系删除。*\n`;
  body += `*知遇 —— 基于知乎知识生态的 AI 新人引路助手。*`;

  const tags = generateTags(topic, 'cards');

  return {
    format: 'cards',
    title,
    body,
    tags,
    estimatedReadTime: Math.ceil(body.length / 500),
  };
}

/**
 * 生成标签推荐
 */
function generateTags(topic, format) {
  const baseTags = [
    topic,
    `${topic}入门`,
    '学习方法',
    '知识整理',
  ];

  const formatTags = {
    guide: ['学习路径', '新手教程', '经验分享'],
    experience: ['学习经验', '个人成长', '避坑指南'],
    debate: ['观点碰撞', '深度讨论', '行业观察'],
    cards: ['复习资料', '知识点总结', '考试必备'],
  };

  return [...baseTags, ...(formatTags[format] || [])];
}

module.exports = {
  generateZhihuPost,
  generateGuide,
  generateExperience,
  generateDebate,
  generateCards,
};
