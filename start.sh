#!/bin/bash
# 知遇 ZhiYu 启动脚本
# 1. 先运行 CLI 安装脚本（确保 zhihu-cli 存在）
# 2. 设置环境变量
# 3. 启动服务器

echo "[zhiyu] 启动前检查 zhihu-cli..."

# 运行 CLI 安装脚本（Node.js 跨平台，自动检测已存在则跳过）
node scripts/install-cli.js

# 查找项目目录下的 zhihu-cli
CLI_BIN="$(pwd)/.zhihu-cli/zhihu-cli"

if [ -f "$CLI_BIN" ]; then
  export ZHIHU_CLI_PATH="$CLI_BIN"
  echo "[zhiyu] ✅ zhihu-cli 已就绪: $CLI_BIN"
else
  echo "[zhiyu] ⚠️ 未找到 .zhihu-cli/zhihu-cli，知乎实时模式将不可用"
  echo "[zhiyu] 当前目录: $(pwd)"
  ls -la "$(pwd)/.zhihu-cli/" 2>/dev/null || echo "[zhiyu] .zhihu-cli 目录不存在"
fi

# 启动服务器
echo "[zhiyu] 启动知遇服务器..."
exec node server.js
