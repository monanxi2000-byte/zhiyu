'use strict';

/**
 * knowledgeApi —— 知乎黑客松配套内容接口（故事 / 知识）。
 * 该接口当前无需鉴权，用于 Demo 阶段也能拿到知乎真实内容；
 * 内容归属、来源如实保留，不将原文改写成应用或用户创作。
 */

const cache = require('../lib/cache');

const BASE = 'https://api.zhihu.com/km-indep-home/hackathon/v2';
const TIMEOUT_MS = 15 * 1000;

const WORK_ID_RE = /^[0-9A-Za-z_-]+$/;

async function fetchJson(url, { ttl = 60 * 60 * 1000 } = {}) {
  const hit = cache.get(url);
  if (hit) return hit;
  let resp;
  try {
    resp = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const e = new Error(`知乎知识内容接口不可达: ${err.message}`);
    e.code = 'KNOWLEDGE_NETWORK';
    throw e;
  }
  if (!resp.ok) {
    const e = new Error(`知乎知识内容接口返回 ${resp.status}`);
    e.code = 'KNOWLEDGE_HTTP';
    e.status = resp.status;
    throw e;
  }
  const data = await resp.json();
  cache.set(url, data, ttl);
  return data;
}

function assertWorkId(id) {
  if (typeof id !== 'string' || !WORK_ID_RE.test(id)) {
    const e = new Error('非法的内容 ID');
    e.code = 'INVALID_WORK_ID';
    throw e;
  }
  return id;
}

/** 知识内容列表。 */
async function listKnowledge() {
  return fetchJson(`${BASE}/knowledge/list`);
}

/** 知识内容详情。 */
async function knowledgeDetail(id) {
  const safe = assertWorkId(id);
  return fetchJson(`${BASE}/knowledge/${encodeURIComponent(safe)}`, { ttl: 24 * 60 * 60 * 1000 });
}

/** 故事内容列表。 */
async function listStories() {
  return fetchJson(`${BASE}/story/list`);
}

/** 故事内容详情。 */
async function storyDetail(id) {
  const safe = assertWorkId(id);
  return fetchJson(`${BASE}/story/${encodeURIComponent(safe)}`, { ttl: 24 * 60 * 60 * 1000 });
}

/**
 * 关键词匹配：把用户话题与知识内容做轻量相关性打分。
 * score = 命中关键词数 / 内容长度惩罚，返回排序后的前 N 条。
 */
function matchKnowledge(list, topic, keywords = [], limit = 4) {
  if (!Array.isArray(list)) return [];
  const terms = new Set();
  for (const kw of keywords) {
    if (typeof kw === 'string' && kw.length >= 2) terms.add(kw.toLowerCase());
  }
  // 话题本身拆成 2 字以上片段也作为候选词
  const topicClean = String(topic || '').toLowerCase();
  if (topicClean.length >= 2) terms.add(topicClean);
  for (let i = 0; i + 2 <= topicClean.length; i++) {
    terms.add(topicClean.slice(i, i + 2));
  }

  const scored = [];
  for (const item of list) {
    const text = `${item.title || ''} ${item.description || ''}`.toLowerCase();
    let hit = 0;
    for (const t of terms) {
      if (t.length >= 2 && text.includes(t)) hit += t.length;
    }
    if (hit > 0) scored.push({ item, score: hit });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => ({
    workId: s.item.work_id,
    title: s.item.title,
    description: (s.item.description || '').slice(0, 120),
    labels: Array.isArray(s.item.labels) ? s.item.labels : [],
    artwork: s.item.artwork || s.item.tab_artwork || '',
    score: s.score,
    source: '知乎知识内容',
  }));
}

module.exports = {
  listKnowledge,
  knowledgeDetail,
  listStories,
  storyDetail,
  matchKnowledge,
};
