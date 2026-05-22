# Tabletop AI Fill Demo

一个纯文字桌游 AI 补位 demo：当狼人杀、阿瓦隆等桌游缺 1-2 人时，用 AI 玩家补齐座位并参与文字发言。

## 当前能力

- 零依赖 Python 后端：房间状态、游戏模板、身份分配、AI 补位发言。
- React + Vite 前端：创建文字局、切换阶段、真人发言、触发 AI 发言。
- 支持狼人杀和阿瓦隆两个模板。
- 当前 AI 是规则驱动模拟器，后续可以替换成真实 LLM provider。

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

## 后续路线

- 接入真实大模型，让 AI 根据完整上下文和隐藏身份进行自然语言推理。
- 当需要鉴权、数据库或 OpenAPI 文档时，把零依赖后端升级为 FastAPI。
- 增加裁判系统：夜晚行动、任务成败、投票、胜负判定。
- 增加房间持久化和多人实时同步。
- 增加更多桌游模板，例如血染钟楼、只言片语、璀璨宝石陪练等。
