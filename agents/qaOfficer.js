'use strict';

/**
 * Agent 5 · 答疑官（QA Officer）
 *
 * 基于用户的个人知识库（学习路径、复习卡片、收藏内容），
 * 提供 RAG（检索增强生成）风格的问答服务。
 *
 * 工作流程：
 *  1. 接收用户问题
 *  2. 从个人知识库中检索相关内容
 *  3. 结合知乎搜索补充外部知识
 *  4. 生成带引用的回答
 *
 * 设计原则：
 *  · 回答必须基于已有知识，不编造
 *  · 每条关键信息都标注来源
 *  · 不知道就说不知道，引导用户去知乎搜索
 */

const zhihu = require('../lib/zhihuClient');

/**
 * 回答用户问题
 * @param {string} question 用户问题
 * @param {object} knowledgeBase 用户知识库
 * @param {object} options { useZhihuSearch, topic }
 */
async function answer(question, knowledgeBase = {}, options = {}) {
  const { useZhihuSearch = true, topic = '' } = options;

  // 1. 从个人知识库检索
  const personalResults = searchPersonalKnowledge(question, knowledgeBase);

  // 2. 可选：从知乎搜索补充
  let zhihuResults = [];
  if (useZhihuSearch && await zhihu.isLive()) {
    try {
      const searchQuery = topic ? `${topic} ${question}` : question;
      zhihuResults = await zhihu.searchZhihu(searchQuery, 5);
    } catch (e) {
      // 搜索失败不影响主流程
    }
  }

  // 3. 生成回答
  const answer = generateAnswer(question, personalResults, zhihuResults);

  return {
    agent: 'qa-officer',
    agentName: '答疑官',
    emoji: '💡',
    question,
    answer,
    sources: {
      personal: personalResults.slice(0, 5),
      zhihu: zhihuResults.slice(0, 5),
    },
    confidence: calculateConfidence(personalResults, zhihuResults),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 从个人知识库检索相关内容
 */
function searchPersonalKnowledge(question, knowledgeBase) {
  const results = [];
  const keywords = extractKeywords(question);

  // 搜索学习路径
  (knowledgeBase.studyPlans || []).forEach(plan => {
    const score = calculateRelevance(question, keywords, JSON.stringify(plan));
    if (score > 0) {
      results.push({
        type: '学习路径',
        title: plan.topic || '学习路径',
        snippet: extractRelevantSnippet(question, JSON.stringify(plan)),
        score,
        source: '个人知识库',
      });
    }
  });

  // 搜索复习卡片
  (knowledgeBase.reviewCards || []).forEach(card => {
    const text = `${card.front} ${card.back}`;
    const score = calculateRelevance(question, keywords, text);
    if (score > 0) {
      results.push({
        type: '复习卡片',
        title: card.front || '复习卡片',
        snippet: card.back || '',
        score,
        source: '个人知识库',
      });
    }
  });

  // 搜索收藏
  (knowledgeBase.favorites || []).forEach(fav => {
    const text = `${fav.title} ${fav.excerpt || fav.content || ''}`;
    const score = calculateRelevance(question, keywords, text);
    if (score > 0) {
      results.push({
        type: '收藏内容',
        title: fav.title || '收藏',
        snippet: fav.excerpt || fav.content || '',
        url: fav.url,
        score,
        source: '个人收藏',
      });
    }
  });

  return results.sort((a, b) => b.score - a.score);
}

/**
 * 提取关键词
 */
function extractKeywords(text) {
  // 简单的中文关键词提取（停用词过滤）
  const stopWords = new Set(['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这']);
  const words = text.split(/[\s，。！？、；：""''（）【】《》\[\]{}.,!?;:'"()<>]+/).filter(w => w.length > 1 && !stopWords.has(w));
  return words;
}

/**
 * 计算相关度
 */
function calculateRelevance(question, keywords, text) {
  if (!text) return 0;
  let score = 0;
  keywords.forEach(kw => {
    if (text.includes(kw)) score += 1;
  });
  return score;
}

/**
 * 提取相关片段
 */
function extractRelevantSnippet(question, text) {
  const keywords = extractKeywords(question);
  const sentences = text.split(/[。！？.!?]+/);
  let bestSnippet = '';
  let bestScore = 0;
  sentences.forEach(s => {
    let score = 0;
    keywords.forEach(kw => {
      if (s.includes(kw)) score += 1;
    });
    if (score > bestScore) {
      bestScore = score;
      bestSnippet = s.trim();
    }
  });
  return bestSnippet.substring(0, 200);
}

/**
 * 生成回答
 */
function generateAnswer(question, personalResults, zhihuResults) {
  const allSources = [...personalResults, ...zhihuResults.map(r => ({
    type: '知乎搜索',
    title: r.Title || r.title || '',
    snippet: r.Excerpt || r.excerpt || r.summary || '',
    url: r.Url || r.url || r.link,
    author: r.Author || r.author || '',
    source: '知乎',
  }))];

  if (allSources.length === 0) {
    return {
      text: `关于「${question}」，我的个人知识库中暂时没有相关内容。建议你：\n\n1. 直接在知乎搜索这个问题\n2. 先完成相关领域的学习路径\n3. 收藏有价值的回答，我会帮你整理到知识库中`,
      hasAnswer: false,
      suggestion: '去知乎搜索',
    };
  }

  // 基于检索结果生成回答
  const topSources = allSources.slice(0, 3);
  const answerParts = topSources.map((s, i) => {
    return `**参考 ${i + 1}（${s.type}）：${s.title}**\n${s.snippet || ''}${s.url ? `\n🔗 [查看原文](${s.url})` : ''}`;
  });

  return {
    text: `根据你的个人知识库和知乎资料，关于「${question}」的回答如下：\n\n${answerParts.join('\n\n')}\n\n---\n💡 以上内容来自你的学习积累，建议结合实际情况判断。如果需要更深入的解答，可以直接去知乎搜索。`,
    hasAnswer: true,
    sources: topSources,
  };
}

/**
 * 计算置信度
 */
function calculateConfidence(personalResults, zhihuResults) {
  const total = personalResults.length + zhihuResults.length;
  if (total === 0) return 0;
  if (total >= 5) return 0.9;
  if (total >= 3) return 0.7;
  if (total >= 1) return 0.5;
  return 0.3;
}

module.exports = { answer };
