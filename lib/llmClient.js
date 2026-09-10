/**
 * LLM 客户端封装（OpenAI 兼容协议）
 * 用于 OpenAI Next Credits 平台，支持 Claude / GPT / DeepSeek 等
 */
const cache = require('./cache');

const BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai-next.com/v1';
const API_KEY = process.env.OPENAI_API_KEY || '';
const DEFAULT_MODEL = process.env.LLM_MODEL || 'claude-sonnet-5';

const isAvailable = () => !!API_KEY;

/**
 * 通用 chat 调用
 * @param {Array} messages - [{role, content}]
 * @param {Object} opts - {model, temperature, maxTokens, jsonMode, cacheKey}
 * @returns {Promise<string>} 返回文本内容
 */
async function chat(messages, opts = {}) {
  const model = opts.model || DEFAULT_MODEL;
  const temperature = opts.temperature ?? 0.7;
  const maxTokens = opts.maxTokens || 4096;
  const jsonMode = opts.jsonMode || false;
  const cacheKey = opts.cacheKey;

  // 缓存命中
  if (cacheKey) {
    const cached = cache.get(cacheKey);
    if (cached) return cached;
  }

  if (!isAvailable()) {
    throw new Error('LLM_API_KEY_NOT_CONFIGURED');
  }

  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`LLM_HTTP_${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';

    if (cacheKey && content) {
      cache.set(cacheKey, content, 3600); // 缓存1小时
    }

    return content;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('LLM_TIMEOUT');
    }
    throw err;
  }
}

/**
 * 调用 LLM 并解析 JSON 返回
 * @param {Array} messages
 * @param {Object} opts
 * @returns {Promise<Object>}
 */
async function chatJSON(messages, opts = {}) {
  const content = await chat(messages, { ...opts, jsonMode: true });
  // 清理可能的 markdown 代码块包裹
  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // 尝试提取第一个 JSON 对象
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {
        throw new Error(`LLM_JSON_PARSE_FAILED: ${e2.message}. Raw: ${cleaned.slice(0, 500)}`);
      }
    }
    throw new Error(`LLM_JSON_PARSE_FAILED: ${e.message}. Raw: ${cleaned.slice(0, 500)}`);
  }
}

/**
 * 流式 chat（SSE）
 * @param {Array} messages
 * @param {Function} onChunk - (text) => void
 * @param {Object} opts
 */
async function chatStream(messages, onChunk, opts = {}) {
  const model = opts.model || DEFAULT_MODEL;
  const temperature = opts.temperature ?? 0.7;
  const maxTokens = opts.maxTokens || 2048;

  if (!isAvailable()) {
    throw new Error('LLM_API_KEY_NOT_CONFIGURED');
  }

  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  };

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`LLM_HTTP_${res.status}: ${errText.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content || '';
        if (delta) onChunk(delta);
      } catch (e) {
        // 忽略解析错误
      }
    }
  }
}

module.exports = {
  isAvailable,
  chat,
  chatJSON,
  chatStream,
  DEFAULT_MODEL,
};
