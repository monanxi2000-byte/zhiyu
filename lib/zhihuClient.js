'use strict';

/**
 * zhihuClient —— 知乎开放平台 CLI 封装。
 *
 * 鉴权方式（二选一，后端进程持有，绝不进入前端）：
 *  1. 环境变量 ZHIHU_ACCESS_SECRET（部署/无头环境推荐）
 *  2. 官方 CLI 本机已配置（zhihu-cli auth set，桌面环境）
 *
 * 所有开放能力调用均带 TTL 缓存，遵守官方「应用层缓存、请求去重」要求。
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cache = require('./cache');

const TTL = {
  zhihuSearch: 60 * 60 * 1000, // 知乎搜索：1 小时
  globalSearch: 60 * 60 * 1000, // 全网搜索：1 小时
  hot: 15 * 60 * 1000, // 热榜：15 分钟
  answer: 6 * 60 * 60 * 1000, // 直答：6 小时
  quota: 5 * 60 * 1000, // 额度：5 分钟
  authStatus: 10 * 60 * 1000, // 鉴权状态探测：10 分钟
};

function resolveCliPath() {
  if (process.env.ZHIHU_CLI_PATH) return process.env.ZHIHU_CLI_PATH;
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const candidate = path.join(local, 'ZhihuCLI', 'current', 'zhihu-cli.exe');
    if (fs.existsSync(candidate)) return candidate;
  }
  return 'zhihu-cli';
}

/** 执行 CLI 命令，返回解析后的 JSON（或纯文本）。 */
function runCli(args, { timeoutMs = 30 * 1000 } = {}) {
  return new Promise((resolve, reject) => {
    const bin = resolveCliPath();
    const child = spawn(bin, args, {
      env: { ...process.env }, // 透传 ZHIHU_ACCESS_SECRET 等
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      const err = new Error(`zhihu-cli 调用超时: ${args.join(' ')}`);
      err.code = 'CLI_TIMEOUT';
      reject(err);
    }, timeoutMs);

    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      let parsed = null;
      try {
        parsed = JSON.parse(stdout.trim());
      } catch {
        parsed = null;
      }

      // 业务错误统一为 Error 对象
      if (parsed && parsed.ok === false) {
        const e = parsed.error || {};
        const err = new Error(e.message || '知乎开放平台调用失败');
        err.code = e.code || 'CLI_ERROR';
        err.actionUrl = e.action_url;
        err.source = e.source;
        reject(err);
        return;
      }

      if (code !== 0) {
        const err = new Error(stderr.trim() || `zhihu-cli 退出码 ${code}`);
        err.code = 'CLI_EXIT';
        reject(err);
        return;
      }

      resolve(parsed !== null ? parsed : stdout);
    });
  });
}

/** 从多种返回形态中归一化出列表。 */
function normalizeList(out) {
  if (Array.isArray(out)) return out;
  if (out && Array.isArray(out.items)) return out.items;
  if (out && Array.isArray(out.data)) return out.data;
  if (out && Array.isArray(out.results)) return out.results;
  if (out && out.Data && Array.isArray(out.Data)) return out.Data;
  return [];
}

/** 从直答响应中提取回答文本。 */
function extractAnswerText(out) {
  if (typeof out === 'string') return out;
  if (!out) return '';
  if (typeof out.content === 'string' && out.content) return out.content;
  if (out.data && typeof out.data.content === 'string') return out.data.content;
  if (Array.isArray(out.choices) && out.choices[0]) {
    const c = out.choices[0];
    if (c.message && typeof c.message.content === 'string') return c.message.content;
    if (typeof c.text === 'string') return c.text;
  }
  if (out.Data && typeof out.Data.Content === 'string') return out.Data.Content;
  if (out.Data && Array.isArray(out.Data.Choices) && out.Data.Choices[0]) {
    const c = out.Data.Choices[0];
    if (c.Message && typeof c.Message.Content === 'string') return c.Message.Content;
  }
  return JSON.stringify(out);
}

let _authCached = undefined; // undefined=未探测, true/false=结果

/**
 * 探测当前是否具备真实调用能力（Access Secret 已配置）。
 * 结果缓存 10 分钟；配置变化后进程重启即可刷新。
 */
async function isLive() {
  if (_authCached !== undefined) return _authCached;
  if (process.env.ZHIHU_ACCESS_SECRET) {
    _authCached = true;
    return true;
  }
  try {
    const out = await runCli(['auth', 'status'], { timeoutMs: 10 * 1000 });
    const configured = !!(out && (out.configured === true || (out.auth && out.auth.configured === true)));
    _authCached = configured;
  } catch {
    _authCached = false;
  }
  return _authCached;
}

/** 仅供测试/运维：强制刷新鉴权探测。 */
function resetAuthProbe() {
  _authCached = undefined;
}

/** 知乎搜索：返回标题、作者、摘要、原文链接等字段。 */
async function searchZhihu(query, count = 10) {
  const key = `zhihu_search:${query}:${count}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const out = await runCli(['search', 'zhihu', '--query', String(query), '--count', String(Math.max(1, Math.min(10, count)))]);
  const items = normalizeList(out);
  cache.set(key, items, TTL.zhihuSearch);
  return items;
}

/** 全网搜索：知乎之外的网络来源。 */
async function searchGlobal(query, count = 10) {
  const key = `global_search:${query}:${count}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const out = await runCli(['search', 'global', '--query', String(query), '--count', String(Math.max(1, Math.min(10, count)))]);
  const items = normalizeList(out);
  cache.set(key, items, TTL.globalSearch);
  return items;
}

/** 知乎热榜。 */
async function hot(limit = 20) {
  const key = `hot:${limit}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const out = await runCli(['hot', '--limit', String(Math.max(1, Math.min(30, limit)))]);
  const items = normalizeList(out);
  cache.set(key, items, TTL.hot);
  return items;
}

/** 知乎直答：生成综合答案（非流式）。 */
async function answer(query, model = 'zhida-fast-1p5') {
  const key = `answer:${model}:${query}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const out = await runCli(['answer', '--query', String(query), '--model', model, '--output', 'json']);
  const text = extractAnswerText(out);
  cache.set(key, text, TTL.answer);
  return text;
}

/** 查询开放 API 当日额度（查询本身不消耗额度）。 */
async function quota() {
  const key = 'quota:all';
  const hit = cache.get(key);
  if (hit) return hit;
  const out = await runCli(['quota']);
  cache.set(key, out, TTL.quota);
  return out;
}

module.exports = {
  isLive,
  resetAuthProbe,
  searchZhihu,
  searchGlobal,
  hot,
  answer,
  quota,
  resolveCliPath,
};
