#!/usr/bin/env node
/**
 * 知遇 ZhiYu 启动入口
 * 不依赖 bash / start.sh，跨平台，Render/Zeabur/本地通用
 * 在加载 server.js 之前设置 zhihu-cli 路径和执行权限
 */

'use strict';

const path = require('path');
const fs = require('fs');

// 优先使用项目内置的 Linux 版 CLI（部署环境）
if (process.platform !== 'win32') {
  const bundledCli = path.join(__dirname, 'bin', 'zhihu-cli');
  if (fs.existsSync(bundledCli)) {
    // 确保有执行权限（git 可能没有保留可执行位）
    try {
      fs.chmodSync(bundledCli, 0o755);
      console.log('[start] 已设置 zhihu-cli 执行权限');
    } catch (e) {
      console.log('[start] chmod 失败（可能不影响）:', e.message);
    }
    process.env.ZHIHU_CLI_PATH = bundledCli;
    console.log('[start] 使用内置 zhihu-cli:', bundledCli);

    // 验证文件可执行
    try {
      const stats = fs.statSync(bundledCli);
      console.log('[start] 文件大小:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
      console.log('[start] 文件权限:', stats.mode.toString(8));
    } catch (e) {
      console.log('[start] stat 失败:', e.message);
    }
  } else {
    console.log('[start] 未找到内置 CLI:', bundledCli);
    console.log('[start] 当前目录:', __dirname);
    console.log('[start] bin 目录内容:', fs.existsSync(path.join(__dirname, 'bin')) ? fs.readdirSync(path.join(__dirname, 'bin')) : '不存在');
  }
}

// Windows 使用官方安装的 CLI（zhihuClient.js 会自动检测）
if (process.platform === 'win32') {
  console.log('[start] Windows 环境，使用官方安装的 zhihu-cli');
}

// 启动服务器
console.log('[start] 启动知遇服务器...');
require('./server.js');
