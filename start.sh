#!/bin/bash
# 知遇 ZhiYu 部署启动脚本
# 自动下载 Linux 版 zhihu-cli，然后启动服务器

set -e

CLI_VERSION="0.6.0-beta.20260908125143"
CLI_URL="https://developer-cdn.zhihu.com/zhihu-cli/releases/beta/cli/${CLI_VERSION}/zhihu-cli-${CLI_VERSION}-linux-amd64.tar.gz"
CLI_DIR="/app/.zhihu-cli"
CLI_BIN="${CLI_DIR}/zhihu-cli"

# 检测架构
ARCH=$(uname -m)
if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
  CLI_URL="https://developer-cdn.zhihu.com/zhihu-cli/releases/beta/cli/${CLI_VERSION}/zhihu-cli-${CLI_VERSION}-linux-arm64.tar.gz"
fi

# 下载并安装 zhihu-cli（如果不存在）
if [ ! -f "$CLI_BIN" ]; then
  echo "正在下载 zhihu-cli (${ARCH})..."
  mkdir -p "$CLI_DIR"
  curl -sL "$CLI_URL" -o /tmp/zhihu-cli.tar.gz
  tar -xzf /tmp/zhihu-cli.tar.gz -C "$CLI_DIR"
  chmod +x "$CLI_BIN"
  rm -f /tmp/zhihu-cli.tar.gz
  echo "zhihu-cli 安装完成: $($CLI_BIN --version 2>/dev/null || echo 'ok')"
else
  echo "zhihu-cli 已存在，跳过下载"
fi

# 设置 CLI 路径环境变量
export ZHIHU_CLI_PATH="$CLI_BIN"

# 启动服务器
echo "启动知遇服务器..."
exec node server.js
