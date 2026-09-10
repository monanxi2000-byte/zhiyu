'use strict';

/**
 * cliBootstrap —— 服务器启动时自动检查并安装 zhihu-cli
 * 不依赖 postinstall / 构建钩子，运行时自包含，最可靠
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const CLI_VERSION = '0.6.0-beta.20260908125143';
const BASE_URL = 'https://developer-cdn.zhihu.com/zhihu-cli/releases/beta/cli/' + CLI_VERSION;

function getPlatformInfo() {
  const platform = process.platform;
  const arch = process.arch;
  let osName = null;
  let archName = null;
  if (platform === 'win32') osName = 'windows';
  else if (platform === 'linux') osName = 'linux';
  else if (platform === 'darwin') osName = 'darwin';
  if (arch === 'x64') archName = 'amd64';
  else if (arch === 'arm64') archName = 'arm64';
  return { osName, archName, platform };
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const doRequest = (u) => {
      https.get(u, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
          response.resume();
          doRequest(response.headers.location);
          return;
        }
        if (response.statusCode !== 200) {
          file.close();
          try { fs.unlinkSync(dest); } catch {}
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }).on('error', (err) => {
        file.close();
        try { fs.unlinkSync(dest); } catch {}
        reject(err);
      });
    };
    doRequest(url);
  });
}

function findCliInDir(dir, ext) {
  if (!fs.existsSync(dir)) return null;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isFile() && entry.name === 'zhihu-cli' + ext) return full;
      if (entry.isDirectory()) stack.push(full);
    }
  }
  return null;
}

async function ensureCli() {
  const { osName, archName, platform } = getPlatformInfo();
  const ext = platform === 'win32' ? '.exe' : '';

  // 1. 检查环境变量指定的路径
  if (process.env.ZHIHU_CLI_PATH && fs.existsSync(process.env.ZHIHU_CLI_PATH)) {
    console.log('[cli-bootstrap] 使用环境变量指定的 CLI:', process.env.ZHIHU_CLI_PATH);
    return process.env.ZHIHU_CLI_PATH;
  }

  // 2. 检查项目目录下的 .zhihu-cli
  const projectCliDir = path.join(__dirname, '..', '.zhihu-cli');
  const projectCli = findCliInDir(projectCliDir, ext);
  if (projectCli) {
    process.env.ZHIHU_CLI_PATH = projectCli;
    console.log('[cli-bootstrap] 使用项目内置 CLI:', projectCli);
    return projectCli;
  }

  // 3. Windows 检查官方安装路径
  if (platform === 'win32') {
    const localPath = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'ZhihuCLI', 'current', 'zhihu-cli.exe');
    if (fs.existsSync(localPath)) {
      process.env.ZHIHU_CLI_PATH = localPath;
      console.log('[cli-bootstrap] 使用 Windows 官方安装 CLI:', localPath);
      return localPath;
    }
  }

  // 4. 检查系统 PATH 中是否有 zhihu-cli
  try {
    const which = platform === 'win32' ? 'where zhihu-cli' : 'which zhihu-cli';
    const result = execSync(which, { encoding: 'utf8' }).trim();
    if (result && fs.existsSync(result.split('\n')[0].trim())) {
      const sysPath = result.split('\n')[0].trim();
      process.env.ZHIHU_CLI_PATH = sysPath;
      console.log('[cli-bootstrap] 使用系统 PATH 中的 CLI:', sysPath);
      return sysPath;
    }
  } catch {}

  // 5. 自动下载安装
  if (!osName || !archName) {
    console.log('[cli-bootstrap] 不支持的平台，跳过 CLI 安装');
    return null;
  }

  const fileName = `zhihu-cli-${CLI_VERSION}-${osName}-${archName}.tar.gz`;
  const url = `${BASE_URL}/${fileName}`;
  const installDir = path.join(__dirname, '..', '.zhihu-cli');

  console.log(`[cli-bootstrap] 未找到 zhihu-cli，开始自动安装...`);
  console.log(`[cli-bootstrap] 平台: ${osName}-${archName}`);
  console.log(`[cli-bootstrap] 下载: ${url}`);

  if (!fs.existsSync(installDir)) {
    fs.mkdirSync(installDir, { recursive: true });
  }

  const tarFile = path.join(os.tmpdir(), `zhihu-cli-${Date.now()}.tar.gz`);

  try {
    await download(url, tarFile);
    console.log('[cli-bootstrap] 下载完成，解压中...');
    execSync(`tar -xzf "${tarFile}" -C "${installDir}"`, { stdio: 'pipe' });

    const installed = findCliInDir(installDir, ext);
    if (installed) {
      if (platform !== 'win32') {
        try { fs.chmodSync(installed, 0o755); } catch {}
      }
      process.env.ZHIHU_CLI_PATH = installed;
      console.log('[cli-bootstrap] 安装成功:', installed);
      return installed;
    } else {
      console.log('[cli-bootstrap] 警告: 解压后未找到可执行文件');
      return null;
    }
  } catch (err) {
    console.log('[cli-bootstrap] 安装失败:', err.message);
    console.log('[cli-bootstrap] 知乎实时搜索/热榜将不可用，但核心功能不受影响');
    return null;
  } finally {
    try { if (fs.existsSync(tarFile)) fs.unlinkSync(tarFile); } catch {}
  }
}

module.exports = { ensureCli };
