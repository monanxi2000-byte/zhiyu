/* ============================================================
   知遇 ZhiYu · 前端逻辑 v5
   多 Agent 流水线（SSE 进度）+ 3D 交互 + 结果渲染
   + 总进度可视化 + 复习卡片增强 + 导出 + 历史记录
   ============================================================ */

'use strict';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const el = (tag, cls, html) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html !== undefined) node.innerHTML = html;
  return node;
};

const state = {
  mode: 'demo',
  guideMode: 'template', // template | llm
  flashcards: [],
  fcIndex: 0,
  fcMastered: {}, // { index: true }
  currentResult: null,
  currentTopic: '',
  currentAudience: 'all',
  history: [],
  favorites: {},
};

/* ---------- 工具 ---------- */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ---------- 3D 交互基础 ---------- */
function setupTilt() {
  const maxDeg = 7;
  document.addEventListener('mousemove', (e) => {
    const cards = document.querySelectorAll('.tilt');
    for (const card of cards) {
      const r = card.getBoundingClientRect();
      if (r.width === 0) continue;
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${(px * maxDeg).toFixed(2)}deg) rotateX(${(-py * maxDeg).toFixed(2)}deg) translateZ(6px)`;
    }
  });
  document.addEventListener('mouseleave', () => {
    $$('.tilt').forEach((c) => (c.style.transform = ''));
  });
}

function setupHeroParallax() {
  const scene = $('#heroScene');
  if (!scene) return;
  document.addEventListener('mousemove', (e) => {
    const dx = e.clientX / window.innerWidth - 0.5;
    const dy = e.clientY / window.innerHeight - 0.5;
    scene.querySelectorAll('.layer').forEach((layer, i) => {
      const depth = (i + 1) * 14;
      layer.style.transform = `translate3d(${(-dx * depth).toFixed(1)}px, ${(-dy * depth * 0.6).toFixed(1)}px, 0)`;
    });
  });
}

function setupScrollEffects() {
  const bar = $('#scrollProgress');
  const updateBar = () => {
    const h = document.documentElement;
    const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
    bar.style.width = `${(p * 100).toFixed(1)}%`;
  };
  document.addEventListener('scroll', updateBar, { passive: true });
  updateBar();

  const observer = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting) {
          en.target.classList.add('visible');
          observer.unobserve(en.target);
        }
      }
    },
    { threshold: 0.08 }
  );
  $$('.reveal').forEach((n) => observer.observe(n));
  const resultObserver = new MutationObserver(() => {
    $$('.reveal:not(.visible)').forEach((n) => observer.observe(n));
  });
  resultObserver.observe($('#results'), { childList: true, subtree: true });
}

/* ---------- 初始化 ---------- */
async function init() {
  setupTilt();
  setupHeroParallax();
  setupScrollEffects();
  initTheme();
  initMascotAnimation();
  await loadMode();
  await loadScenarios();
  loadHistory();
  bindEvents();
}

async function loadMode() {
  try {
    const resp = await fetch('/api/health');
    const data = await resp.json();
    state.mode = data.mode === 'live' ? 'live' : 'demo';
    const badge = $('#modeBadge');
    badge.textContent = state.mode === 'live' ? '● 实时模式 · 已连接知乎开放平台' : '○ 演示模式 · 使用知乎知识内容接口';
    badge.classList.add(state.mode === 'live' ? 'live' : 'demo');
    const note = $('#dataNoteText');
    if (state.mode === 'live') {
      note.textContent = '当前为实时模式：知乎搜索 / 全网搜索 / 热榜 / 直答综述均已接入开放平台（带应用层缓存）。';
    }
  } catch {
    $('#modeBadge').textContent = '服务未连接';
  }
}

async function loadScenarios() {
  try {
    const resp = await fetch('/api/scenarios');
    const data = await resp.json();
    const box = $('#scenarioChips');
    box.innerHTML = '';
    (data.data || []).forEach((sc) => {
      const chip = el('button', 'chip', `${sc.emoji} ${esc(sc.name)}`);
      chip.type = 'button';
      chip.addEventListener('click', () => {
        $$('.chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        $('#topicInput').value = sc.name;
        $('#topicInput').focus();
      });
      box.appendChild(chip);
    });
  } catch {
    /* 场景加载失败不阻塞使用 */
  }
}

/* ---------- 历史记录与收藏 ---------- */
function loadHistory() {
  try {
    state.history = JSON.parse(localStorage.getItem('zhiyu_history') || '[]');
    state.favorites = JSON.parse(localStorage.getItem('zhiyu_favorites') || '{}');
  } catch {
    state.history = [];
    state.favorites = {};
  }
  renderRecentGuides();
}

function saveToHistory(topic, result) {
  const item = {
    topic,
    scenarioName: result.meta?.scenarioName || '',
    live: result.meta?.live || false,
    stages: (result.studyPlan?.stages || []).length,
    concepts: (result.studyPlan?.concepts || []).length,
    flashcards: (result.studyPlan?.flashcards || []).length,
    time: Date.now(),
    result: JSON.parse(JSON.stringify(result)), // 保存完整结果用于恢复
  };
  // 去重：相同话题只保留最新
  state.history = state.history.filter((h) => h.topic !== topic);
  state.history.unshift(item);
  if (state.history.length > 20) state.history = state.history.slice(0, 20);
  try {
    localStorage.setItem('zhiyu_history', JSON.stringify(state.history));
  } catch { /* 存储满了就不保存 */ }
  renderRecentGuides();
}

function renderRecentGuides() {
  const box = $('#recentGuides');
  const list = $('#recentList');
  if (!box || !list) return;
  if (!state.history.length) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  list.innerHTML = '';
  state.history.slice(0, 8).forEach((h) => {
    const item = el('div', 'recent-item');
    const isFav = !!state.favorites[h.topic];
    item.innerHTML = `<span>${isFav ? '⭐' : '🕘'}</span><span>${esc(h.topic)}</span><span style="color:#9ca3af;font-size:11px">${h.stages}阶段</span>`;
    item.title = `${h.scenarioName} · ${new Date(h.time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    item.addEventListener('click', () => {
      // 恢复历史结果
      if (h.result) {
        state.currentTopic = h.topic;
        state.currentResult = h.result;
        onResult(h.result);
      }
    });
    list.appendChild(item);
  });
  // 清除按钮
  const clear = el('span', 'recent-clear', '清除记录');
  clear.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm('确定清除所有引路记录？')) {
      state.history = [];
      localStorage.removeItem('zhiyu_history');
      renderRecentGuides();
    }
  });
  list.appendChild(clear);
}

function toggleFavorite() {
  const topic = state.currentTopic;
  if (!topic) return;
  if (state.favorites[topic]) {
    delete state.favorites[topic];
    $('#favoriteBtn').classList.remove('active');
    $('#favoriteBtn').textContent = '⭐ 收藏';
    showToolHint('已取消收藏');
  } else {
    state.favorites[topic] = {
      topic,
      result: state.currentResult,
      time: Date.now(),
    };
    $('#favoriteBtn').classList.add('active');
    $('#favoriteBtn').textContent = '⭐ 已收藏';
    showToolHint('已收藏到本地');
  }
  try {
    localStorage.setItem('zhiyu_favorites', JSON.stringify(state.favorites));
  } catch { /* ignore */ }
}

function showToolHint(text) {
  const hint = $('#toolHint');
  if (hint) {
    hint.textContent = text;
    setTimeout(() => { hint.textContent = ''; }, 2500);
  }
}

/* ---------- 事件绑定 ---------- */
function bindEvents() {
  $('#guideForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const topic = $('#topicInput').value.trim();
    if (!topic) {
      $('#topicInput').focus();
      $('#topicInput').placeholder = '先告诉我你想进入什么领域～';
      return;
    }
    startGuide(topic);
  });

  $('#fcPrev').addEventListener('click', () => flipCard(-1));
  $('#fcNext').addEventListener('click', () => flipCard(1));

  // 复习卡片：已掌握 / 需复习
  const fcMasteredBtn = $('#fcMastered');
  const fcReviewBtn = $('#fcReview');
  if (fcMasteredBtn) {
    fcMasteredBtn.addEventListener('click', () => markCardMastered(true));
  }
  if (fcReviewBtn) {
    fcReviewBtn.addEventListener('click', () => markCardMastered(false));
  }

  // 身份定位过滤
  $$('.audience-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.audience-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentAudience = btn.dataset.audience;
      if (state.currentResult) renderHot(state.currentResult.materials.hotTopics, state.currentResult.meta.live);
    });
  });

  // 关于我们 Tab 切换
  $$('.about-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.about-tab-btn').forEach((b) => b.classList.remove('active'));
      $$('.about-tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.querySelector(`.about-tab-panel[data-panel="${btn.dataset.tab}"]`);
      if (panel) panel.classList.add('active');
    });
  });

  // 模式切换
  $$('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.mode-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.guideMode = btn.dataset.mode;
    });
  });

  // 追问：提问按钮
  $('#askBtn').addEventListener('click', () => submitAsk());
  $('#askInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitAsk();
  });
  // 追问：建议问题点击
  $$('.ask-suggest-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $('#askInput').value = btn.textContent;
      submitAsk();
    });
  });

  $('#flashcard').addEventListener('click', () => $('#flashcard').classList.toggle('flipped'));
  $('#modalClose').addEventListener('click', closeReader);
  $('#agentModalClose').addEventListener('click', closeAgentModal);
  $('#readerModal').addEventListener('click', (e) => {
    if (e.target.id === 'readerModal') closeReader();
  });
  $('#agentModal').addEventListener('click', (e) => {
    if (e.target.id === 'agentModal') closeAgentModal();
  });

  // 导出按钮
  const exportMdBtn = $('#exportMdBtn');
  if (exportMdBtn) exportMdBtn.addEventListener('click', () => exportMarkdown());
  const copyMdBtn = $('#copyMdBtn');
  if (copyMdBtn) copyMdBtn.addEventListener('click', () => copyMarkdownToClipboard());
  const favoriteBtn = $('#favoriteBtn');
  if (favoriteBtn) favoriteBtn.addEventListener('click', toggleFavorite);
  const shareImgBtn = $('#shareImgBtn');
  if (shareImgBtn) shareImgBtn.addEventListener('click', () => generateShareImage());

  // 深色模式切换
  const themeToggle = $('#themeToggle');
  if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

  // 导航"多Agent机制"点击弹窗
  const agentNavLink = document.querySelector('.nav-links a[href="#how"]');
  if (agentNavLink) {
    agentNavLink.addEventListener('click', (e) => {
      e.preventDefault();
      const modal = $('#agentInfoModal');
      if (modal) {
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
      }
    });
  }

  // Agent机制弹窗关闭
  const agentInfoModalClose = $('#agentInfoModalClose');
  if (agentInfoModalClose) agentInfoModalClose.addEventListener('click', closeAgentInfoModal);
  const agentInfoModal = $('#agentInfoModal');
  if (agentInfoModal) {
    agentInfoModal.addEventListener('click', (e) => {
      if (e.target.id === 'agentInfoModal') closeAgentInfoModal();
    });
  }

  // 导出弹窗
  const exportModalClose = $('#exportModalClose');
  if (exportModalClose) exportModalClose.addEventListener('click', closeExportModal);
  const exportModal = $('#exportModal');
  if (exportModal) {
    exportModal.addEventListener('click', (e) => {
      if (e.target.id === 'exportModal') closeExportModal();
    });
  }
  const copyExportBtn = $('#copyExportBtn');
  if (copyExportBtn) copyExportBtn.addEventListener('click', () => {
    const text = $('#exportTextarea').value;
    copyToClipboard(text);
    showToolHint('已复制到剪贴板');
  });
  const downloadExportBtn = $('#downloadExportBtn');
  if (downloadExportBtn) downloadExportBtn.addEventListener('click', downloadMarkdown);

  // 分享图弹窗
  const shareModalClose = $('#shareModalClose');
  if (shareModalClose) shareModalClose.addEventListener('click', closeShareModal);
  const shareModal = $('#shareModal');
  if (shareModal) {
    shareModal.addEventListener('click', (e) => {
      if (e.target.id === 'shareModal') closeShareModal();
    });
  }
  const downloadShareBtn = $('#downloadShareBtn');
  if (downloadShareBtn) downloadShareBtn.addEventListener('click', downloadShareImage);

  // 键盘快捷键
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeReader();
      closeExportModal();
      closeAgentInfoModal();
    }
    // 只在结果区可见时响应复习卡片快捷键
    if ($('#results') && !$('#results').hidden) {
      // 不阻止输入框中的按键
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        $('#flashcard').classList.toggle('flipped');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        flipCard(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        flipCard(1);
      } else if (e.key === 'm' || e.key === 'M') {
        markCardMastered(true);
      }
    }
  });
}

/* ---------- 启动流水线 ---------- */
function startGuide(topic) {
  state.currentTopic = topic;
  state.fcMastered = {};
  $('#results').hidden = true;
  $('#pipeline').hidden = false;
  $('#guideBtn').disabled = true;
  $('.btn-text').hidden = true;
  $('.btn-loading').hidden = false;
  $('#pipelineTitle').textContent = `正在为「${topic}」引路…`;

  resetPipeline();
  $('#pipelineLog').innerHTML = '';
  scrollToSection('#pipeline');

  const modeParam = state.guideMode === 'llm' ? `&mode=llm&audience=${state.currentAudience}` : '';
  const url = `/api/guide/stream?topic=${encodeURIComponent(topic)}${modeParam}`;
  const es = new EventSource(url);

  es.addEventListener('log', (ev) => {
    const msg = JSON.parse(ev.data);
    handleLog(msg);
  });

  es.addEventListener('result', (ev) => {
    const result = JSON.parse(ev.data);
    es.close();
    state.currentResult = result;
    onResult(result);
  });

  es.addEventListener('error', (ev) => {
    if (state.currentResult) return;
    es.close();
    pushLog('warn', '实时进度通道中断，正在切换为一次性请求…');
    fetch(`/api/guide?topic=${encodeURIComponent(topic)}${modeParam}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.data) onResult(d.data);
        else throw new Error(d.message || '生成失败');
      })
      .catch((err) => {
        pushLog('warn', `失败：${err.message}`);
        finishLoading(false);
      });
  });
}

function scrollToSection(sel) {
  const node = $(sel);
  if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- 流水线进度 ---------- */
function resetPipeline() {
  ['collector', 'comparator', 'curator'].forEach((key) => {
    const node = $(`#pipe${cap(key)}`);
    node.className = 'pipe-agent';
    node.querySelector('.pipe-state').textContent = '待命';
    node.querySelector('.pipe-msg').textContent = '等待启动';
    const btn = node.querySelector('.pipe-detail-btn');
    if (btn) btn.hidden = true;
  });
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function handleLog(msg) {
  const { agent, stage, message } = msg;
  const pipeMap = { collector: 'pipeCollector', comparator: 'pipeComparator', curator: 'pipeCurator' };
  const node = pipeMap[agent] ? $(`#${pipeMap[agent]}`) : null;

  if (node) {
    const stateEl = node.querySelector('.pipe-state');
    const msgEl = node.querySelector('.pipe-msg');
    if (stage === 'start') {
      node.className = 'pipe-agent running';
      stateEl.textContent = '工作中';
    } else if (stage === 'done') {
      node.className = 'pipe-agent done';
      stateEl.textContent = '已完成';
    } else if (stage === 'warn') {
      node.className = 'pipe-agent warn';
      stateEl.textContent = '有降级';
    }
    msgEl.textContent = message || '';
    if (agent !== 'boot' && stage !== 'info') pushLog(stage === 'warn' ? 'warn' : 'log', `[${agentName(agent)}] ${message}`);
  } else if (agent === 'boot') {
    pushLog('log', message);
  }
}

function agentName(id) {
  return { collector: '资料收集官', comparator: '观点对照官', curator: '知识梳理官' }[id] || id;
}

function pushLog(kind, text) {
  const box = $('#pipelineLog');
  const line = el('div', `log-line${kind === 'warn' ? ' log-warn' : ''}`, esc(text));
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

/* ---------- 结果渲染 ---------- */
function finishLoading() {
  $('#guideBtn').disabled = false;
  $('.btn-text').hidden = false;
  $('.btn-loading').hidden = true;
}

function onResult(result) {
  finishLoading();
  $('#pipelineTitle').textContent = '引路完成 ✨';
  // 显示三个 Agent 的详情按钮
  $$('.pipe-detail-btn').forEach((btn) => {
    btn.hidden = false;
    btn.onclick = () => openAgentDetail(btn.dataset.agent);
  });
  renderMeta(result);
  renderTimePlan(result);
  renderTimeline(result.studyPlan.stages);
  updateStageProgress(result.studyPlan.stages);
  renderConcepts(result.studyPlan.concepts);
  renderDebates(result.comparison);
  renderSources(result.materials.sources, result.meta.live);
  renderFlashcards(result.studyPlan.flashcards);
  renderHot(result.materials.hotTopics, result.meta.live);
  // 显示追问区
  $('#askBlock').hidden = false;
  $('#askAnswers').innerHTML = '';
  $('#askInput').value = '';
  $('#results').hidden = false;
  // 保存到历史记录
  saveToHistory(state.currentTopic, result);
  // 更新收藏按钮状态
  updateFavoriteBtn();
  setTimeout(() => {
    scrollToSection('#results');
    setupScrollEffects();
  }, 120);
}

function updateFavoriteBtn() {
  const btn = $('#favoriteBtn');
  if (!btn) return;
  if (state.favorites[state.currentTopic]) {
    btn.classList.add('active');
    btn.textContent = '⭐ 已收藏';
  } else {
    btn.classList.remove('active');
    btn.textContent = '⭐ 收藏';
  }
}

function renderMeta(r) {
  const m = r.meta;
  const bar = $('#metaBar');
  bar.innerHTML = '';
  bar.appendChild(el('span', 'meta-topic', `「${esc(m.topic)}」入门指南`));
  bar.appendChild(el('span', 'meta-chip', esc(m.scenarioName)));
  bar.appendChild(el('span', `meta-chip ${m.live ? 'live' : 'demo'}`, m.live ? '实时模式' : '演示模式'));
  const time = el('span', 'meta-time', `用时 ${m.elapsedMs >= 1000 ? (m.elapsedMs / 1000).toFixed(1) + 's' : m.elapsedMs + 'ms'} · 三个 Agent 协作完成`);
  bar.appendChild(time);
  $('#sourceHint').textContent = m.live ? '来自知乎搜索与全网搜索的实时结果' : '来自知乎黑客松知识内容接口（真实内容）';
  $('#hotHint').textContent = m.live ? '来自知乎实时热榜 · 点击任一话题即可为你引路' : '演示模式 · 内置精选话题 · 点击任一话题即可为你引路';
}

function renderTimePlan(r) {
  const box = $('#timePlanBox');
  box.innerHTML = '';
  const tp = r.studyPlan.timePlan;
  if (tp) box.appendChild(el('div', 'timeplan-box', `<strong>🗓️ 整体规划：</strong>${esc(tp)}`));
}

function renderTimeline(stages) {
  const box = $('#timeline');
  box.innerHTML = '';
  const savedKey = `zhiyu_progress_${state.currentTopic || ''}`;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(savedKey) || '{}'); } catch { saved = {}; }

  (stages || []).forEach((s) => {
    const card = el('div', 'timeline-stage-3d stage-card reveal');
    card.setAttribute('data-order', s.order);
    // 进度指示条
    const indicator = el('div', 'stage-progress-indicator');
    indicator.style.width = saved[s.order] ? '100%' : '0%';
    card.appendChild(indicator);
    card.appendChild(el('div', 'stage-num', String(s.order)));

    const head = el('div', 'stage-head');
    head.appendChild(el('h4', '', esc(s.title)));
    if (s.timeHint) head.appendChild(el('span', 'stage-timehint', `建议用时 ${esc(s.timeHint)}`));
    const check = el('label', 'stage-check');
    const cb = el('input');
    cb.type = 'checkbox';
    cb.checked = !!saved[s.order];
    if (cb.checked) card.classList.add('done');
    cb.addEventListener('change', () => {
      saved[s.order] = cb.checked;
      card.classList.toggle('done', cb.checked);
      indicator.style.width = cb.checked ? '100%' : '0%';
      try { localStorage.setItem(savedKey, JSON.stringify(saved)); } catch { /* ignore */ }
      updateStageProgress(stages);
    });
    check.appendChild(cb);
    check.appendChild(document.createTextNode('已完成'));
    head.appendChild(check);
    card.appendChild(head);

    const goal = el('div', 'stage-goal', esc(s.goal));
    card.appendChild(goal);

    const ul = el('ul', 'stage-actions');
    (s.actions || []).forEach((a) => ul.appendChild(el('li', '', esc(a))));
    card.appendChild(ul);

    if (s.skills && s.skills.length) {
      const skills = el('div', 'stage-skills');
      s.skills.forEach((sk) => skills.appendChild(el('span', 'skill-tag', esc(sk))));
      card.appendChild(skills);
    }

    // 展开细节：避坑 / 里程碑
    const detail = el('div', 'stage-detail');
    if (s.pitfalls && s.pitfalls.length) {
      const pit = el('div', 'detail-row pitfall');
      pit.innerHTML = `<span class="dt">⚠️ 常见坑：</span>${s.pitfalls.map(esc).join('；')}`;
      detail.appendChild(pit);
    }
    if (s.milestone) {
      detail.appendChild(el('div', 'detail-row milestone', `<span class="dt">🏁 里程碑（做到这步才算过）：</span>${esc(s.milestone)}`));
    }
    card.appendChild(detail);

    const toggle = el('button', 'stage-toggle', '展开「避坑 & 里程碑」▾');
    toggle.addEventListener('click', () => {
      card.classList.toggle('expanded');
      toggle.textContent = card.classList.contains('expanded') ? '收起细节 ▴' : '展开「避坑 & 里程碑」▾';
    });
    card.appendChild(toggle);

    box.appendChild(card);
  });
}

function updateStageProgress(stages) {
  const key = `zhiyu_progress_${state.currentTopic || ''}`;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key) || '{}'); } catch { saved = {}; }
  const done = (stages || []).filter((s) => saved[s.order]).length;
  const total = (stages || []).length;
  let badge = $('#stageProgressBadge');
  if (!badge) {
    badge = el('span', 'meta-chip meta-progress', '');
    badge.id = 'stageProgressBadge';
    $('#metaBar').appendChild(badge);
  }
  badge.textContent = `📈 学习进度 ${done}/${total}`;
  if (done === total && total > 0) badge.textContent = '🎉 全部完成！';

  // 更新总进度条
  const opFill = $('#opFill');
  const opPercent = $('#opPercent');
  const opStages = $('#opStages');
  if (opFill && opPercent) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    opFill.style.width = pct + '%';
    opPercent.textContent = pct + '%';
  }
  if (opStages) {
    opStages.innerHTML = '';
    (stages || []).forEach((s) => {
      const chip = el('div', `op-stage-chip${saved[s.order] ? ' done' : ''}`);
      chip.innerHTML = `<span class="dot"></span><span>${s.order}. ${esc(s.title)}</span>`;
      opStages.appendChild(chip);
    });
  }
}

function renderConcepts(concepts) {
  const box = $('#conceptGrid');
  box.innerHTML = '';
  (concepts || []).forEach((c) => {
    const card = el('div', 'concept-card tilt reveal', `<h5>${esc(c.name)}</h5><p>${esc(c.explanation)}</p>`);
    if (c.example) card.appendChild(el('div', 'concept-example', `💡 ${esc(c.example)}`));
    card.addEventListener('click', () => card.classList.toggle('open'));
    box.appendChild(card);
  });
}

function renderDebates(cmp) {
  const box = $('#debateList');
  const consBox = $('#consensusBox');
  const aiBox = $('#aiSummaryBox');
  box.innerHTML = '';
  consBox.innerHTML = '';
  aiBox.innerHTML = '';

  if (cmp.aiSummary) {
    aiBox.appendChild(el('div', 'ai-summary', `<strong>🤖 直答综述（基于知乎优质内容）</strong>\n${esc(cmp.aiSummary)}`));
  }

  const debates = cmp.debates || [];
  debates.forEach((d, idx) => {
    const card = el('div', 'debate-card reveal');
    card.appendChild(el('div', 'debate-question', esc(d.question)));
    const views = el('div', 'debate-views');
    (d.views || []).forEach((v, vi) => {
      const col = el('div', `view-col ${vi % 2 === 0 ? 'a' : 'b'}`);
      col.appendChild(el('div', 'view-stance', esc(v.stance)));
      col.appendChild(el('div', 'view-label', esc(v.label)));
      const ul = el('ul');
      (v.points || []).forEach((p) => ul.appendChild(el('li', '', esc(p))));
      col.appendChild(ul);
      if (v.source) col.appendChild(el('div', 'view-source', `来源：${esc(v.source)}`));
      views.appendChild(col);
    });
    card.appendChild(views);
    if (d.consensus) {
      card.appendChild(el('div', 'debate-consensus', `<strong>🤝 共识：</strong>${esc(d.consensus)}`));
    }
    if (d.guidance) {
      card.appendChild(el('div', 'debate-guidance', `<strong>🧭 引路人建议：</strong>${esc(d.guidance)}`));
    }
    box.appendChild(card);
  });

  if (!debates.length) {
    box.appendChild(el('div', 'source-card', '<h5>暂无内置讨论素材</h5><p>这个话题比较小众；配置实时模式后，将由直答基于知乎搜索内容生成观点对照。</p>'));
  }

  const consensus = cmp.consensus || [];
  if (consensus.length) {
    consBox.appendChild(el('h4', '', '📌 来自知乎知识内容的共识观点'));
    consensus.forEach((c) => {
      const item = el('div', 'consensus-item');
      item.appendChild(el('span', '', esc(c.point)));
      item.appendChild(el('span', 'consensus-source', `—— ${esc(c.source.title)}`));
      consBox.appendChild(item);
    });
  }
}

function renderSources(sources, live) {
  const box = $('#sourceList');
  box.innerHTML = '';
  if (!sources || !sources.length) {
    box.appendChild(el('div', 'source-card', '<h5>暂无匹配资料</h5><p>配置 Access Secret 后，这里将展示知乎搜索与全网搜索的实时结果。</p>'));
    return;
  }
  sources.forEach((s) => {
    const card = el('div', 'source-card tilt reveal');
    const kindMap = { '知乎知识内容': ['kind-knowledge', '知乎知识'], '知乎问答': ['kind-zhihu', '知乎问答'], '全网来源': ['kind-web', '全网来源'] };
    const [cls, label] = kindMap[s.kind] || ['kind-web', s.kind];
    card.appendChild(el('span', `source-kind ${cls}`, esc(label)));
    card.appendChild(el('h5', '', esc(s.title)));
    card.appendChild(el('p', '', esc(s.desc)));
    if (s.note) card.appendChild(el('div', 'source-note', esc(s.note)));
    if (s.workId) {
      card.appendChild(el('div', 'source-note', '点击阅读全文'));
      card.addEventListener('click', () => openReader(s.workId, s.title));
    } else if (s.url) {
      const a = el('a', 'source-link', '查看原文 ↗');
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      card.appendChild(a);
    }
    box.appendChild(card);
  });
}

/* ---------- 复习卡片（增强版） ---------- */
function renderFlashcards(cards) {
  state.flashcards = cards || [];
  state.fcIndex = 0;
  state.fcMastered = {};
  $('#flashcard').classList.remove('flipped');
  $('#flashcard').classList.remove('mastered-card');
  showCard();
  updateFcProgress();
}

const FC_TYPE_COLOR = { 概念卡: 'primary', 行动卡: 'accent', 避坑卡: 'danger', 决策卡: 'good' };

function showCard() {
  const list = state.flashcards;
  const card = $('#flashcard');
  if (!list.length) {
    $('#flashcard').style.display = 'none';
    $('#fcCount').textContent = '0 / 0';
    return;
  }
  $('#flashcard').style.display = '';
  const fc = list[state.fcIndex];
  card.querySelector('.flashcard-front .fc-tag').textContent = fc.type;
  card.querySelector('.flashcard-front .fc-tag').style.background = 'rgba(255,255,255,0.22)';
  card.querySelector('.flashcard-front .fc-text').textContent = fc.front;
  card.querySelector('.flashcard-back .fc-tag').textContent = '答案';
  card.querySelector('.flashcard-back .fc-text').textContent = fc.back;
  $('#fcCount').textContent = `${state.fcIndex + 1} / ${list.length}`;
  // 更新已掌握状态样式
  if (state.fcMastered[state.fcIndex]) {
    card.classList.add('mastered-card');
  } else {
    card.classList.remove('mastered-card');
  }
}

function flipCard(step) {
  const list = state.flashcards;
  if (!list.length) return;
  state.fcIndex = (state.fcIndex + step + list.length) % list.length;
  $('#flashcard').classList.remove('flipped');
  showCard();
}

function markCardMastered(mastered) {
  const list = state.flashcards;
  if (!list.length) return;
  if (mastered) {
    state.fcMastered[state.fcIndex] = true;
    $('#flashcard').classList.add('mastered-card');
    showToolHint('已标记为掌握，自动跳到下一张');
    // 自动跳到下一张
    setTimeout(() => flipCard(1), 400);
  } else {
    delete state.fcMastered[state.fcIndex];
    $('#flashcard').classList.remove('mastered-card');
    showToolHint('已标记为需复习');
  }
  updateFcProgress();
}

function updateFcProgress() {
  const total = state.flashcards.length;
  const mastered = Object.keys(state.fcMastered).length;
  const el = $('#fcProgress');
  if (el) {
    el.textContent = `已掌握 ${mastered}/${total}`;
    if (mastered === total && total > 0) {
      el.textContent = `🎉 全部掌握！${mastered}/${total}`;
      el.style.color = '#16a34a';
    } else {
      el.style.color = '';
    }
  }
}

/* ---------- 导出 Markdown ---------- */
function generateMarkdown() {
  const r = state.currentResult;
  if (!r) return '';
  const m = r.meta;
  const sp = r.studyPlan;
  const cmp = r.comparison;
  const mat = r.materials;

  let md = `# 「${m.topic}」入门指南 · 知遇 ZhiYu\n\n`;
  md += `> 由三个 AI Agent 协作完成 · ${m.scenarioName} · ${m.live ? '实时模式（知乎开放平台）' : '演示模式'}\n\n`;
  md += `---\n\n`;

  // 整体规划
  if (sp.timePlan) {
    md += `## 🗓️ 整体规划\n\n${sp.timePlan}\n\n`;
  }

  // 学习路径
  md += `## 🗺️ 学习路径\n\n`;
  (sp.stages || []).forEach((s) => {
    md += `### 阶段 ${s.order}：${s.title}\n\n`;
    md += `- **目标**：${s.goal}\n`;
    if (s.timeHint) md += `- **建议用时**：${s.timeHint}\n`;
    md += `\n**行动清单**：\n\n`;
    (s.actions || []).forEach((a) => { md += `- ${a}\n`; });
    if (s.skills && s.skills.length) {
      md += `\n**技能标签**：${s.skills.join('、')}\n`;
    }
    if (s.pitfalls && s.pitfalls.length) {
      md += `\n**⚠️ 常见坑**：${s.pitfalls.join('；')}\n`;
    }
    if (s.milestone) {
      md += `\n**🏁 里程碑**：${s.milestone}\n`;
    }
    md += `\n`;
  });

  // 核心概念
  if (sp.concepts && sp.concepts.length) {
    md += `## 💡 核心概念\n\n`;
    sp.concepts.forEach((c) => {
      md += `### ${c.name}\n\n${c.explanation}\n\n`;
      if (c.example) md += `> 💡 ${c.example}\n\n`;
    });
  }

  // 观点对照
  if (cmp.debates && cmp.debates.length) {
    md += `## ⚖️ 观点对照\n\n`;
    if (cmp.aiSummary) {
      md += `> 🤖 **直答综述**：${cmp.aiSummary}\n\n`;
    }
    cmp.debates.forEach((d) => {
      md += `### ${d.question}\n\n`;
      (d.views || []).forEach((v) => {
        md += `**${v.stance}（${v.label}）**\n\n`;
        (v.points || []).forEach((p) => { md += `- ${p}\n`; });
        if (v.source) md += `\n*来源：${v.source}*\n`;
        md += `\n`;
      });
      if (d.consensus) md += `**🤝 共识**：${d.consensus}\n\n`;
      if (d.guidance) md += `**🧭 引路人建议**：${d.guidance}\n\n`;
    });
  }

  // 精选资料
  if (mat.sources && mat.sources.length) {
    md += `## 📚 精选资料\n\n`;
    mat.sources.forEach((s, i) => {
      md += `${i + 1}. **${s.title}**（${s.kind}）\n   ${s.desc}\n`;
      if (s.url) md += `   ${s.url}\n`;
      md += `\n`;
    });
  }

  // 复习卡片
  if (sp.flashcards && sp.flashcards.length) {
    md += `## 🃏 复习卡片（共 ${sp.flashcards.length} 张）\n\n`;
    sp.flashcards.forEach((f, i) => {
      md += `### 卡片 ${i + 1}（${f.type}）\n\n`;
      md += `**问**：${f.front}\n\n`;
      md += `**答**：${f.back}\n\n`;
    });
  }

  md += `---\n\n*由知遇 ZhiYu 生成 · 知乎黑客松 2026 · 队伍「邂逅」*\n`;
  return md;
}

function exportMarkdown() {
  const md = generateMarkdown();
  const textarea = $('#exportTextarea');
  if (textarea) textarea.value = md;
  const modal = $('#exportModal');
  if (modal) {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }
}

function closeExportModal() {
  const modal = $('#exportModal');
  if (modal) {
    modal.hidden = true;
    document.body.style.overflow = '';
  }
}

function copyMarkdownToClipboard() {
  const md = generateMarkdown();
  copyToClipboard(md);
  showToolHint('已复制完整内容到剪贴板');
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

function downloadMarkdown() {
  const md = generateMarkdown();
  const topic = (state.currentTopic || 'zhiyu').replace(/[\\/:*?"<>|]/g, '_');
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${topic}-知遇学习指南.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToolHint('已下载 Markdown 文件');
}

/* ---------- 热点（可点击引路 + 身份定位过滤） ---------- */
function renderHot(hotList, live) {
  const box = $('#hotList');
  box.innerHTML = '';
  const audience = state.currentAudience;
  const filtered = (hotList || []).filter((h) => {
    if (audience === 'all') return true;
    return h.audience === audience || h.audience === 'both' || !h.audience;
  });
  if (!filtered.length) {
    box.appendChild(el('div', 'hot-empty', '该身份下暂无相关热点，切换其他身份看看～'));
    return;
  }
  filtered.forEach((h) => {
    const item = el('div', 'hot-item reveal');
    item.appendChild(el('div', 'hot-rank', String(h.rank)));
    const main = el('div', '');
    main.appendChild(el('div', 'hot-title', esc(h.title)));
    const meta = el('div', 'hot-meta');
    if (h.heat) meta.appendChild(el('span', '', esc(h.heat)));
    if (h.type) meta.appendChild(el('span', 'hot-tag', esc(h.type)));
    if (h.tag) meta.appendChild(el('span', 'hot-tag', esc(h.tag)));
    if (h.audience && h.audience !== 'both') {
      meta.appendChild(el('span', `hot-tag hot-audience ${h.audience}`, h.audience === 'student' ? '学生向' : '职场向'));
    }
    main.appendChild(meta);
    item.appendChild(main);
    item.appendChild(el('span', 'hot-go', '引路 →'));
    item.addEventListener('click', () => {
      const topic = (h.title || '').replace(/[？?！!。]$/g, '').trim();
      if (topic) {
        $('#topicInput').value = topic;
        startGuide(topic);
      }
    });
    box.appendChild(item);
  });
}

/* ---------- 知识阅读弹窗 ---------- */
async function openReader(workId, title) {
  $('#modalTitle').textContent = title || '知乎知识内容';
  $('#modalBody').innerHTML = '<p style="color:var(--text-3)">加载中…</p>';
  $('#readerModal').hidden = false;
  document.body.style.overflow = 'hidden';
  try {
    const resp = await fetch(`/api/knowledge/${encodeURIComponent(workId)}`);
    const data = await resp.json();
    if (!resp.ok || !data.ok) throw new Error(data.message || '加载失败');
    const d = data.data || {};
    const body = $('#modalBody');
    body.innerHTML = '';
    const author = el('div', 'author-line', `${esc(d.author_name || '知乎知识内容')}${d.labels && d.labels.length ? ' · ' + d.labels.map(esc).join(' / ') : ''}`);
    body.appendChild(author);
    body.appendChild(el('p', '', esc(d.content || d.introduction || '（无正文）')));
  } catch (err) {
    $('#modalBody').innerHTML = `<p style="color:#d46b08">加载失败：${esc(err.message)}</p>`;
  }
}

function closeReader() {
  $('#readerModal').hidden = true;
  document.body.style.overflow = '';
}

/* ---------- Agent 详情弹窗 ---------- */
function openAgentDetail(agentId) {
  const r = state.currentResult;
  if (!r) return;
  const titles = { collector: '🔍 资料收集官 · 详细产出', comparator: '⚖️ 观点对照官 · 详细产出', curator: '🧠 知识梳理官 · 详细产出' };
  $('#agentModalTitle').textContent = titles[agentId] || 'Agent 详情';
  const body = $('#agentModalBody');
  body.innerHTML = '';

  if (agentId === 'collector') {
    const m = r.materials;
    body.appendChild(el('div', 'agent-detail-section', `<h4>📊 收集概览</h4>`));
    const stats = el('div', 'agent-stats');
    stats.innerHTML = `
      <div class="agent-stat"><span class="num">${(m.sources || []).length}</span><span class="label">份资料</span></div>
      <div class="agent-stat"><span class="num">${(m.matchedKnowledge || []).length}</span><span class="label">篇知乎知识</span></div>
      <div class="agent-stat"><span class="num">${(m.hotTopics || []).length}</span><span class="label">条相关热点</span></div>
    `;
    body.appendChild(stats);

    if (m.sources && m.sources.length) {
      body.appendChild(el('div', 'agent-detail-section', '<h4>📚 资料清单</h4>'));
      const list = el('div', 'agent-source-list');
      m.sources.forEach((s) => {
        const item = el('div', 'agent-source-item');
        item.innerHTML = `<div class="agent-source-kind">${esc(s.kind)}</div><div class="agent-source-title">${esc(s.title)}</div><div class="agent-source-desc">${esc(s.desc || '')}</div>`;
        list.appendChild(item);
      });
      body.appendChild(list);
    }

    if (m.hotTopics && m.hotTopics.length) {
      body.appendChild(el('div', 'agent-detail-section', '<h4>🔥 相关热点</h4>'));
      const hotList = el('div', 'agent-hot-list');
      m.hotTopics.forEach((h) => {
        hotList.appendChild(el('div', 'agent-hot-item', `<span class="rank">${h.rank}</span> ${esc(h.title)} <span class="heat">${esc(h.heat || '')}</span>`));
      });
      body.appendChild(hotList);
    }
  }

  if (agentId === 'comparator') {
    const c = r.comparison;
    body.appendChild(el('div', 'agent-detail-section', `<h4>📊 对照概览</h4>`));
    const stats = el('div', 'agent-stats');
    stats.innerHTML = `
      <div class="agent-stat"><span class="num">${(c.debates || []).length}</span><span class="label">组核心讨论</span></div>
      <div class="agent-stat"><span class="num">${(c.consensus || []).length}</span><span class="label">条共识观点</span></div>
      <div class="agent-stat"><span class="num">${c.aiSummary ? '有' : '无'}</span><span class="label">直答综述</span></div>
    `;
    body.appendChild(stats);

    if (c.aiSummary) {
      body.appendChild(el('div', 'agent-detail-section', '<h4>🤖 直答综述</h4>'));
      body.appendChild(el('div', 'agent-ai-summary', esc(c.aiSummary)));
    }

    if (c.debates && c.debates.length) {
      body.appendChild(el('div', 'agent-detail-section', '<h4>⚖️ 讨论详情</h4>'));
      c.debates.forEach((d) => {
        const card = el('div', 'agent-debate-card');
        card.innerHTML = `<div class="agent-debate-q">${esc(d.question)}</div>`;
        const views = el('div', 'agent-debate-views');
        (d.views || []).forEach((v, vi) => {
          const col = el('div', `agent-view-col ${vi % 2 === 0 ? 'a' : 'b'}`);
          col.innerHTML = `<div class="agent-view-stance">${esc(v.stance)}</div><div class="agent-view-label">${esc(v.label)}</div>`;
          const ul = el('ul');
          (v.points || []).forEach((p) => ul.appendChild(el('li', '', esc(p))));
          col.appendChild(ul);
          views.appendChild(col);
        });
        card.appendChild(views);
        if (d.consensus) card.appendChild(el('div', 'agent-debate-consensus', `<strong>共识：</strong>${esc(d.consensus)}`));
        if (d.guidance) card.appendChild(el('div', 'agent-debate-guidance', `<strong>引路人建议：</strong>${esc(d.guidance)}`));
        body.appendChild(card);
      });
    }
  }

  if (agentId === 'curator') {
    const sp = r.studyPlan;
    body.appendChild(el('div', 'agent-detail-section', `<h4>📊 梳理概览</h4>`));
    const stats = el('div', 'agent-stats');
    const fcTypes = {};
    (sp.flashcards || []).forEach((f) => { fcTypes[f.type] = (fcTypes[f.type] || 0) + 1; });
    stats.innerHTML = `
      <div class="agent-stat"><span class="num">${(sp.stages || []).length}</span><span class="label">个学习阶段</span></div>
      <div class="agent-stat"><span class="num">${(sp.concepts || []).length}</span><span class="label">个核心概念</span></div>
      <div class="agent-stat"><span class="num">${(sp.flashcards || []).length}</span><span class="label">张复习卡片</span></div>
    `;
    body.appendChild(stats);

    if (sp.timePlan) {
      body.appendChild(el('div', 'agent-detail-section', '<h4>🗓️ 整体时间规划</h4>'));
      body.appendChild(el('div', 'agent-timeplan', esc(sp.timePlan)));
    }

    body.appendChild(el('div', 'agent-detail-section', '<h4>🗺️ 学习阶段</h4>'));
    (sp.stages || []).forEach((s) => {
      const stage = el('div', 'agent-stage-item');
      stage.innerHTML = `<div class="agent-stage-head"><span class="agent-stage-num">${s.order}</span> <strong>${esc(s.title)}</strong> <span class="agent-stage-time">${esc(s.timeHint || '')}</span></div>`;
      stage.appendChild(el('div', 'agent-stage-goal', esc(s.goal || '')));
      const ul = el('ul');
      (s.actions || []).forEach((a) => ul.appendChild(el('li', '', esc(a))));
      stage.appendChild(ul);
      if (s.pitfalls && s.pitfalls.length) stage.appendChild(el('div', 'agent-stage-pitfall', `⚠️ 避坑：${s.pitfalls.map(esc).join('；')}`));
      if (s.milestone) stage.appendChild(el('div', 'agent-stage-milestone', `🏁 里程碑：${esc(s.milestone)}`));
      body.appendChild(stage);
    });

    body.appendChild(el('div', 'agent-detail-section', '<h4>🃏 复习卡片构成</h4>'));
    const fcList = el('div', 'agent-fc-types');
    Object.entries(fcTypes).forEach(([type, count]) => {
      fcList.appendChild(el('span', 'agent-fc-tag', `${type} × ${count}`));
    });
    body.appendChild(fcList);
  }

  $('#agentModal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeAgentModal() {
  $('#agentModal').hidden = true;
  document.body.style.overflow = '';
}

/* ---------- AI 追问 ---------- */
function submitAsk() {
  const input = $('#askInput');
  const question = input.value.trim();
  if (!question) return;
  if (!state.currentTopic) return;

  const btn = $('#askBtn');
  btn.disabled = true;
  btn.textContent = '思考中…';
  input.value = '';

  const answersBox = $('#askAnswers');
  const loading = el('div', 'ask-loading', '引路人正在思考…');
  answersBox.appendChild(loading);
  loading.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  const context = {
    stages: state.currentResult?.studyPlan?.stages?.map((s) => ({ title: s.title })) || [],
    concepts: state.currentResult?.studyPlan?.concepts?.map((c) => ({ name: c.name })) || [],
    debates: state.currentResult?.comparison?.debates?.map((d) => ({ topic: d.topic })) || [],
  };

  fetch('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: state.currentTopic, question, context }),
  })
    .then((r) => r.json())
    .then((d) => {
      loading.remove();
      btn.disabled = false;
      btn.textContent = '提问';
      if (!d.ok) throw new Error(d.message || '提问失败');
      // 用户消息气泡（右侧）
      const userMsg = el('div', 'chat-msg user-msg');
      userMsg.innerHTML = `<div class="chat-bubble user-bubble">${esc(question)}</div>`;
      answersBox.appendChild(userMsg);
      // AI回答气泡（左侧）
      const aiMsg = el('div', 'chat-msg ai-msg');
      const avatar = el('div', 'chat-avatar', '🦊');
      const bubble = el('div', 'chat-bubble ai-bubble');
      bubble.innerHTML = renderMarkdown(d.data.answer);
      aiMsg.appendChild(avatar);
      aiMsg.appendChild(bubble);
      answersBox.appendChild(aiMsg);
      aiMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    })
    .catch((err) => {
      loading.remove();
      btn.disabled = false;
      btn.textContent = '提问';
      // 用户消息
      const userMsg = el('div', 'chat-msg user-msg');
      userMsg.innerHTML = `<div class="chat-bubble user-bubble">${esc(question)}</div>`;
      answersBox.appendChild(userMsg);
      // AI错误消息
      const aiMsg = el('div', 'chat-msg ai-msg');
      const avatar = el('div', 'chat-avatar', '🦊');
      const bubble = el('div', 'chat-bubble ai-bubble error-bubble');
      bubble.innerHTML = `提问失败：${esc(err.message)}`;
      aiMsg.appendChild(avatar);
      aiMsg.appendChild(bubble);
      answersBox.appendChild(aiMsg);
    });
}

/* 极简 markdown 渲染（只处理段落、列表、加粗、换行） */
function renderMarkdown(text) {
  if (!text) return '';
  let html = esc(text);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m.replace(/\n/g, '')}</ul>`);
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/\n{2,}/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  return `<p>${html}</p>`;
}

/* ---------- 深色模式 ---------- */
function initTheme() {
  let saved = 'light';
  try { saved = localStorage.getItem('zhiyu_theme') || 'light'; } catch { saved = 'light'; }
  if (saved === 'dark') {
    document.body.classList.add('dark-mode');
    updateThemeButton(true);
  } else {
    updateThemeButton(false);
  }
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode');
  try { localStorage.setItem('zhiyu_theme', isDark ? 'dark' : 'light'); } catch { /* ignore */ }
  updateThemeButton(isDark);
}

function updateThemeButton(isDark) {
  const btn = $('#themeToggle');
  if (btn) btn.textContent = isDark ? '☀️ 浅色' : '🌙 深色';
}

function closeAgentInfoModal() {
  const modal = $('#agentInfoModal');
  if (modal) {
    modal.hidden = true;
    document.body.style.overflow = '';
  }
}

/* ---------- 顶部刘看山GIF图标随机动画 ---------- */
function initMascotAnimation() {
  const mascot = document.querySelector('.brand-mascot');
  if (!mascot) return;

  const animations = ['anim-swing', 'anim-bounce', 'anim-spin', 'anim-pulse', 'anim-tilt3d', 'anim-wink'];
  const messages = [
    '你好呀！我是刘看山 🦊',
    '欢迎来到知遇！',
    '点击我试试？',
    '今天想学点什么？',
    '知遇，与新知相遇 ✨',
    '我会随机做动作哦～',
    '拖拽下方3D模型可以旋转我！',
  ];

  // 随机触发动画
  function randomAnimate() {
    const anim = animations[Math.floor(Math.random() * animations.length)];
    mascot.classList.remove(...animations);
    void mascot.offsetWidth; // 强制重排以重启动画
    mascot.classList.add(anim);
    setTimeout(() => mascot.classList.remove(anim), 1000);
  }

  // 每3-6秒随机触发一次
  function scheduleNext() {
    const delay = 3000 + Math.random() * 3000;
    setTimeout(() => {
      randomAnimate();
      scheduleNext();
    }, delay);
  }
  scheduleNext();

  // 点击时触发随机动画 + 显示提示
  let tooltip = null;
  mascot.addEventListener('click', (e) => {
    e.preventDefault();
    randomAnimate();
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'brand-mascot-tooltip';
      document.querySelector('.brand').style.position = 'relative';
      document.querySelector('.brand').appendChild(tooltip);
    }
    tooltip.textContent = messages[Math.floor(Math.random() * messages.length)];
    tooltip.classList.add('show');
    setTimeout(() => tooltip.classList.remove('show'), 2000);
  });

  // 鼠标悬停时轻微3D倾斜
  mascot.addEventListener('mousemove', (e) => {
    const rect = mascot.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mascot.style.transform = `rotateY(${x * 25}deg) rotateX(${-y * 25}deg) scale(1.1)`;
  });
  mascot.addEventListener('mouseleave', () => {
    mascot.style.transform = '';
  });
}

/* ---------- 分享图生成 ---------- */
function generateShareImage() {
  const r = state.currentResult;
  if (!r) return;
  const canvas = $('#shareCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 800, H = 1000;

  // 背景渐变
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#1e1b4b');
  bgGrad.addColorStop(0.5, '#312e81');
  bgGrad.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // 装饰圆圈
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#818cf8';
  ctx.beginPath();
  ctx.arc(100, 100, 150, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(700, 900, 200, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 顶部标签
  ctx.fillStyle = 'rgba(129,140,248,0.2)';
  roundRect(ctx, 60, 60, 200, 40, 20);
  ctx.fill();
  ctx.fillStyle = '#a5b4fc';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('知遇 ZhiYu · AI 引路', 160, 86);

  // 主标题
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'left';
  const title = `「${r.meta.topic}」`;
  ctx.fillText(title, 60, 170);
  ctx.fillStyle = '#c7d2fe';
  ctx.font = '24px sans-serif';
  ctx.fillText('入门学习指南', 60, 215);

  // 分割线
  ctx.strokeStyle = 'rgba(129,140,248,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 250);
  ctx.lineTo(740, 250);
  ctx.stroke();

  // 数据统计卡片
  const stages = (r.studyPlan?.stages || []).length;
  const concepts = (r.studyPlan?.concepts || []).length;
  const cards = (r.studyPlan?.flashcards || []).length;
  const stats = [
    { num: stages, label: '学习阶段', icon: '🗺️' },
    { num: concepts, label: '核心概念', icon: '💡' },
    { num: cards, label: '复习卡片', icon: '🃏' },
  ];
  stats.forEach((s, i) => {
    const x = 60 + i * 240;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, x, 280, 220, 120, 16);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.num, x + 110, 335);
    ctx.fillStyle = '#a5b4fc';
    ctx.font = '16px sans-serif';
    ctx.fillText(`${s.icon} ${s.label}`, x + 110, 370);
  });

  // 学习路径预览
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('📚 学习路径', 60, 450);

  const pathStages = (r.studyPlan?.stages || []).slice(0, 4);
  pathStages.forEach((s, i) => {
    const y = 490 + i * 70;
    // 序号圆
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.arc(85, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.order, 85, y + 6);
    // 标题
    ctx.fillStyle = '#e0e7ff';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    const titleText = s.title.length > 25 ? s.title.substring(0, 25) + '...' : s.title;
    ctx.fillText(titleText, 125, y + 6);
    // 连接线
    if (i < pathStages.length - 1) {
      ctx.strokeStyle = 'rgba(99,102,241,0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(85, y + 25);
      ctx.lineTo(85, y + 50);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });

  // 底部信息
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  roundRect(ctx, 60, 880, 680, 80, 16);
  ctx.fill();
  ctx.fillStyle = '#a5b4fc';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('由三个 AI Agent 协作完成 · 资料整理 → 观点对照 → 知识梳理', 400, 915);
  ctx.fillStyle = '#6366f1';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('知乎黑客松 2026 · 队伍「邂逅」 · 知遇 ZhiYu', 400, 945);

  // 显示弹窗
  const modal = $('#shareModal');
  if (modal) {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function closeShareModal() {
  const modal = $('#shareModal');
  if (modal) {
    modal.hidden = true;
    document.body.style.overflow = '';
  }
}

function downloadShareImage() {
  const canvas = $('#shareCanvas');
  if (!canvas) return;
  const topic = (state.currentTopic || 'zhiyu').replace(/[\\/:*?"<>|]/g, '_');
  const link = document.createElement('a');
  link.download = `${topic}-知遇分享图.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToolHint('分享图已下载');
}

/* ---------- 启动 ---------- */
document.addEventListener('DOMContentLoaded', init);
