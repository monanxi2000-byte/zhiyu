# 部署指南

比赛要求提交**可公网访问**的线上 Demo。本指南覆盖两种方式：本地临时体验（内网穿透）与云平台部署。

## 0. 前置准备

- Node.js ≥ 18
- 一个可公网访问的部署目标（推荐 Zeabur / Render / Railway / 国内云服务器）
- （可选）知乎开放平台 Access Secret：<https://developer.zhihu.com/profile>

## 1. 配置环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `PORT` | 否 | 服务端口，默认 3000 |
| `ZHIHU_ACCESS_SECRET` | 否 | 知乎开放平台凭证。**不配置则运行演示模式**（使用黑客松知识内容接口，无需凭证）；配置后自动启用实时搜索/热榜/直答 |
| `ZHIHU_CLI_PATH` | 否 | zhihu-cli 二进制路径，默认自动探测（Windows 安装目录 / PATH） |

> ⚠️ Access Secret 只放在部署平台的环境变量 / Secret 管理中，**禁止**写入 `.env` 提交到仓库、前端代码或日志。

## 2. 本地运行

```bash
npm install
npm start
# http://localhost:3000
```

## 3. 云平台部署

### 方式 A：Zeabur（推荐，国内访问较稳定）

1. 将代码推送到 GitHub / Gitee 仓库
2. 在 <https://zeabur.com> 新建项目 → 从 Git 导入仓库
3. 平台自动识别 `package.json`，运行 `npm install && npm start`
4. 在服务设置中添加环境变量 `ZHIHU_ACCESS_SECRET`（可选）
5. 绑定域名（Zeabur 提供 `*.zeabur.app` 免费域名，也可绑定自有域名）

### 方式 B：Render / Railway

- Render：New → Web Service → 从 Git 导入，Build Command `npm install`，Start Command `npm start`
- Railway：New Project → Deploy from GitHub，自动检测 Node.js

### 方式 C：国内云服务器（宝塔 / Docker）

```bash
# 以 Docker 为例
docker run -d -p 3000:3000 \
  -e ZHIHU_ACCESS_SECRET=你的Secret \
  -v /path/to/zhiyu:/app \
  -w /app node:20 bash -c "npm install --production && npm start"
```

## 4. 部署后验证（提交前必做）

- [ ] 公网打开 Demo，完成一次完整流程（输入领域 → 三个 Agent 运行 → 结果展示）
- [ ] 切换不同话题（内置场景 + 冷门话题）均正常
- [ ] 配置 Secret 后刷新页面，右上角显示"实时模式"
- [ ] 接口失败时出现真实降级提示（如停止后端后页面不白屏）
- [ ] Access Secret 未出现在页面源码、网络请求与日志中

## 5. 常见问题

| 问题 | 处理 |
|---|---|
| 页面显示"演示模式"，但已配置 Secret | 重启服务使环境变量生效；检查 `GET /api/health` 的 `mode` 字段 |
| CLI 报 `AUTH_REQUIRED` | Secret 无效或未配置，回退演示模式属正常设计 |
| 搜索/直答偶发失败 | 额度用尽或限流，应用层缓存与降级已兜底，稍后自动恢复 |
| 需要提高额度 | 按开放平台提示走提额申请流程：developer.zhihu.com 接口调用提额申请 |
