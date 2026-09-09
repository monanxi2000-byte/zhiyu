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

const path = require('path');
const express = require('express');
const zhihu = require('./lib/zhihuClient');
const knowledgeApi = require('./agents/knowledgeApi');
const { runPipeline } = require('./agents/orchestrator');
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
    const result = await runPipeline(topic);
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
      const result = await runPipeline(topic, { emit });
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

/* ---------- 启动 ---------- */
app.listen(PORT, () => {
  console.log(`知遇 (ZhiYu) v${version} 已启动 → http://localhost:${PORT}`);
  console.log(`运行模式：${process.env.ZHIHU_ACCESS_SECRET ? '实时模式（已配置 Access Secret）' : '演示模式（未配置 Access Secret，将使用知乎知识内容接口）'}`);
});

module.exports = app;
