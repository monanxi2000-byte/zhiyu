/* ============================================================
   知遇 ZhiYu · 前端逻辑
   多 Agent 流水线（SSE 进度）+ 结果渲染
   ============================================================ */

'use strict';

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, html) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html !== undefined) node.innerHTML = html;
  return node;
};

const state = {
  mode: 'demo',
  flashcards: [],
  fcIndex: 0,
  currentResult: null,
};

/* ---------- 工具 ---------- */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ---------- 初始化 ---------- */
async function init() {
  await loadMode();
  await loadScenarios();
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
        document.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
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
  $('#flashcard').addEventListener('click', () => $('#flashcard').classList.toggle('flipped'));
  $('#modalClose').addEventListener('click', closeReader);
  $('#readerModal').addEventListener('click', (e) => {
    if (e.target.id === 'readerModal') closeReader();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeReader();
  });
}

/* ---------- 启动流水线 ---------- */
function startGuide(topic) {
  $('#results').hidden = true;
  $('#pipeline').hidden = false;
  $('#guideBtn').disabled = true;
  $('.btn-text').hidden = true;
  $('.btn-loading').hidden = false;
  $('#pipelineTitle').textContent = `正在为「${topic}」引路…`;

  resetPipeline();
  $('#pipelineLog').innerHTML = '';
  scrollToSection('#pipeline');

  const url = `/api/guide/stream?topic=${encodeURIComponent(topic)}`;
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
    // EventSource 在正常结束后会触发一次 error；若已收到 result 则忽略
    if (state.currentResult) return;
    es.close();
    pushLog('warn', '实时进度通道中断，正在切换为一次性请求…');
    // 降级：普通请求
    fetch(`/api/guide?topic=${encodeURIComponent(topic)}`)
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
  renderMeta(result);
  renderTimeline(result.studyPlan.stages);
  renderConcepts(result.studyPlan.concepts);
  renderDebates(result.comparison);
  renderSources(result.materials.sources, result.meta.live);
  renderFlashcards(result.studyPlan.flashcards);
  renderHot(result.materials.hotTopics, result.meta.live);
  $('#results').hidden = false;
  setTimeout(() => scrollToSection('#results'), 120);
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
  $('#hotHint').textContent = m.live ? '来自知乎实时热榜' : '演示模式 · 内置精选话题';
}

function renderTimeline(stages) {
  const box = $('#timeline');
  box.innerHTML = '';
  (stages || []).forEach((s) => {
    const card = el('div', 'timeline-stage');
    card.setAttribute('data-order', s.order);
    const h = el('h4', '', esc(s.title));
    const goal = el('div', 'stage-goal', esc(s.goal));
    card.appendChild(h);
    card.appendChild(goal);
    const ul = el('ul', 'stage-actions');
    (s.actions || []).forEach((a) => ul.appendChild(el('li', '', esc(a))));
    card.appendChild(ul);
    if (s.skills && s.skills.length) {
      const skills = el('div', 'stage-skills');
      s.skills.forEach((sk) => skills.appendChild(el('span', 'skill-tag', esc(sk))));
      card.appendChild(skills);
    }
    box.appendChild(card);
  });
}

function renderConcepts(concepts) {
  const box = $('#conceptGrid');
  box.innerHTML = '';
  (concepts || []).forEach((c) => {
    const card = el('div', 'concept-card', `<h5>${esc(c.name)}</h5><p>${esc(c.explanation)}</p>`);
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
    const card = el('div', 'debate-card');
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
    const card = el('div', 'source-card');
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

/* ---------- 复习卡片 ---------- */
function renderFlashcards(cards) {
  state.flashcards = cards || [];
  state.fcIndex = 0;
  $('#flashcard').classList.remove('flipped');
  showCard();
}

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
  card.querySelector('.flashcard-front .fc-text').textContent = fc.front;
  card.querySelector('.flashcard-back .fc-tag').textContent = '答案';
  card.querySelector('.flashcard-back .fc-text').textContent = fc.back;
  $('#fcCount').textContent = `${state.fcIndex + 1} / ${list.length}`;
}

function flipCard(step) {
  const list = state.flashcards;
  if (!list.length) return;
  state.fcIndex = (state.fcIndex + step + list.length) % list.length;
  $('#flashcard').classList.remove('flipped');
  showCard();
}

/* ---------- 热点 ---------- */
function renderHot(hotList, live) {
  const box = $('#hotList');
  box.innerHTML = '';
  (hotList || []).forEach((h) => {
    const item = el('div', 'hot-item');
    item.appendChild(el('div', 'hot-rank', String(h.rank)));
    const main = el('div', '');
    main.appendChild(el('div', 'hot-title', esc(h.title)));
    const meta = el('div', 'hot-meta');
    if (h.heat) meta.appendChild(el('span', '', esc(h.heat)));
    if (h.type) meta.appendChild(el('span', 'hot-tag', esc(h.type)));
    if (h.tag) meta.appendChild(el('span', 'hot-tag', esc(h.tag)));
    main.appendChild(meta);
    item.appendChild(main);
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

/* ---------- 启动 ---------- */
document.addEventListener('DOMContentLoaded', init);
