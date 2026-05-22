import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  BookOpen,
  BrainCircuit,
  CirclePlay,
  Clock3,
  FileText,
  Home,
  Library,
  MessageSquareText,
  RefreshCw,
  Send,
  Sparkles,
  Table2,
  UsersRound
} from "lucide-react";
import { createRoot } from "react-dom/client";
import "./styles.css";

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.detail || `Request failed: ${response.status}`);
  }
  return response.json();
}

function formatTime(iso) {
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function roleCamp(gameId, role) {
  if (gameId === "werewolf") return role === "狼人" ? "evil" : "good";
  return ["刺客", "莫甘娜", "爪牙", "莫德雷德"].includes(role) ? "evil" : "good";
}

function modeLabel(modes, id) {
  return modes.find((mode) => mode.id === id)?.name || id || "自动混合";
}

function runtimeLabel(runtime) {
  if (!runtime?.configured) return "规则兜底";
  return `${runtime.provider} / ${runtime.model} / LangChain`;
}

function routeFromHash() {
  const value = window.location.hash.replace(/^#\/?/, "");
  const [page, roomId] = value.split("/");
  if (page === "rooms" && roomId) return { page: "room", roomId };
  if (["setup", "rules", "personas", "reports"].includes(page)) return { page, roomId: "" };
  return { page: "setup", roomId: "" };
}

function navigateTo(path) {
  window.location.hash = `/${path}`;
}

const reportCards = [
  {
    title: "市场现状",
    text: "现有产品更多集中在线上桌游平台、规则裁判和陪玩机器人，专门解决线下桌游缺人补位的产品仍然很少。",
    meta: "docs/market-research-ai-tabletop-fill.md"
  },
  {
    title: "Demo 结论",
    text: "8 人阿瓦隆全 AI 循环能完成发言闭环，当前重点风险是身份泄露、重复表达和过度模板化。",
    meta: "docs/avalon-ai-demo-effect-report.md"
  },
  {
    title: "产品机会",
    text: "人设知识库、玩家风格选择、主持人控制台和局后复盘，是这个方向最容易做出差异化的部分。",
    meta: "docs/persona-knowledge-base.md"
  }
];

function defaultBoardId(game) {
  return game?.defaultBoard || game?.boards?.[0]?.id || "";
}

function activeBoard(game, boardId, targetPlayers) {
  if (!game) return null;
  return (
    game.boards?.find((board) => board.id === boardId) ||
    game.boards?.find((board) => board.playerCount === Number(targetPlayers)) ||
    game.boards?.find((board) => board.id === game.defaultBoard) ||
    game.boards?.[0] ||
    null
  );
}

function roleCounts(roles = []) {
  return roles.reduce((counts, role) => ({ ...counts, [role]: (counts[role] || 0) + 1 }), {});
}

function BoardRulesPanel({ game, board, compact = false }) {
  if (!game) return null;
  const counts = roleCounts(board?.roles || []);

  return (
    <section className={`board-rules-card ${compact ? "compact" : ""}`}>
      <div className="panel-title">
        <div>
          <p className="eyebrow">BOARD RULES</p>
          <h2>{board?.name || `${game.name} 默认板子`}</h2>
        </div>
        {board && <span className="pill">{board.playerCount} 人</span>}
      </div>

      {board?.summary && <p className="board-summary">{board.summary}</p>}

      <div className="rules-block">
        <strong>基础规则</strong>
        <ul>
          {(game.rules || []).map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>

      {board && (
        <>
          <div className="rules-block">
            <strong>身份配置</strong>
            <div className="role-chip-grid">
              {Object.entries(counts).map(([role, count]) => (
                <span className={`role-chip ${roleCamp(game.id, role)}`} key={role}>
                  {role} × {count}
                </span>
              ))}
            </div>
          </div>

          <div className="rules-block">
            <strong>本板提示</strong>
            <ul>
              {(board.tips || []).map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}

function DashboardStats({ games, game, board, personas, personaModes }) {
  const stats = [
    { label: "游戏模块", value: games.length || 0 },
    { label: "当前板子", value: game?.boards?.length || 0 },
    { label: "打法人设", value: personas.length || 0 },
    { label: "策略模式", value: personaModes.length || 0 }
  ];

  return (
    <div className="dashboard-stats">
      {stats.map((stat) => (
        <div className="stat-tile" key={stat.label}>
          <strong>{stat.value}</strong>
          <span>{stat.label}</span>
        </div>
      ))}
      <div className="stat-tile wide">
        <strong>{board?.name || "默认板子"}</strong>
        <span>{game?.name || "桌游"} · 可直接开局</span>
      </div>
    </div>
  );
}

function LobbyTablePreview({ gameId, board, humanPlayers, aiSeats }) {
  const total = board?.playerCount || Math.max(6, humanPlayers + aiSeats);
  const seats = Array.from({ length: total }, (_, index) => ({
    id: index,
    type: index < humanPlayers ? "human" : "ai",
    role: board?.roles?.[index] || ""
  }));

  return (
    <div className="lobby-preview" aria-label="开局座位预览">
      <div className="preview-table">
        <div className="preview-table-core">
          <span>ROUND</span>
          <strong>{total}</strong>
          <small>{humanPlayers} 真人 · {aiSeats} AI</small>
        </div>
        {seats.map((seat, index) => (
          <span
            className={`preview-seat ${seat.type} ${seat.role ? roleCamp(gameId, seat.role) : ""}`}
            key={seat.id}
            style={{ ...seatPositionStyle(index, total), "--seat-delay": index }}
            title={seat.role || seat.type}
          />
        ))}
      </div>
      <div className="preview-caption">
        <strong>{board?.name || "选择板子后生成座位"}</strong>
        <span>创建前即可确认人数、AI 补位和身份密度</span>
      </div>
    </div>
  );
}

function RulebookHeroPanel({ game, board }) {
  const counts = roleCounts(board?.roles || []);
  const goodCount = Object.entries(counts).reduce((sum, [role, count]) => sum + (roleCamp(game?.id, role) === "good" ? count : 0), 0);
  const evilCount = Object.entries(counts).reduce((sum, [role, count]) => sum + (roleCamp(game?.id, role) === "evil" ? count : 0), 0);

  return (
    <div className="rulebook-card">
      <div>
        <p className="eyebrow">CURRENT PRESET</p>
        <strong>{board?.name || "请选择板子"}</strong>
      </div>
      <div className="rulebook-meter">
        <span style={{ width: `${board?.playerCount ? (goodCount / board.playerCount) * 100 : 50}%` }} />
      </div>
      <div className="rulebook-numbers">
        <span>{board?.playerCount || 0} 人</span>
        <span>{goodCount} 好人</span>
        <span>{evilCount} 坏人</span>
      </div>
    </div>
  );
}

function AppNav({ page, room, onNavigate }) {
  const items = [
    { id: "setup", label: "开局", icon: <Home size={17} />, path: "setup" },
    { id: "room", label: "圆桌", icon: <Table2 size={17} />, disabled: !room, path: room ? `rooms/${room.id}` : "setup" },
    { id: "rules", label: "规则", icon: <BookOpen size={17} />, path: "rules" },
    { id: "personas", label: "人设库", icon: <Library size={17} />, path: "personas" },
    { id: "reports", label: "报告", icon: <FileText size={17} />, path: "reports" }
  ];

  return (
    <nav className="app-nav" aria-label="主导航">
      <div className="nav-brand">
        <Bot size={22} />
        <span>桌游 AI 补位</span>
      </div>
      <div className="nav-links">
        {items.map((item) => (
          <button
            className={page === item.id ? "nav-link active" : "nav-link"}
            disabled={item.disabled}
            key={item.id}
            type="button"
            onClick={() => {
              onNavigate({ page: item.id, roomId: item.id === "room" ? room?.id || "" : "" });
              navigateTo(item.path);
            }}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function Setup({ games, personaModes, onCreate }) {
  const [gameId, setGameId] = useState(games[0]?.id || "werewolf");
  const game = games.find((item) => item.id === gameId) || games[0];
  const [boardId, setBoardId] = useState(defaultBoardId(game));
  const [targetPlayers, setTargetPlayers] = useState(game?.defaultTarget || 12);
  const [humanPlayers, setHumanPlayers] = useState(Math.max(1, (game?.defaultTarget || 12) - 1));
  const [personaMode, setPersonaMode] = useState("balanced");
  const [personas, setPersonas] = useState([]);
  const selectedBoard = activeBoard(game, boardId, targetPlayers);

  useEffect(() => {
    if (!game) return;
    const nextBoard = activeBoard(game, defaultBoardId(game), game.defaultTarget);
    setBoardId(nextBoard?.id || "");
    setTargetPlayers(nextBoard?.playerCount || game.defaultTarget);
    setHumanPlayers(Math.max(1, (nextBoard?.playerCount || game.defaultTarget) - 1));
  }, [game?.id]);

  useEffect(() => {
    if (!selectedBoard) return;
    setTargetPlayers(selectedBoard.playerCount);
    setHumanPlayers((value) => Math.min(Math.max(0, value), selectedBoard.playerCount));
  }, [selectedBoard?.id]);

  useEffect(() => {
    if (!gameId) return;
    api(`/api/personas?gameId=${gameId}`).then((data) => setPersonas(data.personas)).catch(() => setPersonas([]));
  }, [gameId]);

  const selectedMode = personaModes.find((mode) => mode.id === personaMode);
  const aiSeats = Math.max(0, (selectedBoard?.playerCount || targetPlayers) - humanPlayers);
  const avalon = games.find((item) => item.id === "avalon");

  return (
    <section className="home-layout">
      <div className="intro-panel">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            <Bot size={34} />
          </div>
          <div>
            <p className="eyebrow">AI BOARD GAME SEAT FILLER</p>
            <h1>桌游 AI 补位</h1>
            <p>给狼人杀、阿瓦隆这类文字桌游补上缺席玩家，让朋友局能按原板子开起来。</p>
          </div>
        </div>

        <LobbyTablePreview gameId={game?.id || "werewolf"} board={selectedBoard} humanPlayers={humanPlayers} aiSeats={aiSeats} />
        <DashboardStats games={games} game={game} board={selectedBoard} personas={personas} personaModes={personaModes} />

        <div className="feature-grid">
          <Feature icon={<UsersRound size={20} />} title="缺人补位" text="支持真人 + AI 混桌，也支持全 AI 观察局。" />
          <Feature icon={<BrainCircuit size={20} />} title="人设打法" text="倒钩、冲锋、悍跳、隐线梅林等策略从知识库读取。" />
          <Feature icon={<MessageSquareText size={20} />} title="文字桌面" text="阶段推进、真人发言、AI 发言都在同一个房间里完成。" />
        </div>
      </div>

      <div className="setup-panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">ROOM SETUP</p>
            <h2>创建演示房间</h2>
          </div>
          <span className="pill">{aiSeats} 位 AI</span>
        </div>

        <form
          className="setup-form"
          onSubmit={(event) => {
            event.preventDefault();
            onCreate({
              gameId,
              boardId: selectedBoard?.id || boardId,
              targetPlayers: selectedBoard?.playerCount || targetPlayers,
              humanPlayers,
              personaMode
            });
          }}
        >
          <label>
            <span>游戏</span>
            <select value={gameId} onChange={(event) => setGameId(event.target.value)}>
              {games.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>板子</span>
            <select value={selectedBoard?.id || boardId} onChange={(event) => setBoardId(event.target.value)}>
              {(game?.boards || []).map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name} · {board.playerCount} 人
                </option>
              ))}
            </select>
          </label>

          <div className="number-row">
            <label>
              <span>目标人数</span>
              <input
                type="number"
                min={game?.minPlayers}
                max={game?.maxPlayers}
                value={targetPlayers}
                disabled={Boolean(selectedBoard)}
                onChange={(event) => setTargetPlayers(Number(event.target.value))}
              />
            </label>
            <label>
              <span>真人人数</span>
              <input
                type="number"
                min="0"
                max={targetPlayers}
                value={humanPlayers}
                onChange={(event) => setHumanPlayers(Number(event.target.value))}
              />
            </label>
          </div>

          <label>
            <span>AI 打法方案</span>
            <select value={personaMode} onChange={(event) => setPersonaMode(event.target.value)}>
              {personaModes.map((mode) => (
                <option key={mode.id} value={mode.id}>
                  {mode.name}
                </option>
              ))}
            </select>
          </label>
          <p className="field-hint">{selectedMode?.description || "按身份自动分配打法。"}</p>

          <div className="button-row">
            <button type="submit">
              <CirclePlay size={18} />
              创建文字局
            </button>
            {avalon && (
              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  onCreate({
                    gameId: "avalon",
                    boardId: avalon?.defaultBoard || "avalon_8_merlin_percival_morgana_assassin",
                    targetPlayers: 8,
                    humanPlayers: 0,
                    personaMode
                  })
                }
              >
                <Sparkles size={18} />
                8 人全 AI
              </button>
            )}
          </div>
        </form>

        <BoardRulesPanel game={game} board={selectedBoard} compact />
      </div>

      <KnowledgePanel personas={personas} title={`${game?.name || "游戏"}打法库`} compact />
    </section>
  );
}

function RulesPage({ games }) {
  const [gameId, setGameId] = useState(games[0]?.id || "werewolf");
  const game = games.find((item) => item.id === gameId) || games[0];
  const [boardId, setBoardId] = useState(defaultBoardId(game));
  const selectedBoard = activeBoard(game, boardId, game?.defaultTarget);

  useEffect(() => {
    if (!game) return;
    setBoardId(defaultBoardId(game));
  }, [game?.id]);

  return (
    <section className="content-page">
      <header className="page-hero rules-hero">
        <div>
          <p className="eyebrow">RULEBOOK</p>
          <h1>游戏规则与常用板子</h1>
          <p>先把线下开局最常见的配置沉淀成可查看、可选择的板子，后续可以继续扩展房规、禁忌话术和主持人流程。</p>
        </div>
        <div className="rules-selects">
          <label className="page-select">
            <span>游戏</span>
            <select value={gameId} onChange={(event) => setGameId(event.target.value)}>
              {games.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="page-select">
            <span>板子</span>
            <select value={selectedBoard?.id || boardId} onChange={(event) => setBoardId(event.target.value)}>
              {(game?.boards || []).map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </select>
          </label>
          <RulebookHeroPanel game={game} board={selectedBoard} />
        </div>
      </header>

      <div className="rules-page-grid">
        <BoardRulesPanel game={game} board={selectedBoard} />
        <section className="tool-panel board-list-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">PRESETS</p>
              <h2>{game?.name || "游戏"}板子库</h2>
            </div>
          </div>
          <div className="board-list">
            {(game?.boards || []).map((board) => (
              <button
                className={board.id === selectedBoard?.id ? "board-option active" : "board-option"}
                key={board.id}
                type="button"
                onClick={() => setBoardId(board.id)}
              >
                <span>{board.name}</span>
                <small>{board.playerCount} 人 · {board.roles.join(" / ")}</small>
              </button>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function PersonasPage({ games, personaModes }) {
  const [gameId, setGameId] = useState(games[0]?.id || "werewolf");
  const [personas, setPersonas] = useState([]);
  const game = games.find((item) => item.id === gameId) || games[0];

  useEffect(() => {
    if (!gameId) return;
    api(`/api/personas?gameId=${gameId}`).then((data) => setPersonas(data.personas)).catch(() => setPersonas([]));
  }, [gameId]);

  return (
    <section className="content-page">
      <header className="page-hero">
        <div>
          <p className="eyebrow">PERSONA LIBRARY</p>
          <h1>AI 人设打法库</h1>
          <p>按游戏、身份和打法方案管理 AI 补位的行为风格，后续可以直接扩展成可编辑知识库。</p>
        </div>
        <label className="page-select">
          <span>游戏模板</span>
          <select value={gameId} onChange={(event) => setGameId(event.target.value)}>
            {games.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="persona-page-grid">
        <section className="tool-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">MODES</p>
              <h2>打法方案</h2>
            </div>
          </div>
          <div className="mode-list">
            {personaModes.map((mode) => (
              <article className="mode-card" key={mode.id}>
                <strong>{mode.name}</strong>
                <p>{mode.description}</p>
              </article>
            ))}
          </div>
        </section>
        <KnowledgePanel personas={personas} title={`${game?.name || "游戏"}人设`} />
      </div>
    </section>
  );
}

function ReportsPage() {
  return (
    <section className="content-page">
      <header className="page-hero">
        <div>
          <p className="eyebrow">RESEARCH & TESTS</p>
          <h1>调研与效果报告</h1>
          <p>把产品判断、AI 循环实验和人设知识库文档集中在一个入口，方便继续迭代。</p>
        </div>
      </header>

      <div className="report-grid">
        {reportCards.map((card) => (
          <article className="report-card" key={card.title}>
            <FileText size={24} />
            <strong>{card.title}</strong>
            <p>{card.text}</p>
            <span>{card.meta}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function RoomPlaceholder({ loading, onCreate }) {
  return (
    <section className="content-page">
      <header className="page-hero">
        <div>
          <p className="eyebrow">ROOM</p>
          <h1>{loading ? "正在载入对局" : "还没有可进入的对局"}</h1>
          <p>{loading ? "正在通过房间地址恢复当前对局。" : "创建一个新房间后，会进入独立的对局页面地址。"}</p>
        </div>
        {!loading && (
          <button type="button" onClick={onCreate}>
            <CirclePlay size={18} />
            去创建
          </button>
        )}
      </header>
    </section>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="feature">
      <div className="feature-icon">{icon}</div>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function KnowledgePanel({ personas, title = "人设知识库", compact = false }) {
  return (
    <aside className={`knowledge-panel ${compact ? "compact" : ""}`}>
      <div className="panel-title">
        <div>
          <p className="eyebrow">KNOWLEDGE BASE</p>
          <h2>{title}</h2>
        </div>
        <Library size={20} />
      </div>
      <div className="persona-list">
        {personas.map((persona) => (
          <article className="persona-card" key={persona.id}>
            <div className="persona-head">
              <strong>{persona.name}</strong>
              {persona.camp && <span className={`tag ${persona.camp}`}>{persona.camp === "evil" ? "坏人" : "好人"}</span>}
            </div>
            <p>{persona.summary}</p>
            <div className="mini-tags">
              {persona.roles?.slice(0, 4).map((role) => (
                <span key={role}>{role}</span>
              ))}
              {persona.tags?.slice(0, compact ? 2 : 4).map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
              {persona.voice?.slice(0, compact ? 1 : 3).map((voice) => (
                <span key={voice}>{voice}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}

function PhaseRail({ phases, current, onChange }) {
  return (
    <div className="phase-rail">
      {phases.map((phase, index) => (
        <button className={phase === current ? "phase-step active" : "phase-step"} type="button" key={phase} onClick={() => onChange(phase)}>
          <span>{index + 1}</span>
          {phase}
        </button>
      ))}
    </div>
  );
}

function seatPositionStyle(index, total) {
  const angle = (360 / total) * index - 90;
  const radius = 36;
  const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
  const y = 50 + radius * Math.sin((angle * Math.PI) / 180);
  return { left: `${x}%`, top: `${y}%` };
}

function RoundTable({ room }) {
  const aiCount = room.seats.filter((seat) => seat.type === "ai").length;
  const humanCount = room.seats.length - aiCount;

  return (
    <section className="roundtable-stage" aria-label="圆桌座位">
      <div className="table-center">
        <div className="table-dial">
          <p className="eyebrow">ROUND TABLE</p>
          <strong>{room.phase}</strong>
          <span>{humanCount} 真人 · {aiCount} AI</span>
        </div>
      </div>
      {room.seats.map((seat, index) => (
        <article
          className={`table-seat ${seat.type} ${roleCamp(room.gameId, seat.role)}`}
          key={seat.id}
          style={seatPositionStyle(index, room.seats.length)}
        >
          <div className="seat-avatar">{seat.type === "ai" ? <Bot size={18} /> : <UsersRound size={18} />}</div>
          <div>
            <strong>{seat.name}</strong>
            <span>{seat.type === "ai" ? `${seat.style} AI` : "真人"}</span>
          </div>
        </article>
      ))}
    </section>
  );
}

function SeatBoard({ room }) {
  return (
    <div className="seat-board">
      {room.seats.map((seat) => (
        <article className="seat-card" key={seat.id}>
          <div className="seat-card-top">
            <div>
              <strong>{seat.name}</strong>
              <small>{seat.type === "human" ? "真人玩家" : `${seat.style}型 AI`}</small>
            </div>
            <div className="seat-tags">
              <span className={`tag ${seat.type === "ai" ? "ai" : "human"}`}>{seat.type === "ai" ? "AI" : "真人"}</span>
              <span className={`tag ${roleCamp(room.gameId, seat.role)}`}>{seat.role}</span>
            </div>
          </div>
          {seat.persona && (
            <div className="persona-inline">
              <span>{seat.persona.name}</span>
              <p>{seat.persona.summary}</p>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function Messages({ room }) {
  return (
    <div className="messages">
      {room.messages.map((message) => {
        const seat = room.seats.find((item) => item.id === message.seatId);
        const className = message.type === "system" ? "system" : seat?.type === "ai" ? "ai" : "human";
        return (
          <article className={`message ${className}`} key={message.id}>
            <div className="message-header">
              <span>{message.speaker}</span>
              <span>{formatTime(message.at)}</span>
            </div>
            <p>{message.text}</p>
          </article>
        );
      })}
    </div>
  );
}

function Room({ room, games, personaModes, onRoomChange, onReset }) {
  const [text, setText] = useState("");
  const [speakerId, setSpeakerId] = useState(room.seats.find((seat) => seat.type === "human")?.id || "");
  const [thinking, setThinking] = useState(false);
  const game = useMemo(() => games.find((item) => item.id === room.gameId), [games, room.gameId]);
  const board = room.board || activeBoard(game, room.boardId, room.seats.length);
  const humans = room.seats.filter((seat) => seat.type === "human");
  const personas = room.seats.map((seat) => seat.persona).filter(Boolean);
  const currentPhaseIndex = game?.phases.indexOf(room.phase) ?? 0;
  const nextPhase = game?.phases[(currentPhaseIndex + 1) % game.phases.length];

  async function updatePhase(phase) {
    const data = await api(`/api/rooms/${room.id}/phase`, { method: "POST", body: { phase } });
    onRoomChange(data.room);
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!text.trim() || !speakerId) return;
    const data = await api(`/api/rooms/${room.id}/message`, {
      method: "POST",
      body: { seatId: speakerId, text: text.trim() }
    });
    setText("");
    onRoomChange(data.room);
  }

  async function runAiTurn() {
    setThinking(true);
    try {
      const data = await api(`/api/rooms/${room.id}/ai-turn`, { method: "POST", body: {} });
      onRoomChange(data.room);
    } finally {
      setThinking(false);
    }
  }

  async function advancePhase() {
    if (!nextPhase) return;
    await updatePhase(nextPhase);
  }

  return (
    <section className="room-layout">
      <header className="room-header">
        <div>
          <p className="eyebrow">{game?.name || "桌游房间"}{board?.name ? ` · ${board.name}` : ""}</p>
          <h1>{room.seats.length} 人局 · {room.aiSeats} 位 AI 补位</h1>
          <p>
            当前阶段：{room.phase} · 打法方案：{modeLabel(personaModes, room.personaMode)} · AI：{runtimeLabel(room.aiRuntime)} · 消息 {room.messages.length}
          </p>
        </div>
        <div className="room-actions">
          <button type="button" onClick={runAiTurn} disabled={thinking}>
            <Sparkles size={18} />
            {thinking ? "思考中" : "AI 发言"}
          </button>
          <button className="secondary-button" type="button" onClick={advancePhase}>
            <Clock3 size={18} />
            下一阶段
          </button>
          <button className="ghost-button" type="button" onClick={onReset}>
            <RefreshCw size={18} />
            新开一局
          </button>
        </div>
      </header>

      <div className="room-grid">
        <aside className="left-column">
          <section className="tool-panel">
            <div className="panel-title">
              <div>
                <p className="eyebrow">PHASES</p>
                <h2>阶段轨道</h2>
              </div>
            </div>
            <PhaseRail phases={game?.phases || []} current={room.phase} onChange={updatePhase} />
          </section>

          <section className="tool-panel">
            <div className="panel-title">
              <div>
                <p className="eyebrow">SEATS</p>
                <h2>座位与身份</h2>
              </div>
              <span className="pill">{humans.length} 真人</span>
            </div>
            <SeatBoard room={room} />
          </section>
        </aside>

        <section className="table-panel">
          <div className="table-toolbar">
            <div>
              <p className="eyebrow">TABLE TALK</p>
              <h2>圆桌发言</h2>
            </div>
            <span className="pill">{room.phase}</span>
          </div>

          <RoundTable room={room} />
          <Messages room={room} />

          {humans.length > 0 ? (
            <form className="composer" onSubmit={sendMessage}>
              <select value={speakerId} onChange={(event) => setSpeakerId(event.target.value)} aria-label="选择发言玩家">
                {humans.map((seat) => (
                  <option key={seat.id} value={seat.id}>
                    {seat.name}
                  </option>
                ))}
              </select>
              <textarea
                rows="3"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="输入真人玩家发言，例如：我觉得 3 号刚才在强行站边。"
              />
              <button type="submit">
                <Send size={18} />
                发送
              </button>
            </form>
          ) : (
            <div className="observer-bar">
              <Bot size={18} />
              全 AI 观察模式：切换阶段后点击“AI 发言”，观察 8 位 AI 的讨论质量。
            </div>
          )}
        </section>

        <KnowledgePanel personas={personas} title="本局 AI 人设" />
      </div>
    </section>
  );
}

function App() {
  const [games, setGames] = useState([]);
  const [personaModes, setPersonaModes] = useState([]);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [route, setRoute] = useState(routeFromHash);
  const [roomLoading, setRoomLoading] = useState(false);

  useEffect(() => {
    Promise.all([api("/api/games"), api("/api/personas")])
      .then(([gamesData, personasData]) => {
        setGames(gamesData.games);
        setPersonaModes(personasData.modes);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const updateRoute = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", updateRoute);
    if (!window.location.hash) navigateTo("setup");
    return () => window.removeEventListener("hashchange", updateRoute);
  }, []);

  useEffect(() => {
    if (route.page !== "room" || !route.roomId || room?.id === route.roomId) {
      setRoomLoading(false);
      return;
    }
    let cancelled = false;
    setError("");
    setRoomLoading(true);
    api(`/api/rooms/${route.roomId}`)
      .then((data) => {
        if (!cancelled) setRoom(data.room);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setRoom(null);
        }
      })
      .finally(() => {
        if (!cancelled) setRoomLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [route.page, route.roomId, room?.id]);

  async function createRoom(payload) {
    setError("");
    try {
      const data = await api("/api/rooms", { method: "POST", body: payload });
      setRoom(data.room);
      setRoute({ page: "room", roomId: data.room.id });
      navigateTo(`rooms/${data.room.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  function renderPage() {
    if (route.page === "room") {
      return room ? (
        <Room
          room={room}
          games={games}
          personaModes={personaModes}
          onRoomChange={setRoom}
          onReset={() => {
            setRoom(null);
            setRoute({ page: "setup", roomId: "" });
            navigateTo("setup");
          }}
        />
      ) : (
        <RoomPlaceholder
          loading={roomLoading}
          onCreate={() => {
            setRoute({ page: "setup", roomId: "" });
            navigateTo("setup");
          }}
        />
      );
    }
    if (route.page === "rules") return <RulesPage games={games} />;
    if (route.page === "personas") return <PersonasPage games={games} personaModes={personaModes} />;
    if (route.page === "reports") return <ReportsPage />;
    return <Setup games={games} personaModes={personaModes} onCreate={createRoom} />;
  }

  return (
    <main className="app-shell">
      <AppNav page={route.page} room={room} onNavigate={setRoute} />
      {error && <div className="error-banner">{error}</div>}
      {renderPage()}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
