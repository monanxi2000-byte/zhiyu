'use strict';

/**
 * 知乎 OAuth 2.0 登录模块（官方文档版）
 * 参考：https://openapi.zhihu.com/ 官方文档
 *
 * 配置环境变量：
 *   ZHIHU_OAUTH_APP_ID - 应用 ID
 *   ZHIHU_OAUTH_APP_SECRET - 应用密钥（app_key）
 *   ZHIHU_OAUTH_REDIRECT_URI - 回调地址
 */

const https = require('https');
const crypto = require('crypto');

const APP_ID = process.env.ZHIHU_OAUTH_APP_ID || '';
const APP_SECRET = process.env.ZHIHU_OAUTH_APP_SECRET || '';
const REDIRECT_URI = process.env.ZHIHU_OAUTH_REDIRECT_URI || 'https://zhiyu-oj5f.onrender.com/api/auth/zhihu/callback';

// 官方文档端点
const AUTHORIZE_URL = 'https://openapi.zhihu.com/authorize';
const TOKEN_URL = 'https://openapi.zhihu.com/access_token';
const USER_INFO_URL = 'https://api.zhihu.com/user_info';

/**
 * 生成 state 参数，防止 CSRF
 */
function generateState() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * 构建授权 URL
 * 官方文档：https://openapi.zhihu.com/authorize?redirect_uri={redirect_uri}&app_id={app_id}&response_type=code
 */
function getAuthorizeUrl(redirectUri) {
  const state = generateState();
  const params = new URLSearchParams({
    app_id: APP_ID,
    redirect_uri: redirectUri || REDIRECT_URI,
    response_type: 'code',
    state,
  });
  return {
    url: `${AUTHORIZE_URL}?${params.toString()}`,
    state,
  };
}

/**
 * 用授权码换取 access_token
 * 官方文档：POST https://openapi.zhihu.com/access_token
 * 参数：app_id, app_key, grant_type=authorization_code, redirect_uri, code
 */
function exchangeCode(code, redirectUri) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      app_id: APP_ID,
      app_key: APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri || REDIRECT_URI,
      code: code,
    });

    const postData = params.toString();
    const url = new URL(TOKEN_URL);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.access_token) {
            resolve(result);
          } else {
            reject(new Error('获取 access_token 失败: ' + (result.error_msg || data)));
          }
        } catch (e) {
          reject(new Error('解析 token 响应失败: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * 获取用户信息
 */
function getUserInfo(accessToken) {
  return new Promise((resolve, reject) => {
    const url = new URL(USER_INFO_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('解析用户信息响应失败'));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * 检查 OAuth 是否配置
 */
function isConfigured() {
  return !!(APP_ID && APP_SECRET);
}

module.exports = {
  getAuthorizeUrl,
  exchangeCode,
  getUserInfo,
  isConfigured,
  generateState,
};
