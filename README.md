# 知遇 ZhiYu 🦊

> 基于知乎知识生态的 **AI 新人引路助手** —— 知乎黑客松 2026 · 校园新锐季 · 队伍「邂逅」
>
> 赛道：学习工具与知识生产 · 方向：多 Agent 协作完成资料整理、观点对照与知识梳理

**知遇**：输入一个想进入的领域（"数据分析入门""考研数学""转行程序员"……），三个 AI Agent 协作把知乎上散落的优质经验整理成——**可执行的学习路径、可对照的观点地图、可复习的知识卡片**。

## 多 Agent 流水线

```
输入领域 → Agent1 资料收集官 → Agent2 观点对照官 → Agent3 知识梳理官 → 输出
          (知乎搜索/全网/知识/热榜)  (共识与分歧对照)       (路径/概念/卡片)
```

- 全程 SSE 实时进度，让用户看到"资料正在整理 → 观点正在对照 → 知识正在梳理"
- 每条观点标注来源，知识文章保留原作者与版权
- 双模式：无凭证时演示模式（真实知识内容接口 + 内置素材，逐条标注）；配置 Access Secret 后自动切换实时模式（真实搜索/热榜/直答）

## 快速开始

### 本地运行

```bash
npm install
npm start
# 打开 http://localhost:3000
```

### 配置知乎开放平台（可选，推荐）

1. 在 <https://developer.zhihu.com/profile> 生成 Access Secret
2. 方式 A（推荐，部署用）：设置环境变量 `ZHIHU_ACCESS_SECRET`
3. 方式 B（本机开发）：`zhihu-cli auth set` 按提示配置

配置后无需重启流程逻辑，自动进入实时模式（搜索/热榜/直答全部启用，带应用层缓存）。

### 演示模式说明

未配置凭证时，产品使用知乎黑客松**知识内容接口**（真实内容）与内置精选素材运行，所有演示素材在界面逐条标注"演示"，不会冒充实时数据。

## 项目结构

```
zhiyu/
├── server.js              # Express 入口（SSE + REST API + 静态资源）
├── lib/
│   ├── cache.js           # TTL 缓存（搜索 1h / 热榜 15min / 直答 6h）
│   └── zhihuClient.js     # 知乎 CLI 封装（搜索/热榜/直答/额度）
├── agents/
│   ├── orchestrator.js    # 多 Agent 编排器
│   ├── collector.js       # Agent 1 资料收集官
│   ├── comparator.js      # Agent 2 观点对照官
│   ├── curator.js         # Agent 3 知识梳理官
│   └── knowledgeApi.js    # 黑客松知识/故事内容接口封装
├── data/
│   ├── scenarios.js       # 8 个内置领域场景 + 通用框架
│   └── hotTopics.js       # 演示模式热榜
├── public/                # 前端单页（原生 HTML/CSS/JS）
│   └── assets/mascot/     # 刘看山素材（黑客松官方素材包）
└── docs/
    ├── PRODUCT.md         # 产品说明 / 计划书（必交材料）
    └── DEPLOY.md          # 部署指南
```

## API 一览

| 端点 | 说明 |
|---|---|
| `GET /api/guide/stream?topic=xxx` | 多 Agent 流水线（SSE 进度流） |
| `GET /api/guide?topic=xxx` | 多 Agent 流水线（一次性 JSON） |
| `GET /api/scenarios` | 内置场景列表 |
| `GET /api/match?topic=xxx` | 场景匹配 |
| `GET /api/hot` | 热榜（实时/演示） |
| `GET /api/knowledge/list` | 知乎知识内容列表 |
| `GET /api/knowledge/:id` | 知乎知识内容详情 |
| `GET /api/health` | 健康检查与运行模式 |

## 安全与合规

- Access Secret 仅存在于后端环境变量，不进入前端、URL、日志与代码仓库
- 所有开放能力调用带缓存与限流，遵守官方配额与"禁止批量高频调用"要求
- 内容归属透明：不把知乎原文改写成应用或用户创作

## 参赛信息

- 队伍：邂逅（1 人）
- 赛道：学习工具与知识生产
- 提交材料：线上 Demo + 产品说明（`docs/PRODUCT.md`）
