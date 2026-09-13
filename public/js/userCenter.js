/**
 * 用户中心前端模块
 * 知乎 OAuth 登录、个人数据管理
 */

(function () {
  'use strict';

  const TOKEN_KEY = 'zhiyu_auth_token';
  const USER_KEY = 'zhiyu_user_info';

  /**
   * 获取当前用户
   */
  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  }

  /**
   * 获取 token
   */
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * 检查登录状态
   */
  async function checkAuthStatus() {
    const token = getToken();
    if (!token) return { loggedIn: false };

    try {
      const response = await fetch(`/api/auth/status?token=${encodeURIComponent(token)}`);
      const data = await response.json();
      if (data.ok && data.loggedIn) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return data;
      }
      // token 失效，清除
      logout();
      return { loggedIn: false };
    } catch {
      return { loggedIn: false };
    }
  }

  /**
   * 发起知乎登录
   */
  async function loginWithZhihu() {
    try {
      const response = await fetch('/api/auth/zhihu/login');
      const data = await response.json();
      if (data.ok && data.authUrl) {
        window.location.href = data.authUrl;
        return true;
      }
      // OAuth 未配置，使用演示登录
      return demoLogin();
    } catch {
      return demoLogin();
    }
  }

  /**
   * 演示登录（OAuth 未配置时使用）
   */
  function demoLogin() {
    const user = {
      id: `demo_${Date.now()}`,
      profile: {
        name: '知遇用户',
        avatar: '',
        zhihuId: null,
      },
    };
    const token = Buffer.from(JSON.stringify({ userId: user.id, ts: Date.now() })).toString('base64');
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return true;
  }

  /**
   * 登出
   */
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  /**
   * 保存学习路径
   */
  async function saveStudyPlan(plan) {
    const user = getCurrentUser();
    if (!user) return null;

    try {
      const response = await fetch('/api/user/study-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, plan }),
      });
      const data = await response.json();
      return data.ok ? data.data : null;
    } catch {
      return null;
    }
  }

  /**
   * 获取学习路径列表
   */
  async function getStudyPlans() {
    const user = getCurrentUser();
    if (!user) return [];

    try {
      const response = await fetch(`/api/user/study-plans?userId=${encodeURIComponent(user.id)}`);
      const data = await response.json();
      return data.ok ? data.data : [];
    } catch {
      return [];
    }
  }

  /**
   * 保存复习卡片
   */
  async function saveReviewCards(cards, topic) {
    const user = getCurrentUser();
    if (!user) return null;

    try {
      const response = await fetch('/api/user/review-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, cards, topic }),
      });
      const data = await response.json();
      return data.ok ? data.data : null;
    } catch {
      return null;
    }
  }

  /**
   * 添加收藏
   */
  async function addFavorite(item) {
    const user = getCurrentUser();
    if (!user) return null;

    try {
      const response = await fetch('/api/user/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, item }),
      });
      const data = await response.json();
      return data.ok ? data.data : null;
    } catch {
      return null;
    }
  }

  /**
   * 获取收藏列表
   */
  async function getFavorites() {
    const user = getCurrentUser();
    if (!user) return [];

    try {
      const response = await fetch(`/api/user/favorites?userId=${encodeURIComponent(user.id)}`);
      const data = await response.json();
      return data.ok ? data.data : [];
    } catch {
      return [];
    }
  }

  /**
   * 显示用户中心弹窗
   */
  function showUserCenter() {
    const user = getCurrentUser();
    if (!user) {
      if (confirm('请先登录知乎账号')) {
        loginWithZhihu();
      }
      return;
    }

    // 创建弹窗
    const modal = document.createElement('div');
    modal.className = 'zhiyu-user-modal';
    modal.innerHTML = `
      <div class="user-modal-content">
        <div class="user-modal-header">
          <h3>👤 个人中心</h3>
          <button class="user-close-btn">×</button>
        </div>
        <div class="user-modal-body">
          <div class="user-profile">
            <div class="user-avatar">${user.profile?.name?.[0] || 'U'}</div>
            <div class="user-info">
              <div class="user-name">${user.profile?.name || '知遇用户'}</div>
              <div class="user-id">ID: ${user.id}</div>
            </div>
            <button class="user-logout-btn">退出登录</button>
          </div>
          <div class="user-stats">
            <div class="stat-item">
              <div class="stat-value" id="user-plans-count">-</div>
              <div class="stat-label">学习路径</div>
            </div>
            <div class="stat-item">
              <div class="stat-value" id="user-cards-count">-</div>
              <div class="stat-label">复习卡片</div>
            </div>
            <div class="stat-item">
              <div class="stat-value" id="user-favs-count">-</div>
              <div class="stat-label">收藏</div>
            </div>
          </div>
          <div class="user-section">
            <h4>📚 我的学习路径</h4>
            <div class="user-plans-list" id="user-plans-list">加载中...</div>
          </div>
          <div class="user-section">
            <h4>⭐ 我的收藏</h4>
            <div class="user-favs-list" id="user-favs-list">加载中...</div>
          </div>
        </div>
      </div>
    `;

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      .zhiyu-user-modal {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      .user-modal-content {
        background: #fff;
        border-radius: 16px;
        width: 90%;
        max-width: 600px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .user-modal-header {
        padding: 20px 24px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .user-modal-header h3 { margin: 0; font-size: 18px; }
      .user-close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #999;
      }
      .user-modal-body {
        padding: 20px 24px;
        overflow-y: auto;
        flex: 1;
      }
      .user-profile {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 20px;
      }
      .user-avatar {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #0084ff, #9b59ff);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        font-weight: 600;
      }
      .user-info { flex: 1; }
      .user-name { font-size: 18px; font-weight: 600; }
      .user-id { font-size: 12px; color: #999; margin-top: 4px; }
      .user-logout-btn {
        padding: 8px 16px;
        border: 1px solid #ddd;
        border-radius: 8px;
        background: #fff;
        cursor: pointer;
        font-size: 13px;
      }
      .user-stats {
        display: flex;
        gap: 16px;
        margin-bottom: 24px;
      }
      .stat-item {
        flex: 1;
        text-align: center;
        padding: 16px;
        background: #f8f9fa;
        border-radius: 12px;
      }
      .stat-value { font-size: 24px; font-weight: 700; color: #0084ff; }
      .stat-label { font-size: 12px; color: #666; margin-top: 4px; }
      .user-section { margin-bottom: 20px; }
      .user-section h4 { margin: 0 0 12px; font-size: 15px; }
      .user-plans-list, .user-favs-list {
        font-size: 13px;
        color: #666;
      }
      .plan-item, .fav-item {
        padding: 10px 12px;
        background: #f8f9fa;
        border-radius: 8px;
        margin-bottom: 8px;
        cursor: pointer;
      }
      .plan-item:hover, .fav-item:hover { background: #e9ecef; }
    `;
    document.head.appendChild(style);
    document.body.appendChild(modal);

    // 加载数据
    async function loadData() {
      try {
        const [plans, favs] = await Promise.all([getStudyPlans(), getFavorites()]);
        document.getElementById('user-plans-count').textContent = plans.length;
        document.getElementById('user-favs-count').textContent = favs.length;

        const plansList = document.getElementById('user-plans-list');
        if (plans.length === 0) {
          plansList.innerHTML = '<div style="color:#999;padding:10px;">暂无学习路径</div>';
        } else {
          plansList.innerHTML = plans.map(p =>
            `<div class="plan-item" data-id="${p.id}">${p.topic} · ${new Date(p.savedAt).toLocaleDateString()}</div>`
          ).join('');
        }

        const favsList = document.getElementById('user-favs-list');
        if (favs.length === 0) {
          favsList.innerHTML = '<div style="color:#999;padding:10px;">暂无收藏</div>';
        } else {
          favsList.innerHTML = favs.map(f =>
            `<div class="fav-item" data-id="${f.id}">${f.title || '收藏内容'}</div>`
          ).join('');
        }

        // 复习卡片数量从本地获取
        if (window.ZhiYuReview) {
          const stats = window.ZhiYuReview.getStats();
          document.getElementById('user-cards-count').textContent = stats.total;
        }
      } catch (e) {
        console.error('加载用户数据失败', e);
      }
    }

    loadData();

    // 事件绑定
    modal.querySelector('.user-close-btn').addEventListener('click', () => modal.remove());
    modal.querySelector('.user-logout-btn').addEventListener('click', () => {
      logout();
      modal.remove();
      location.reload();
    });

    return modal;
  }

  // 导出 API
  window.ZhiYuUser = {
    getCurrentUser,
    getToken,
    checkAuthStatus,
    loginWithZhihu,
    logout,
    saveStudyPlan,
    getStudyPlans,
    saveReviewCards,
    addFavorite,
    getFavorites,
    showUserCenter,
  };

  // 检查 URL 中的 auth_token（OAuth 回调）
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleOAuthCallback);
  } else {
    handleOAuthCallback();
  }

  function handleOAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('auth_token');
    const userStr = params.get('user');
    if (token && userStr) {
      try {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, userStr);
        // 清除 URL 参数
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch {}
    }
  }
})();
