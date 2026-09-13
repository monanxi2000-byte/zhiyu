/**
 * 内容共创前端模块
 * 一键生成知乎分享内容，支持复制到剪贴板
 */

(function () {
  'use strict';

  /**
   * 生成知乎分享内容
   */
  async function generatePost(result, format = 'guide') {
    try {
      const response = await fetch('/api/share/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, format }),
      });
      const data = await response.json();
      if (data.ok) return data.data;
      throw new Error(data.message || '生成失败');
    } catch (e) {
      // 降级：本地生成
      return generateLocalPost(result, format);
    }
  }

  /**
   * 本地生成（降级方案）
   */
  function generateLocalPost(result, format) {
    const topic = result.meta?.topic || '这个领域';
    const studyPlan = result.studyPlan || {};
    const stages = studyPlan.stages || studyPlan.timeline || [];
    const concepts = studyPlan.concepts || [];

    let title = '';
    let body = '';

    if (format === 'guide') {
      title = `${topic}入门指南：从零开始的完整学习路径`;
      body = `# ${title}\n\n> 本文由「知遇」AI 引路助手生成。\n\n`;
      body += `## 写在前面\n\n很多人想进入「${topic}」领域，但不知道从何开始。这篇指南整理了一条可执行的学习路径。\n\n`;
      if (stages.length > 0) {
        body += `## 学习路径\n\n`;
        stages.forEach((s, i) => {
          body += `### ${i + 1}. ${s.title || s.name || `阶段 ${i + 1}`}\n\n${s.description || s.desc || ''}\n\n`;
        });
      }
      if (concepts.length > 0) {
        body += `## 核心概念\n\n`;
        concepts.slice(0, 8).forEach((c, i) => {
          body += `**${i + 1}. ${c.name || c.concept || c.title}**\n\n${c.description || c.explanation || ''}\n\n`;
        });
      }
      body += `---\n\n*本文由「知遇」AI 引路助手生成。*`;
    } else if (format === 'experience') {
      title = `我是如何入门${topic}的：一份真实的学习经验分享`;
      body = `# ${title}\n\n> 本文由「知遇」AI 引路助手生成模板，可根据你的真实经历修改。\n\n`;
      body += `## 为什么学${topic}\n\n（这里写你的原因）\n\n`;
      body += `## 我踩过的坑\n\n1. 贪多求快\n2. 只收藏不实践\n3. 遇到问题就放弃\n\n`;
      body += `## 给新人的建议\n\n1. 先完成再完美\n2. 建立反馈循环\n3. 加入社区\n4. 做好笔记\n\n`;
      body += `---\n\n*本文由「知遇」AI 引路助手生成模板。*`;
    } else if (format === 'cards') {
      const cards = studyPlan.reviewCards || studyPlan.cards || [];
      title = `${topic}复习卡片合集：${cards.length} 个核心知识点`;
      body = `# ${title}\n\n> 建议收藏后反复复习。\n\n`;
      cards.forEach((c, i) => {
        body += `## ${i + 1}. ${c.front || c.question || c.concept}\n\n${c.back || c.answer || c.explanation}\n\n---\n\n`;
      });
      body += `## 复习建议\n\n1. 间隔重复：第1、3、7、14、30天\n2. 主动回忆\n3. 标记难点\n\n`;
      body += `---\n\n*本文由「知遇」AI 引路助手生成。*`;
    } else {
      title = `${topic}学习笔记`;
      body = `# ${title}\n\n（内容生成中）\n`;
    }

    return {
      format,
      title,
      body,
      tags: [topic, `${topic}入门`, '学习方法', '知识整理'],
      estimatedReadTime: Math.ceil(body.length / 500),
    };
  }

  /**
   * 复制到剪贴板
   */
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        return true;
      } catch {
        return false;
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }

  /**
   * 打开知乎发布页
   */
  function openZhihuPublish() {
    window.open('https://zhuanlan.zhihu.com/write', '_blank');
  }

  /**
   * 显示分享弹窗
   */
  function showShareModal(result) {
    // 创建弹窗
    const modal = document.createElement('div');
    modal.className = 'zhiyu-share-modal';
    modal.innerHTML = `
      <div class="share-modal-content">
        <div class="share-modal-header">
          <h3>📝 内容共创 · 一键生成知乎文章</h3>
          <button class="share-close-btn">×</button>
        </div>
        <div class="share-modal-body">
          <div class="share-format-tabs">
            <button class="share-tab active" data-format="guide">📚 入门指南</button>
            <button class="share-tab" data-format="experience">💡 经验分享</button>
            <button class="share-tab" data-format="debate">⚖️ 观点整理</button>
            <button class="share-tab" data-format="cards">🎴 复习卡片</button>
          </div>
          <div class="share-preview">
            <input type="text" class="share-title-input" placeholder="文章标题" />
            <textarea class="share-body-textarea" placeholder="文章内容" rows="15"></textarea>
          </div>
          <div class="share-tags">
            <span class="share-tag-label">标签：</span>
            <span class="share-tags-list"></span>
          </div>
        </div>
        <div class="share-modal-footer">
          <button class="share-copy-btn">📋 复制内容</button>
          <button class="share-publish-btn">🚀 去知乎发布</button>
        </div>
      </div>
    `;

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      .zhiyu-share-modal {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      .share-modal-content {
        background: #ffffff !important;
        color: #0f172a !important;
        border-radius: 16px;
        width: 90%;
        max-width: 700px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      }
      .share-modal-content * {
        color: #0f172a !important;
      }
      .share-modal-header {
        padding: 20px 24px;
        border-bottom: 1px solid #e5e9f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8fafc;
      }
      .share-modal-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: #0f172a !important;
      }
      .share-close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #64748b !important;
        line-height: 1;
        padding: 4px 8px;
        border-radius: 6px;
      }
      .share-close-btn:hover {
        background: #e2e8f0;
        color: #0f172a !important;
      }
      .share-modal-body {
        padding: 20px 24px;
        overflow-y: auto;
        flex: 1;
        background: #ffffff;
      }
      .share-format-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
        flex-wrap: wrap;
      }
      .share-tab {
        padding: 8px 16px;
        border: 1px solid #cbd5e1;
        border-radius: 20px;
        background: #ffffff;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        color: #334155 !important;
        transition: all 0.2s;
      }
      .share-tab:hover {
        border-color: #0084ff;
        color: #0084ff !important;
      }
      .share-tab.active {
        background: #0084ff;
        color: #ffffff !important;
        border-color: #0084ff;
      }
      .share-preview {
        margin-bottom: 12px;
      }
      .share-title-input {
        width: 100%;
        padding: 12px 16px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 12px;
        box-sizing: border-box;
        background: #ffffff !important;
        color: #0f172a !important;
      }
      .share-title-input::placeholder {
        color: #94a3b8 !important;
      }
      .share-body-textarea {
        width: 100%;
        padding: 12px 16px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 14px;
        line-height: 1.6;
        resize: vertical;
        box-sizing: border-box;
        font-family: inherit;
        background: #ffffff !important;
        color: #0f172a !important;
        min-height: 200px;
      }
      .share-body-textarea::placeholder {
        color: #94a3b8 !important;
      }
      .share-tags {
        margin-top: 12px;
        font-size: 13px;
        color: #475569 !important;
        line-height: 1.6;
      }
      .share-tag-label {
        font-weight: 600;
        color: #334155 !important;
      }
      .share-modal-footer {
        padding: 16px 24px;
        border-top: 1px solid #e5e9f0;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        background: #f8fafc;
      }
      .share-copy-btn, .share-publish-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s;
      }
      .share-copy-btn {
        background: #e2e8f0;
        color: #0f172a !important;
      }
      .share-copy-btn:hover {
        background: #cbd5e1;
      }
      .share-publish-btn {
        background: #0084ff;
        color: #ffffff !important;
      }
      .share-publish-btn:hover {
        background: #0066cc;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(modal);

    let currentPost = null;
    let currentFormat = 'guide';

    // 生成内容
    async function generate(format) {
      currentFormat = format;
      const titleInput = modal.querySelector('.share-title-input');
      const bodyTextarea = modal.querySelector('.share-body-textarea');
      const tagsList = modal.querySelector('.share-tags-list');

      titleInput.value = '生成中...';
      bodyTextarea.value = '正在生成内容，请稍候...';

      currentPost = await generatePost(result, format);
      titleInput.value = currentPost.title;
      bodyTextarea.value = currentPost.body;
      tagsList.textContent = currentPost.tags.join('、');
    }

    // 事件绑定
    modal.querySelectorAll('.share-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        modal.querySelectorAll('.share-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        generate(tab.dataset.format);
      });
    });

    modal.querySelector('.share-close-btn').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('.share-copy-btn').addEventListener('click', async () => {
      const title = modal.querySelector('.share-title-input').value;
      const body = modal.querySelector('.share-body-textarea').value;
      const fullText = `${title}\n\n${body}`;
      const success = await copyToClipboard(fullText);
      const btn = modal.querySelector('.share-copy-btn');
      btn.textContent = success ? '✅ 已复制' : '❌ 复制失败';
      setTimeout(() => { btn.textContent = '📋 复制内容'; }, 2000);
    });

    modal.querySelector('.share-publish-btn').addEventListener('click', () => {
      openZhihuPublish();
    });

    // 初始生成
    generate('guide');

    return modal;
  }

  // 导出 API
  window.ZhiYuShare = {
    generatePost,
    copyToClipboard,
    openZhihuPublish,
    showShareModal,
  };
})();
