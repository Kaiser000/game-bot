# game-bot

一个纯文字桌游 AI 补位 demo：当狼人杀、阿瓦隆等桌游缺 1-2 人时，用 AI 玩家补齐座位并参与文字发言。

## 当前能力

- Python + LangChain 后端：房间状态、游戏模板、身份分配、AI 补位发言。
- React + Vite 前端：创建文字局、切换阶段、真人发言、触发 AI 发言。
- 外挂式 AI 人设知识库：按游戏和身份分配倒钩、冲锋、悍跳、控场、搅局等打法。
- 支持狼人杀和阿瓦隆两个模板。
- 默认带规则兜底模拟器；配置 API Key 后通过 LangChain 接入 OpenAI-compatible Chat Completions。

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
pip install -r requirements.txt
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

## 接入真实模型

默认不配置 Key 时，后端会使用本地规则兜底，方便离线跑 demo。真实模型统一走 LangChain 的 `ChatOpenAI`。

### 推荐 env 模板

本地可以按下面格式准备 `.env.local`，但不要提交真实值。仓库已经忽略 `.env` 和 `.env.*`，README 里也只保留脱敏占位符：

```dotenv
AI_PROVIDER=codingplan
AI_API_BASE_URL=http://<OPENAI_COMPATIBLE_HOST>:<PORT>/v1
AI_API_KEY=<YOUR_OPENAI_COMPATIBLE_API_KEY>
AI_MODEL=gpt-5.5
AI_USE_ENV_PROXY=false
```

如果服务方给的是完整 Chat Completions URL，也可以这样写：

```dotenv
AI_PROVIDER=codingplan
AI_API_URL=http://<OPENAI_COMPATIBLE_HOST>:<PORT>/v1/chat/completions
AI_API_KEY=<YOUR_OPENAI_COMPATIBLE_API_KEY>
AI_MODEL=gpt-5.5
AI_USE_ENV_PROXY=false
```

当前后端读取的是进程环境变量。Windows PowerShell 启动前可按下面方式设置：

```powershell
$env:AI_PROVIDER="codingplan"
$env:AI_API_BASE_URL="http://<OPENAI_COMPATIBLE_HOST>:<PORT>/v1"
$env:AI_API_KEY="<YOUR_OPENAI_COMPATIBLE_API_KEY>"
$env:AI_MODEL="gpt-5.5"
$env:AI_USE_ENV_PROXY="false"
```

要接 OpenAI 官方接口：

```powershell
$env:OPENAI_API_KEY="<YOUR_OPENAI_API_KEY>"
$env:OPENAI_MODEL="gpt-5.2"
cd backend
pip install -r requirements.txt
python -m app.main
```

如果 CodingPlan 给的是 OpenAI-compatible 的 `base_url`：

```powershell
$env:AI_API_KEY="<YOUR_OPENAI_COMPATIBLE_API_KEY>"
$env:AI_PROVIDER="codingplan"
$env:AI_API_BASE_URL="http://<OPENAI_COMPATIBLE_HOST>:<PORT>/v1"
$env:AI_MODEL="gpt-5.5"
cd backend
pip install -r requirements.txt
python -m app.main
```

如果 CodingPlan 给的是完整接口 URL，也可以直接填，后端会自动截出 base URL 给 LangChain：

```powershell
$env:AI_API_KEY="<YOUR_OPENAI_COMPATIBLE_API_KEY>"
$env:AI_PROVIDER="codingplan"
$env:AI_API_URL="http://<OPENAI_COMPATIBLE_HOST>:<PORT>/v1/chat/completions"
$env:AI_MODEL="gpt-5.5"
cd backend
pip install -r requirements.txt
python -m app.main
```

常用环境变量：

- `AI_API_KEY` / `OPENAI_API_KEY` / `CODINGPLAN_API_KEY`：模型服务 Key。
- `AI_PROVIDER`：可选，`openai`、`openai-compatible`、`codingplan` 或 `rules`。
- `AI_MODEL` / `OPENAI_MODEL` / `CODINGPLAN_MODEL`：模型名。
- `AI_API_BASE_URL`：兼容服务的 base URL，例如 `https://.../v1`。
- `AI_API_URL`：完整接口 URL，优先级高于 base URL。
- `AI_USE_ENV_PROXY`：默认 `false`，避免本地兼容服务被系统代理误转发；确实需要代理时设为 `true`。

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
