# Tabletop AI Fill Demo

一个纯文字桌游 AI 补位 demo：当狼人杀、阿瓦隆等桌游缺 1-2 人时，用 AI 玩家补齐座位并参与文字发言。

## 当前能力

- 零依赖 Python 后端：房间状态、游戏模板、身份分配、AI 补位发言。
- React + Vite 前端：创建文字局、切换阶段、真人发言、触发 AI 发言。
- 外挂式 AI 人设知识库：按游戏和身份分配倒钩、冲锋、悍跳、控场、搅局等打法。
- 支持狼人杀和阿瓦隆两个模板。
- 当前 AI 是规则驱动模拟器，后续可以替换成真实 LLM provider。

## Web 端页面

当前 Web demo 已包含：

- 开局配置页：选择游戏、目标人数、真人人数、AI 打法方案。
- 一键演示：8 人阿瓦隆全 AI 观察局。
- 打法知识库：展示当前游戏可用的人设方案。
- 房间页：房间状态、阶段轨道、座位身份、AI 人设、圆桌消息流。
- 操作区：AI 发言、下一阶段、新开一局、真人玩家发言。
- 全 AI 观察模式：0 真人时隐藏输入框，仅保留阶段推进和 AI 发言。

## 本地运行

后端：

```bash
cd backend
python -m app.main
```

前端：

```bash
cd frontend
npm install
npm run dev
```

打开：

```text
http://localhost:5173
```

## 全 AI 阿瓦隆实验

仓库内置了 8 人阿瓦隆全 AI 循环脚本，用于回归 AI 补位发言质量：

```bash
python scripts\run_avalon_ai_demo.py --games 12
```

也可以指定 AI 打法方案：

```bash
python scripts\run_avalon_ai_demo.py --games 12 --persona-mode deceptive
```

脚本会创建 12 局 8 人全 AI 阿瓦隆，每局循环 6 个阶段，共生成 576 条 AI 发言，并把结果写入：

```text
docs/avalon-ai-demo-results.json
```

效果报告见：

```text
docs/avalon-ai-demo-effect-report.md
```

## 后续路线

- 接入真实大模型，让 AI 根据完整上下文和隐藏身份进行自然语言推理。
- 当需要鉴权、数据库或 OpenAPI 文档时，把零依赖后端升级为 FastAPI。
- 增加裁判系统：夜晚行动、任务成败、投票、胜负判定。
- 增加房间持久化和多人实时同步。
- 增加更多桌游模板，例如血染钟楼、只言片语、璀璨宝石陪练等。
