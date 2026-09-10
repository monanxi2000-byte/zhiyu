'use strict';

/**
 * 知遇 (ZhiYu) —— 基于知乎知识生态的 AI 新人引路助手
 * 知乎黑客松 2026 · 校园新锐季 · 队伍「邂逅」
 *
 * 技术方案：Node.js + Express
 *  · 后端持有开放平台凭证（环境变量 ZHIHU_ACCESS_SECRET），绝不进入前端
 *  · 多 Agent 流水线通过 SSE 向前端推送进度
 *  · 所有知乎开放能力调用均带应用层缓存，遵守额度限制
 */

/* ---------- 加载 .env（必须在所有 require 之前，因为子模块会在加载时读取环境变量） ---------- */
const path = require('path');
const fs = require('fs');
(function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
})();

const express = require('express');
const zhihu = require('./lib/zhihuClient');
const knowledgeApi = require('./agents/knowledgeApi');
const { runPipeline } = require('./agents/orchestrator');
const { generateGuide, askFollowup } = require('./agents/llmGuide');
const llm = require('./lib/llmClient');
const { getAllScenarios, matchScenario } = require('./data/scenarios');
const { DEMO_HOT } = require('./data/hotTopics');
const { version, name } = require('./package.json');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

/* ---------- 基础限流（演示级，防止误刷） ---------- */
const rateBuckets = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const bucket = rateBuckets.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  if (bucket.count > max) {
    const err = new Error('请求过于频繁，请稍后再试');
    err.code = 'RATE_LIMITED';
    err.status = 429;
    throw err;
  }
}

/* ---------- 工具函数 ---------- */
function sendError(res, err, status = 500) {
  const body = {
    ok: false,
    code: err.code || 'INTERNAL',
    message: err.message || '服务器开小差了',
  };
  if (err.actionUrl) body.actionUrl = err.actionUrl;
  res.status(err.status || status).json(body);
}

function validateTopic(topic) {
  if (typeof topic !== 'string' || !topic.trim()) {
    const err = new Error('请先告诉我你想进入什么领域');
    err.code = 'EMPTY_TOPIC';
    err.status = 400;
    throw err;
  }
  const t = topic.trim();
  if (t.length > 50) {
    const err = new Error('领域描述太长了，请控制在 50 字以内');
    err.code = 'TOPIC_TOO_LONG';
    err.status = 400;
    throw err;
  }
  return t;
}

/* ---------- 静态资源 ---------- */
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- API：健康检查 ---------- */
app.get('/api/health', async (req, res) => {
  try {
    const live = await zhihu.isLive();
    let quota = null;
    if (live) {
      try {
        quota = await zhihu.quota();
      } catch {
        quota = null;
      }
    }
    res.json({
      ok: true,
      app: { name, version },
      mode: live ? 'live' : 'demo',
      zhihuAvailable: live,
      llmAvailable: llm.isAvailable(),
      llmModel: llm.DEFAULT_MODEL,
      quota,
    });
  } catch (err) {
    sendError(res, err);
  }
});

/* ---------- API：场景列表 ---------- */
app.get('/api/scenarios', (req, res) => {
  res.json({ ok: true, data: getAllScenarios() });
});

/* ---------- API：场景匹配（前端做联想提示用） ---------- */
app.get('/api/match', (req, res) => {
  try {
    const topic = validateTopic(req.query.topic || '');
    const sc = matchScenario(topic);
    res.json({ ok: true, data: sc ? { id: sc.id, name: sc.name, emoji: sc.emoji, tagline: sc.tagline } : null });
  } catch (err) {
    sendError(res, err, 400);
  }
});

/* ---------- API：知乎知识内容（无鉴权真实接口，带缓存） ---------- */
app.get('/api/knowledge/list', async (req, res) => {
  try {
    rateLimit(req.ip, 60, 60 * 1000);
    const data = await knowledgeApi.listKnowledge();
    res.json({ ok: true, data });
  } catch (err) {
    sendError(res, err);
  }
});

app.get('/api/knowledge/:id', async (req, res) => {
  try {
    rateLimit(req.ip, 60, 60 * 1000);
    const data = await knowledgeApi.knowledgeDetail(req.params.id);
    res.json({ ok: true, data });
  } catch (err) {
    sendError(res, err, err.status || 400);
  }
});

/* ---------- API：热榜（实时或演示） ---------- */
app.get('/api/hot', async (req, res) => {
  try {
    rateLimit(req.ip, 30, 60 * 1000);
    const live = await zhihu.isLive();
    if (live) {
      const items = await zhihu.hot(20);
      res.json({
        ok: true,
        mode: 'live',
        data: items.slice(0, 8).map((h, idx) => ({
          rank: idx + 1,
          title: h.Title || h.title || h.question_title || '',
          heat: h.HeatScore || h.heat_score || h.hot_value || '',
          type: h.Type || h.type || '热点',
          tag: '实时',
        })),
      });
    } else {
      res.json({ ok: true, mode: 'demo', data: DEMO_HOT });
    }
  } catch (err) {
    sendError(res, err);
  }
});

/* ---------- API：多 Agent 流水线（普通 JSON） ---------- */
app.get('/api/guide', async (req, res) => {
  try {
    rateLimit(req.ip, 30, 60 * 60 * 1000);
    const topic = validateTopic(req.query.topic || '');
    const mode = req.query.mode === 'llm' ? 'llm' : 'template';
    const audience = req.query.audience || 'both';
    let result;
    if (mode === 'llm') {
      if (!llm.isAvailable()) {
        const err = new Error('LLM 未配置，请先设置 OPENAI_API_KEY');
        err.code = 'LLM_NOT_CONFIGURED';
        err.status = 503;
        throw err;
      }
      result = await generateGuide(topic, { audience });
    } else {
      result = await runPipeline(topic);
    }
    res.json({ ok: true, data: result });
  } catch (err) {
    sendError(res, err);
  }
});

/* ---------- API：多 Agent 流水线（SSE 流式进度） ---------- */
app.get('/api/guide/stream', async (req, res) => {
  try {
    rateLimit(req.ip, 30, 60 * 60 * 1000);
    const topic = validateTopic(req.query.topic || '');
    const mode = req.query.mode === 'llm' ? 'llm' : 'template';
    const audience = req.query.audience || 'both';

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let closed = false;
    req.on('close', () => {
      closed = true;
    });

    const emit = (type, agentId, stage, message) => {
      if (closed) return;
      res.write(`event: ${type}\n`);
      res.write(`data: ${JSON.stringify({ agent: agentId, stage, message })}\n\n`);
    };

    try {
      let result;
      if (mode === 'llm') {
        if (!llm.isAvailable()) {
          throw Object.assign(new Error('LLM 未配置'), { code: 'LLM_NOT_CONFIGURED' });
        }
        // LLM 模式：模拟三 Agent 进度推送，同时调用 LLM
        emit('system', null, 'start', `正在为「${topic}」生成 AI 定制学习路径（${llm.DEFAULT_MODEL}）…`);
        emit('log', 'collector', 'running', '资料收集官：正在检索领域资料与热点话题…');
        await new Promise(r => setTimeout(r, 600));
        emit('log', 'collector', 'done', '资料收集官：资料与热点已整理完成');
        emit('log', 'comparator', 'running', '观点对照官：正在分析领域内的核心分歧…');
        await new Promise(r => setTimeout(r, 600));
        emit('log', 'comparator', 'done', '观点对照官：分歧与共识已梳理完成');
        emit('log', 'curator', 'running', '知识梳理官：正在编织学习路径、概念与复习卡片…');
        // 实际 LLM 调用（在 curator 阶段等待），带进度回调
        result = await generateGuide(topic, {
          audience,
          onProgress: (msg) => emit('log', 'curator', 'running', msg),
        });
        emit('log', 'curator', 'done', '知识梳理官：学习路径已生成完成');
        emit('system', null, 'complete', 'AI 定制引路完成');
      } else {
        result = await runPipeline(topic, { emit });
      }
      if (!closed) {
        res.write(`event: result\n`);
        res.write(`data: ${JSON.stringify(result)}\n\n`);
        res.end();
      }
    } catch (err) {
      if (!closed) {
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ code: err.code || 'INTERNAL', message: err.message })}\n\n`);
        res.end();
      }
    }
  } catch (err) {
    sendError(res, err);
  }
});

/* ---------- API：追问（LLM 实时回答） ---------- */
app.post('/api/ask', async (req, res) => {
  try {
    rateLimit(req.ip, 60, 60 * 1000);
    const { topic, question, context } = req.body || {};
    if (!topic || !question) {
      const err = new Error('缺少 topic 或 question 参数');
      err.code = 'MISSING_PARAMS';
      err.status = 400;
      throw err;
    }
    if (!llm.isAvailable()) {
      const err = new Error('LLM 未配置');
      err.code = 'LLM_NOT_CONFIGURED';
      err.status = 503;
      throw err;
    }
    const answer = await askFollowup(topic, question, context || {});
    res.json({ ok: true, data: { answer } });
  } catch (err) {
    sendError(res, err);
  }
});

/* ---------- API：LLM 状态 ---------- */
app.get('/api/llm/status', (req, res) => {
  res.json({
    ok: true,
    available: llm.isAvailable(),
    model: llm.DEFAULT_MODEL,
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai-next.com/v1',
  });
});

/* ---------- 启动 ---------- */
app.listen(PORT, () => {
  console.log(`知遇 (ZhiYu) v${version} 已启动 → http://localhost:${PORT}`);
  console.log(`运行模式：${process.env.ZHIHU_ACCESS_SECRET ? '实时模式（已配置 Access Secret）' : '演示模式（未配置 Access Secret，将使用知乎知识内容接口）'}`);
});

module.exports = app;
