#!/bin/bash
# 知遇 ZhiYu 部署启动脚本
# 自动下载 Linux 版 zhihu-cli，然后启动服务器

CLI_VERSION="0.6.0-beta.20260908125143"
CLI_BASE_URL="https://developer-cdn.zhihu.com/zhihu-cli/releases/beta/cli/${CLI_VERSION}"

# 检测架构
ARCH=$(uname -m)
if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
  CLI_FILE="zhihu-cli-${CLI_VERSION}-linux-arm64.tar.gz"
else
  CLI_FILE="zhihu-cli-${CLI_VERSION}-linux-amd64.tar.gz"
fi
CLI_URL="${CLI_BASE_URL}/${CLI_FILE}"

# 使用当前工作目录下的 .zhihu-cli（兼容 Render / Zeabur / 本地）
CLI_DIR="$(pwd)/.zhihu-cli"
mkdir -p "$CLI_DIR"

echo "[zhihu-cli] 架构: $ARCH"
echo "[zhihu-cli] 下载地址: $CLI_URL"
echo "[zhihu-cli] 安装目录: $CLI_DIR"

# 查找已存在的 zhihu-cli 可执行文件
find_cli_bin() {
  find "$CLI_DIR" -type f -name "zhihu-cli" 2>/dev/null | head -1
}

CLI_BIN=$(find_cli_bin)

if [ -z "$CLI_BIN" ] || [ ! -f "$CLI_BIN" ]; then
  echo "[zhihu-cli] 未找到已安装的 CLI，开始下载..."
  TMP_FILE="/tmp/zhihu-cli-$$.tar.gz"
  if curl -sL --fail "$CLI_URL" -o "$TMP_FILE" 2>/dev/null; then
    echo "[zhihu-cli] 下载完成 ($(du -h "$TMP_FILE" | cut -f1))，开始解压..."
    tar -xzf "$TMP_FILE" -C "$CLI_DIR" 2>/dev/null
    rm -f "$TMP_FILE"
    CLI_BIN=$(find_cli_bin)
    if [ -n "$CLI_BIN" ] && [ -f "$CLI_BIN" ]; then
      chmod +x "$CLI_BIN"
      echo "[zhihu-cli] 安装成功: $CLI_BIN"
      "$CLI_BIN" --version 2>/dev/null && echo "[zhihu-cli] 版本验证通过" || echo "[zhihu-cli] 版本验证跳过"
    else
      echo "[zhihu-cli] 警告: 解压后未找到 zhihu-cli 可执行文件，目录内容:"
      ls -la "$CLI_DIR" 2>/dev/null
      echo "[zhihu-cli] 将以无知乎实时模式启动"
      CLI_BIN=""
    fi
  else
    echo "[zhihu-cli] 警告: 下载失败，将以无知乎实时模式启动"
    rm -f "$TMP_FILE"
    CLI_BIN=""
  fi
else
  echo "[zhihu-cli] 已存在: $CLI_BIN，跳过下载"
fi

# 设置 CLI 路径环境变量（如果安装成功）
if [ -n "$CLI_BIN" ] && [ -f "$CLI_BIN" ]; then
  export ZHIHU_CLI_PATH="$CLI_BIN"
  echo "[zhihu-cli] ZHIHU_CLI_PATH=$ZHIHU_CLI_PATH"
else
  echo "[zhihu-cli] 未设置 ZHIHU_CLI_PATH，知乎实时搜索/热榜将不可用"
fi

# 启动服务器
echo "[zhiyu] 启动知遇服务器..."
exec node server.js
