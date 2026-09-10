#!/bin/bash
# 知遇 ZhiYu 启动脚本
# CLI 已内置在 bin/zhihu-cli（Linux amd64），直接使用

# 设置 CLI 路径（优先使用项目内置的 Linux 版 CLI）
CLI_BIN="$(pwd)/bin/zhihu-cli"

if [ -f "$CLI_BIN" ]; then
  chmod +x "$CLI_BIN" 2>/dev/null
  export ZHIHU_CLI_PATH="$CLI_BIN"
  echo "[zhiyu] ✅ 使用项目内置 zhihu-cli: $CLI_BIN"
else
  echo "[zhiyu] ⚠️ 未找到 bin/zhihu-cli，尝试其他路径..."
  # 回退到 .zhihu-cli 目录
  ALT_CLI="$(pwd)/.zhihu-cli/zhihu-cli"
  if [ -f "$ALT_CLI" ]; then
    chmod +x "$ALT_CLI" 2>/dev/null
    export ZHIHU_CLI_PATH="$ALT_CLI"
    echo "[zhiyu] ✅ 使用 .zhihu-cli/zhihu-cli: $ALT_CLI"
  fi
fi

# 启动服务器
echo "[zhiyu] 启动知遇服务器..."
exec node server.js
