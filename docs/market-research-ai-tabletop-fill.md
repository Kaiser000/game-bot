# AI 桌游补位产品调研报告

调研日期：2026-05-22

## 结论摘要

市面上已经出现了“AI 玩家参与社交推理游戏”的产品，尤其集中在狼人杀 / Mafia / Werewolf 这一类游戏；但“面向多种桌游，在真实朋友局里补齐缺席玩家”的通用产品仍然少见。当前市场更像是早期分化阶段：一边是狼人杀单品开始商业化，一边是 AI Dungeon Master / AI 跑团工具服务 TTRPG，另一边是 Tabletopia、Avalon 在线站、Discord/Telegram bot 这类负责主持或承载规则的平台。

我们的机会不在“做一个狼人杀 App”本身，而在“桌游缺人时，AI 作为可信、可控、懂规则的替补玩家加入朋友局”。这比纯单人 AI 对战更贴近线下桌游痛点，也比 AI DM 更适合狼人杀、阿瓦隆、血染钟楼等社交推理游戏。

## 直接相关产品

| 产品 | 类型 | 覆盖游戏 | 与本项目关系 | 现状判断 |
|---|---|---:|---|---|
| [AI Wolves](https://www.werewolvesai.app/) | 移动端社交推理游戏 | Werewolf | 最接近的直接竞品 | 已明确主打“AI fills empty seats”，支持 solo / friend lobby / AI 填空位。官网强调 AI 个性、记忆、联盟、零等待；Google Play 页面显示 2026-05-11 更新，支持 6/9/12 人预设和 7-20 人自定义局。 |
| [Howl Werewolf Party Game](https://apps.apple.com/au/app/howl-werewolf-party-game/id6760935954) | iOS 本地局 App | Werewolf | 直接竞品，但偏本地 Wi‑Fi / 离线 | App Store 描述显示支持本地 Wi‑Fi、AI bots 填空位、5 种个性、离线运行；iOS 26+ 使用 on-device intelligence，旧设备用规则引擎。 |
| [Mentiss Werewolf: Human vs AI](https://store.steampowered.com/app/4586780) | Steam 狼人杀 AI 游戏 | Werewolf | 强相关，但偏单人/PC 游戏化 | Steam 页面显示 2026-04-24 发布，Early Access，支持 Claude/GPT/Gemini/Grok 等模型作为 AI 玩家，18 个角色，6/9/10 人模式，多语言含简中。 |
| [Wolfia](https://wolfia.party/) | Discord bot | Mafia / Werewolf | 相邻竞品，偏主持/流程自动化 | 提供报名、开局、身份私信、状态等命令。重点是“主持游戏”，不是 AI 替补玩家。 |
| [Avalon-game.com](https://avalon-game.com/about/) / Avalon.fun | 在线阿瓦隆 | Avalon | 相邻竞品，偏在线规则承载 | 支持在线玩阿瓦隆、角色扩展等，但公开信息没有强调 AI 玩家补位。 |

## 相邻赛道

### 1. AI 跑团 / AI Dungeon Master

[Friends & Fables](https://fables.gg/) 和 [TableForge](https://tableforge.gg/) 都在解决“没有 DM / 排期困难”的问题。Friends & Fables 强调 AI Game Master、世界构建工具和虚拟桌面一体化；TableForge 强调 AI DM 处理规则、叙事和世界，支持实时或异步游玩。

这类产品证明了一个方向：玩家愿意让 AI 承担桌游中的“缺席角色”。但它们主要替代的是 DM/GM，而不是补一个玩家。它们更适合 D&D 5e 这类叙事和战斗驱动的 TTRPG，不天然适合阿瓦隆、狼人杀这类需要隐藏身份、欺骗、说服、投票的局。

### 2. 在线桌游平台

[Tabletopia FAQ](https://help.tabletopia.com/faq/) 明确说明它是数字沙盒，没有 AI 执行规则，玩家需要自己懂规则。这代表传统在线桌游平台的定位：提供桌面、组件和联机，不负责“补人”。这给 AI 补位留下空间，但也说明如果要做通用桌游，规则状态机和隐藏信息系统是核心工程难点。

### 3. 学术与 Benchmark

[AvalonBench](https://avalonbench.github.io/) 将阿瓦隆作为评估 LLM Agent 的环境，包含规则 bot 和 ReAct 风格 LLM agent。它的结果显示 LLM 在阿瓦隆这类社交推理任务上仍有明显能力差距：例如 ChatGPT 扮演好人阵营对抗规则坏人 bot 的胜率低于规则 bot 基线。

这说明“AI 会聊天”不等于“AI 会玩社交推理”。产品上需要给 AI 玩家做游戏状态、记忆、角色目标、可说/不可说信息、风格控制和反作弊约束，而不是简单把聊天记录塞给模型。

## 当前市场现状

1. 狼人杀方向已经有产品化苗头。AI Wolves、Howl、Mentiss 都已经围绕 Werewolf 做 AI 玩家，不再只是论文或 demo。

2. 产品大多是单游戏，而不是泛桌游。当前看到的成熟入口基本围绕 Werewolf；阿瓦隆更多是在线站点、主持 bot、研究 benchmark，还没看到同等明确的“AI 替补玩家”消费产品。

3. “AI 补位”这个痛点成立，但主流表达是“零等待开局”和“solo practice”。AI Wolves 和 Howl 都在讲“不够人也能开局”；这和我们的原始创意高度一致。

4. “朋友局补一个 AI”比“玩家单人对 AI”更有差异化。现有产品多半把 AI 当对手或局内玩家池，我们可以更强调：真人朋友局为主、AI 是临时替补、支持用户设定 AI 的水平/性格/保密程度。

5. 商业模式仍在探索。AI Wolves 采用 coins、角色/局数/订阅等游戏内经济；Howl 用广告和一次性去广告；Mentiss 提到 AI credit system。LLM 成本会直接影响定价，需要控制每局 token 和模型调用频次。

## 用户痛点拆解

| 痛点 | 现有解决方式 | 未满足点 |
|---|---|---|
| 人数差 1-2 个，板子开不了 | 改板子、拉陌生人、有人兼任 | 破坏原本想玩的配置；陌生人影响朋友局氛围 |
| 社交推理游戏需要说话和欺骗 | 真人玩家 | 普通规则 bot 不能自然参与讨论 |
| 线下局不想每个人都装复杂 App | 主持人 App / 群聊 | 需要轻量入口，例如网页、二维码加入、主持人控制 |
| 不想 AI 泄露身份或乱带节奏 | 暂无成熟通用方案 | 需要可解释的 AI 约束和“裁判视角 / 玩家视角”隔离 |
| 不同桌游规则差异大 | 单游戏产品 | 泛化成本高，需要先聚焦少数高频游戏 |

## 机会点

### 推荐定位

先定位成“朋友局 AI 替补玩家”，不是“AI 桌游大全”。

第一阶段建议聚焦：

- 狼人杀：市场验证最强，用户痛点直观。
- 阿瓦隆：无出局等待、局长流程清晰、适合文字 demo。
- 血染钟楼：长期机会大，但规则和角色复杂度高，不建议第一版硬做完整。

### 产品差异化

1. AI 是补位，不是主角：真人朋友局仍是核心体验。
2. 支持“桌面主持模式”：主持人开房，输入当前阶段和关键事件，AI 按座位发言。
3. AI 个性可配置：稳健、进攻、混乱、教学、新手友好。
4. 信息隔离：AI 只能看到自己身份和公开信息，不能读裁判隐藏信息。
5. 可调强度：新手局、普通局、高手局，避免 AI 太强或太像外挂。

## 风险与挑战

1. 版权与商标：狼人杀/Mafia 相对通用；阿瓦隆、血染钟楼等具体商业桌游需要谨慎处理名称、角色、规则文本和美术。
2. 游戏体验风险：AI 发言如果太长、太确定、太会演，会破坏朋友局；如果太弱，又会被当成空气。
3. 隐藏信息安全：必须严格区分玩家视角和裁判视角，避免模型提示泄露。
4. 成本控制：社交推理一局多轮多发言，如果每次都调用大模型，成本很快变高。
5. 信任问题：真人玩家需要知道 AI 是否作弊、是否看到了不该看的信息。

## MVP 建议

当前 repo 的 demo 方向是合理的，但下一步建议从“文字聊天 demo”升级到“半自动裁判 + AI 补位”：

1. 增加房间持久化：本地 JSON 或 SQLite。
2. 增加玩家视角：真人只看自己的身份，AI 只拿对应 seat 的信息。
3. 增加事件结构化：发言、投票、夜晚行动、任务结果都变成结构化事件。
4. 接入一个真实 LLM provider：先只让 AI 在发言阶段调用模型，夜晚/投票先规则化。
5. 做狼人杀 6/9/12 人和阿瓦隆 5-10 人的最小完整闭环。

## 参考资料

- [AI Wolves 官网](https://www.werewolvesai.app/)
- [AI Wolves - Google Play](https://play.google.com/store/apps/details?id=com.ideatrix.aiwolves)
- [Howl Werewolf Party Game - App Store](https://apps.apple.com/au/app/howl-werewolf-party-game/id6760935954)
- [Mentiss Werewolf: Human vs AI - Steam](https://store.steampowered.com/app/4586780)
- [Wolfia Discord Bot](https://wolfia.party/)
- [Avalon-game.com About](https://avalon-game.com/about/)
- [AvalonBench](https://avalonbench.github.io/)
- [Friends & Fables](https://fables.gg/)
- [TableForge](https://tableforge.gg/)
- [Tabletopia FAQ](https://help.tabletopia.com/faq/)
