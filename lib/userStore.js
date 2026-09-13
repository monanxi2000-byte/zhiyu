'use strict';

/**
 * 用户数据存储模块
 * 基于文件系统的简单用户数据持久化
 * 存储：用户信息、学习路径、复习卡片、收藏夹
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'users');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getUserPath(userId) {
  return path.join(DATA_DIR, `${userId}.json`);
}

/**
 * 创建或获取用户
 */
function getOrCreateUser(zhihuId, profile = {}) {
  const userPath = getUserPath(zhihuId);
  if (fs.existsSync(userPath)) {
    const user = JSON.parse(fs.readFileSync(userPath, 'utf8'));
    // 更新 profile
    user.profile = { ...user.profile, ...profile };
    user.lastLoginAt = new Date().toISOString();
    fs.writeFileSync(userPath, JSON.stringify(user, null, 2));
    return user;
  }

  const user = {
    id: zhihuId,
    profile,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    studyPlans: [],      // 保存的学习路径
    reviewCards: [],      // 复习卡片
    favorites: [],        // 收藏的知乎内容
    reviewSchedule: [],   // 复习计划
  };
  fs.writeFileSync(userPath, JSON.stringify(user, null, 2));
  return user;
}

/**
 * 获取用户数据
 */
function getUser(zhihuId) {
  const userPath = getUserPath(zhihuId);
  if (!fs.existsSync(userPath)) return null;
  return JSON.parse(fs.readFileSync(userPath, 'utf8'));
}

/**
 * 保存学习路径
 */
function saveStudyPlan(zhihuId, plan) {
  const user = getUser(zhihuId);
  if (!user) return null;
  const record = {
    id: `plan_${Date.now()}`,
    topic: plan.meta?.topic || plan.topic,
    data: plan,
    savedAt: new Date().toISOString(),
  };
  user.studyPlans.unshift(record);
  // 最多保存 20 条
  if (user.studyPlans.length > 20) user.studyPlans = user.studyPlans.slice(0, 20);
  fs.writeFileSync(getUserPath(zhihuId), JSON.stringify(user, null, 2));
  return record;
}

/**
 * 获取学习路径列表
 */
function getStudyPlans(zhihuId) {
  const user = getUser(zhihuId);
  return user ? user.studyPlans : [];
}

/**
 * 保存复习卡片
 */
function saveReviewCards(zhihuId, cards, topic) {
  const user = getUser(zhihuId);
  if (!user) return null;
  const now = new Date().toISOString();
  const newCards = cards.map((card, idx) => ({
    id: `card_${Date.now()}_${idx}`,
    topic,
    front: card.front || card.question || card.concept,
    back: card.back || card.answer || card.explanation,
    source: card.source || '知遇生成',
    createdAt: now,
    nextReviewAt: now,
    reviewCount: 0,
    easeFactor: 2.5,
    interval: 0,
  }));
  user.reviewCards = [...newCards, ...user.reviewCards];
  // 最多保存 200 张
  if (user.reviewCards.length > 200) user.reviewCards = user.reviewCards.slice(0, 200);
  fs.writeFileSync(getUserPath(zhihuId), JSON.stringify(user, null, 2));
  return newCards;
}

/**
 * 获取待复习卡片
 */
function getDueCards(zhihuId) {
  const user = getUser(zhihuId);
  if (!user) return [];
  const now = new Date();
  return user.reviewCards.filter(card => new Date(card.nextReviewAt) <= now);
}

/**
 * 更新卡片复习状态（SM-2 间隔重复算法）
 */
function updateCardReview(zhihuId, cardId, quality) {
  const user = getUser(zhihuId);
  if (!user) return null;
  const card = user.reviewCards.find(c => c.id === cardId);
  if (!card) return null;

  // SM-2 算法
  if (quality < 3) {
    card.interval = 0;
    card.reviewCount = 0;
  } else {
    if (card.reviewCount === 0) {
      card.interval = 1;
    } else if (card.reviewCount === 1) {
      card.interval = 6;
    } else {
      card.interval = Math.round(card.interval * card.easeFactor);
    }
    card.reviewCount += 1;
  }
  card.easeFactor = card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (card.easeFactor < 1.3) card.easeFactor = 1.3;

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + card.interval);
  card.nextReviewAt = nextDate.toISOString();
  card.lastReviewedAt = new Date().toISOString();

  fs.writeFileSync(getUserPath(zhihuId), JSON.stringify(user, null, 2));
  return card;
}

/**
 * 添加收藏
 */
function addFavorite(zhihuId, item) {
  const user = getUser(zhihuId);
  if (!user) return null;
  const record = {
    id: `fav_${Date.now()}`,
    ...item,
    savedAt: new Date().toISOString(),
  };
  user.favorites.unshift(record);
  if (user.favorites.length > 100) user.favorites = user.favorites.slice(0, 100);
  fs.writeFileSync(getUserPath(zhihuId), JSON.stringify(user, null, 2));
  return record;
}

/**
 * 获取收藏列表
 */
function getFavorites(zhihuId) {
  const user = getUser(zhihuId);
  return user ? user.favorites : [];
}

module.exports = {
  getOrCreateUser,
  getUser,
  saveStudyPlan,
  getStudyPlans,
  saveReviewCards,
  getDueCards,
  updateCardReview,
  addFavorite,
  getFavorites,
};
