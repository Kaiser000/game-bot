# 圆桌智核 Unity 客户端方案

## 结论

Steam/游戏版客户端确定使用 Unity。当前 Web Demo 继续作为规则、AI、房间和人设打法的验证场；Unity 客户端负责沉浸式房间、角色表现、语音交互、Steam 平台能力和最终游戏体验。

第一阶段目标不是完整复刻鹅鸭杀，而是做一个可以玩的垂直切片：一个房间、一张圆桌、8-10 个座位、真人与 AI 混合入座、语音发言、私人身份标记、夜晚/白天阶段、投票与复盘。

## 为什么选 Unity

- 鹅鸭杀本身是 Unity 路线，类似社交推理游戏的工程路径更有参考价值。
- 适合 2D、2.5D、轻 3D 的房间和角色表现，不必一开始背 Unreal 的电影级复杂度。
- UI、动画、资源管理、Steamworks、语音、跨平台和商业化插件生态成熟。
- 后续如果要做皮肤、角色外观、房间装饰、移动端或手柄支持，Unity 的资料和资产更多。
- Web Demo 中的 Python 后端、AI 人设、规则数据、消息结构可以复用，Unity 只需要重做客户端。

## 免费使用前提

早期原型阶段按 Unity Personal/免费计划推进。正式商业发布前必须重新核对当时 Unity 许可、收入/融资门槛、插件授权、素材授权和 Steam 上架要求。

原则：

- 不把商业闭环建立在未确认授权的素材、插件或 AI 生成资产上。
- 所有第三方 Unity 包、音效、字体、模型、动画都要记录来源、许可证和是否可商用。
- 如果未来收入或融资超过免费计划门槛，提前切换到合规订阅或重新评估引擎成本。

## 项目边界

Unity 客户端负责：

- 房间场景、圆桌、座位、角色、镜头、灯光、音效。
- 玩家输入、移动、落座、发言 UI、身份标记 UI。
- 调用现有后端 API，展示房间、座位、阶段、消息和 AI 发言。
- Steam 登录、好友邀请、成就、Overlay 等平台能力。
- 后续接入实时语音、空间化语音、WebSocket 或专用同步服务。

Python 后端继续负责：

- 房间创建与加入。
- 座位与隐藏身份。
- 桌游规则状态机。
- AI 人设打法库。
- AI 发言生成。
- 对局日志与复盘数据。

## 第一版垂直切片

### 场景

- 一个哥特圆桌房间。
- 8-10 个固定座位。
- 座位上显示头像、昵称、状态和玩家自己的推理标记。
- 房间内暂不做复杂自由探索，优先保证落座和发言体验稳定。

### 入座

- 玩家进入房间后看到已入座真人和 AI。
- 点击空座，角色走到座位旁并坐下。
- 入座后不再保留一个可移动小人，避免逻辑冲突。
- 已入座玩家可以点击其他玩家/AI 做私人身份标记。

### 发言

- 真人玩家语音优先。
- 第一阶段可以先做“按键说话 + 文字转写/记录”的 UI 和接口。
- 如果实时语音未完成，先保留文字发言兜底。
- AI 第一阶段可以文字输出，后续再加 TTS。

### 身份标记

- 标记是个人推理，不是真实身份展示。
- 标记只对自己可见。
- 狼人杀：可疑、狼人、预言家、女巫、猎人、守卫、白痴、村民等。
- 阿瓦隆：可疑、好人方、坏人方、梅林、派西维尔、莫甘娜、刺客、莫德雷德等。

### 流程

- 创建/加入房间。
- 选择座位并入座。
- 房主推进阶段。
- 夜晚闭眼提示。
- 白天发言。
- 投票放逐。
- 简单复盘。

## 推荐 Unity 目录结构

```text
unity-client/
  Assets/
    Art/
      Characters/
      Rooms/
      UI/
    Audio/
      Music/
      SFX/
      Voice/
    Materials/
    Prefabs/
      Characters/
      Seats/
      UI/
    Scenes/
      Boot.unity
      Lobby.unity
      RoundTableRoom.unity
    Scripts/
      App/
      API/
      Audio/
      Characters/
      GameFlow/
      Room/
      Steam/
      UI/
    Settings/
  Packages/
  ProjectSettings/
```

## 核心模块拆分

### Boot

- 初始化配置。
- 读取环境和构建信息。
- 初始化 Steam SDK。
- 初始化 API Client。
- 进入大厅或房间。

### API Client

- 封装当前 Python 后端接口。
- 负责请求重试、错误提示、token 保存。
- 第一版继续轮询，后续升级 WebSocket。

### Room State

- 保存 room、seats、messages、phase、currentPlayer。
- 统一派发状态变化事件。
- UI 和角色表现层只订阅状态，不直接改后端数据。

### Seat System

- 管理座位坐标、可用状态、落座动画、座位高亮。
- 空座点击 = 加入。
- 已入座对象点击 = 打开私人标记面板。

### Character System

- 角色 idle、转头、看向发言者、走向座位、坐下。
- AI 与真人使用同一套座位表现接口。
- 角色风格可以先用低成本手办/卡通模型，不急于高精度写实。

### Voice System

- 第一阶段：语音按钮 UI + 发言状态 + 后端消息记录。
- 第二阶段：接入实时语音服务或 Steam 语音能力。
- 第三阶段：空间化语音和说话角色高亮。

### Mark System

- 管理本地私人身份标记。
- 默认只存在本机。
- 后续可扩展成“推理笔记本”，但不能误导为真实身份。

### Steam Integration

- Steam 登录身份。
- 好友邀请。
- Overlay。
- 成就。
- 云存档可选。
- 后续评估 Steam Lobby、Steam Networking 和语音能力。

## 与现有后端对接

第一版 Unity 可以直接使用当前 API：

- `GET /api/games`
- `GET /api/personas`
- `POST /api/rooms`
- `GET /api/rooms/{roomId}`
- `POST /api/rooms/{roomId}/join`
- `POST /api/rooms/{roomId}/name`
- `POST /api/rooms/{roomId}/message`
- `POST /api/rooms/{roomId}/phase`
- `POST /api/rooms/{roomId}/ai-turn`

需要新增或升级的接口：

- 投票接口。
- 准备/未准备状态。
- 房间密码或私密房间。
- WebSocket 实时同步。
- 语音房间 token。
- 复盘数据导出。

## 技术风险

- Unity 插件授权和版本锁定。
- Steamworks 接入和测试账号流程。
- 语音服务成本、延迟和隐私合规。
- AI 发言内容安全与 Steam AI 内容披露。
- 多人同步和隐藏身份防作弊。
- 素材版权和统一美术风格。

## 第一阶段里程碑

### M0：工程准备

- 创建 `unity-client/`。
- 确定 Unity LTS 版本。
- 写入项目 README、包版本和代码规范。
- 建立基础场景和 API Client。

### M1：圆桌房间

- 圆桌场景。
- 10 个座位。
- 座位状态展示。
- 创建/加入房间。
- 玩家落座。

### M2：桌游流程

- 阶段切换。
- AI 发言展示。
- 真人发言。
- 私人身份标记。
- 简单投票。

### M3：语音与表现

- 按键说话 UI。
- 发言者高亮。
- 角色看向发言者。
- 夜晚灯光切换。
- 简单音效。

### M4：Steam 准备

- Steam SDK 试接。
- 好友邀请原型。
- 构建 Windows 包。
- 写 Steam 页面素材清单。
- 做可录屏的宣传 demo。

## 当前立即要做

1. Web Demo 继续完善规则、投票、AI 行为和复盘。
2. 新建 Unity 客户端工程前，先确认 Unity 版本和团队机器环境。
3. 整理可复用的数据契约，避免 Unity 客户端硬编码规则。
4. 为 Unity 原型准备一批合法可商用的临时角色、场景、UI 和音效资产。
5. 明确第一版只做狼人杀 8-10 人垂直切片，不同时扩阿瓦隆。
