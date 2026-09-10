#!/usr/bin/env node
/**
 * 知遇 ZhiYu 启动入口
 * 不依赖 bash / start.sh，跨平台，Render/Zeabur/本地通用
 * 在加载 server.js 之前设置 zhihu-cli 路径
 */

'use strict';

const path = require('path');
const fs = require('fs');

// 优先使用项目内置的 Linux 版 CLI（部署环境）
if (process.platform !== 'win32') {
  const bundledCli = path.join(__dirname, 'bin', 'zhihu-cli');
  if (fs.existsSync(bundledCli)) {
    process.env.ZHIHU_CLI_PATH = bundledCli;
    console.log('[start] 使用内置 zhihu-cli:', bundledCli);
  } else {
    console.log('[start] 未找到内置 CLI:', bundledCli);
  }
}

// Windows 使用官方安装的 CLI（zhihuClient.js 会自动检测）
if (process.platform === 'win32') {
  console.log('[start] Windows 环境，使用官方安装的 zhihu-cli');
}

// 启动服务器
console.log('[start] 启动知遇服务器...');
require('./server.js');
