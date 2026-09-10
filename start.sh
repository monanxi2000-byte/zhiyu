#!/bin/bash
# 知遇 ZhiYu 启动脚本
# CLI 已在 npm install (postinstall) 阶段安装到 .zhihu-cli/
# 本脚本只负责设置环境变量并启动服务器

# 查找项目目录下的 zhihu-cli
CLI_BIN="$(pwd)/.zhihu-cli/zhihu-cli"

if [ -f "$CLI_BIN" ]; then
  export ZHIHU_CLI_PATH="$CLI_BIN"
  echo "[zhiyu] zhihu-cli 已就绪: $CLI_BIN"
else
  echo "[zhiyu] 警告: 未找到 .zhihu-cli/zhihu-cli，知乎实时模式将不可用"
  echo "[zhiyu] 当前目录: $(pwd)"
  ls -la "$(pwd)/.zhihu-cli/" 2>/dev/null || echo "[zhiyu] .zhihu-cli 目录不存在"
fi

# 启动服务器
echo "[zhiyu] 启动知遇服务器..."
exec node server.js
