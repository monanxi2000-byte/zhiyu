/**
 * 复习提醒模块
 * 基于 SM-2 间隔重复算法，实现复习卡片的定时提醒
 *
 * 功能：
 *  · 本地存储复习卡片
 *  · 计算下次复习时间
 *  · 浏览器通知提醒
 *  · 复习进度统计
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'zhiyu_review_cards';
  const SETTINGS_KEY = 'zhiyu_review_settings';

  // 默认设置
  const defaultSettings = {
    enabled: true,
    reminderTime: '20:00',
    dailyLimit: 20,
    notificationsEnabled: false,
  };

  /**
   * 获取复习卡片
   */
  function getCards() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  /**
   * 保存复习卡片
   */
  function saveCards(cards) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }

  /**
   * 添加复习卡片
   */
  function addCards(cards, topic) {
    const existing = getCards();
    const now = new Date().toISOString();
    const newCards = cards.map((card, idx) => ({
      id: `card_${Date.now()}_${idx}`,
      topic: topic || '',
      front: card.front || card.question || card.concept || '',
      back: card.back || card.answer || card.explanation || '',
      source: card.source || '知遇生成',
      createdAt: now,
      nextReviewAt: now,
      reviewCount: 0,
      easeFactor: 2.5,
      interval: 0,
      lastReviewedAt: null,
    }));
    const all = [...newCards, ...existing];
    // 最多保存 500 张
    saveCards(all.slice(0, 500));
    return newCards;
  }

  /**
   * 获取待复习卡片
   */
  function getDueCards() {
    const cards = getCards();
    const now = new Date();
    return cards.filter(card => new Date(card.nextReviewAt) <= now);
  }

  /**
   * 更新卡片复习状态（SM-2 算法）
   */
  function reviewCard(cardId, quality) {
    const cards = getCards();
    const card = cards.find(c => c.id === cardId);
    if (!card) return null;

    // quality: 0-5，0=完全忘记，5=完美回忆
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

    saveCards(cards);
    return card;
  }

  /**
   * 删除卡片
   */
  function deleteCard(cardId) {
    const cards = getCards().filter(c => c.id !== cardId);
    saveCards(cards);
  }

  /**
   * 获取复习统计
   */
  function getStats() {
    const cards = getCards();
    const due = getDueCards();
    const reviewed = cards.filter(c => c.reviewCount > 0);
    const today = new Date().toDateString();
    const reviewedToday = reviewed.filter(c => {
      if (!c.lastReviewedAt) return false;
      return new Date(c.lastReviewedAt).toDateString() === today;
    });

    return {
      total: cards.length,
      due: due.length,
      reviewed: reviewed.length,
      reviewedToday: reviewedToday.length,
      topics: [...new Set(cards.map(c => c.topic).filter(Boolean))],
    };
  }

  /**
   * 获取设置
   */
  function getSettings() {
    try {
      return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) };
    } catch {
      return { ...defaultSettings };
    }
  }

  /**
   * 保存设置
   */
  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  /**
   * 请求通知权限
   */
  async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      return { supported: false, permission: 'unsupported' };
    }
    const permission = await Notification.requestPermission();
    const settings = getSettings();
    settings.notificationsEnabled = permission === 'granted';
    saveSettings(settings);
    return { supported: true, permission };
  }

  /**
   * 发送复习提醒
   */
  function sendReminder() {
    const settings = getSettings();
    if (!settings.enabled) return;

    const due = getDueCards();
    if (due.length === 0) return;

    if (settings.notificationsEnabled && Notification.permission === 'granted') {
      new Notification('知遇 · 复习提醒', {
        body: `你有 ${due.length} 张卡片待复习，点击开始复习`,
        icon: '/assets/icon-256.png',
        tag: 'zhiyu-review-reminder',
      });
    }
  }

  /**
   * 启动定时检查
   */
  function startScheduler() {
    // 每分钟检查一次
    setInterval(() => {
      const settings = getSettings();
      if (!settings.enabled) return;

      const now = new Date();
      const [hour, minute] = settings.reminderTime.split(':').map(Number);

      // 检查是否到了提醒时间
      if (now.getHours() === hour && now.getMinutes() === minute) {
        sendReminder();
      }
    }, 60000);
  }

  // 导出 API
  window.ZhiYuReview = {
    getCards,
    addCards,
    getDueCards,
    reviewCard,
    deleteCard,
    getStats,
    getSettings,
    saveSettings,
    requestNotificationPermission,
    sendReminder,
    startScheduler,
  };

  // 自动启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startScheduler);
  } else {
    startScheduler();
  }
})();
