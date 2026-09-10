#!/usr/bin/env node
/**
 * 知遇 ZhiYu — zhihu-cli 自动安装脚本
 * 在 npm install 后自动执行，下载对应平台的 zhihu-cli
 * 跨平台：Windows / Linux / macOS，支持 amd64 / arm64
 */

'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const CLI_VERSION = '0.6.0-beta.20260908125143';
const BASE_URL = 'https://developer-cdn.zhihu.com/zhihu-cli/releases/beta/cli/' + CLI_VERSION;

// 检测平台和架构
function getPlatform() {
  const platform = process.platform;
  const arch = process.arch;

  let osName = null;
  let archName = null;

  if (platform === 'win32') osName = 'windows';
  else if (platform === 'linux') osName = 'linux';
  else if (platform === 'darwin') osName = 'darwin';

  if (arch === 'x64') archName = 'amd64';
  else if (arch === 'arm64') archName = 'arm64';

  return { osName, archName, platform, arch };
}

// 下载文件
function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // 跟随重定向
        file.close();
        fs.unlinkSync(dest);
        download(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`下载失败: HTTP ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function main() {
  const { osName, archName, platform } = getPlatform();

  if (!osName || !archName) {
    console.log('[zhihu-cli] 不支持的平台:', process.platform, process.arch);
    return;
  }

  // Windows 上通常已通过官方安装器安装了 CLI，跳过
  if (platform === 'win32') {
    const localPath = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'ZhihuCLI', 'current', 'zhihu-cli.exe');
    if (fs.existsSync(localPath)) {
      console.log('[zhihu-cli] Windows 已检测到本地 CLI，跳过下载');
      return;
    }
  }

  const cliDir = path.join(process.cwd(), '.zhihu-cli');
  const ext = platform === 'win32' ? '.exe' : '';
  const cliBin = path.join(cliDir, 'zhihu-cli' + ext);

  // 已存在则跳过
  if (fs.existsSync(cliBin)) {
    console.log('[zhihu-cli] 已存在:', cliBin);
    return;
  }

  const fileName = `zhihu-cli-${CLI_VERSION}-${osName}-${archName}.tar.gz`;
  const url = `${BASE_URL}/${fileName}`;

  console.log(`[zhihu-cli] 平台: ${osName}-${archName}`);
  console.log(`[zhihu-cli] 下载: ${url}`);

  if (!fs.existsSync(cliDir)) {
    fs.mkdirSync(cliDir, { recursive: true });
  }

  const tarFile = path.join(os.tmpdir(), `zhihu-cli-${Date.now()}.tar.gz`);

  try {
    await download(url, tarFile);
    console.log('[zhihu-cli] 下载完成，解压中...');

    // 解压
    if (platform === 'win32') {
      // Windows 用 tar（Windows 10+ 自带）
      execSync(`tar -xzf "${tarFile}" -C "${cliDir}"`, { stdio: 'inherit' });
    } else {
      execSync(`tar -xzf "${tarFile}" -C "${cliDir}"`, { stdio: 'inherit' });
    }

    // 查找解压后的可执行文件
    const found = findFile(cliDir, 'zhihu-cli' + ext);
    if (found) {
      if (found !== cliBin) {
        fs.renameSync(found, cliBin);
      }
      if (platform !== 'win32') {
        fs.chmodSync(cliBin, 0o755);
      }
      console.log('[zhihu-cli] 安装成功:', cliBin);
    } else {
      console.log('[zhihu-cli] 警告: 解压后未找到 zhihu-cli，目录内容:');
      console.log(fs.readdirSync(cliDir).join(', '));
    }
  } catch (err) {
    console.log('[zhihu-cli] 安装失败:', err.message);
    console.log('[zhihu-cli] 将以无知乎实时模式运行（不影响核心功能）');
  } finally {
    if (fs.existsSync(tarFile)) {
      fs.unlinkSync(tarFile);
    }
  }
}

function findFile(dir, name) {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === name) {
      return fullPath;
    }
    if (entry.isDirectory()) {
      const found = findFile(fullPath, name);
      if (found) return found;
    }
  }
  return null;
}

main().catch((err) => {
  console.log('[zhihu-cli] 脚本异常:', err.message);
  // 不阻塞 npm install
});
