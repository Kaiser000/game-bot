import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  BookOpen,
  Check,
  CirclePlay,
  Clipboard,
  Clock3,
  Pencil,
  FileText,
  Home,
  Library,
  LogIn,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Table2,
  X,
  UsersRound
} from "lucide-react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import "./styles.css";

const avatarUrls = [
  new URL("./assets/avatars/avatar-1.png", import.meta.url).href,
  new URL("./assets/avatars/avatar-2.png", import.meta.url).href,
  new URL("./assets/avatars/avatar-3.png", import.meta.url).href,
  new URL("./assets/avatars/avatar-4.png", import.meta.url).href,
  new URL("./assets/avatars/avatar-5.png", import.meta.url).href,
  new URL("./assets/avatars/avatar-6.png", import.meta.url).href,
  new URL("./assets/avatars/avatar-7.png", import.meta.url).href,
  new URL("./assets/avatars/avatar-8.png", import.meta.url).href
];

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
  if (!role) return "unknown";
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
  if (["setup", "join", "rules", "personas", "reports"].includes(page)) return { page, roomId: "" };
  return { page: "setup", roomId: "" };
}

function navigateTo(path) {
  window.location.hash = `/${path}`;
}

function roomTokenKey(roomId) {
  return `roundtable-player-token:${roomId}`;
}

function getRoomToken(roomId) {
  return roomId ? window.localStorage.getItem(roomTokenKey(roomId)) || "" : "";
}

function saveRoomToken(roomId, token) {
  if (roomId && token) window.localStorage.setItem(roomTokenKey(roomId), token);
}

function roomHostTokenKey(roomId) {
  return `roundtable-host-token:${roomId}`;
}

function getRoomHostToken(roomId) {
  return roomId ? window.localStorage.getItem(roomHostTokenKey(roomId)) || "" : "";
}

function saveRoomHostToken(roomId, token) {
  if (roomId && token) window.localStorage.setItem(roomHostTokenKey(roomId), token);
}

function roomApiPath(roomId, playerToken = "", hostToken = "") {
  const params = new URLSearchParams();
  if (playerToken) params.set("playerToken", playerToken);
  if (hostToken) params.set("hostToken", hostToken);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return `/api/rooms/${roomId}${suffix}`;
}

function inviteUrl(roomId) {
  return `${window.location.origin}${window.location.pathname}#/rooms/${roomId}`;
}

function roomIdFromJoinInput(value) {
  const input = value.trim();
  if (!input) return "";
  const hashRoom = input.match(/#\/rooms\/([^/?#]+)/i);
  if (hashRoom?.[1]) return hashRoom[1];
  const plainRoom = input.match(/(?:^|\/)(room_[a-z0-9]+)(?:$|[/?#])/i);
  if (plainRoom?.[1]) return plainRoom[1];
  return "";
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
        <span>创建前即可确认人数、AI 代入和身份密度</span>
      </div>
    </div>
  );
}

function BoardSetupSummary({ game, board, aiSeats, selectedMode }) {
  if (!game || !board) return null;
  const counts = roleCounts(board.roles || []);

  return (
    <section className="setup-summary-panel">
      <div>
        <p className="eyebrow">CURRENT TABLE</p>
        <h2>{board.name}</h2>
      </div>
      <div className="summary-meta">
        <span>{board.playerCount} 人</span>
        <span>{aiSeats} 位 AI</span>
        <span>{selectedMode?.name || "自动混合"}</span>
      </div>
      <div className="role-chip-grid compact">
        {Object.entries(counts).map(([role, count]) => (
          <span className={`role-chip ${roleCamp(game.id, role)}`} key={role}>
            {role} × {count}
          </span>
        ))}
      </div>
    </section>
  );
}

function BoardChoiceStrip({ game, selectedBoard, onSelect }) {
  const boards = game?.boards || [];
  if (!boards.length) return null;

  return (
    <div className="board-choice-strip" aria-label="选择常用板子">
      {boards.map((board) => (
        <button
          className={board.id === selectedBoard?.id ? "board-choice active" : "board-choice"}
          key={board.id}
          type="button"
          onClick={() => onSelect(board.id)}
        >
          <strong>{board.name}</strong>
          <span>{board.playerCount} 人</span>
        </button>
      ))}
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
    { id: "join", label: "加入", icon: <LogIn size={17} />, path: "join" },
    { id: "room", label: "圆桌", icon: <Table2 size={17} />, disabled: !room, path: room ? `rooms/${room.id}` : "setup" },
    { id: "rules", label: "规则", icon: <BookOpen size={17} />, path: "rules" },
    { id: "personas", label: "人设库", icon: <Library size={17} />, path: "personas" },
    { id: "reports", label: "报告", icon: <FileText size={17} />, path: "reports" }
  ];

  return (
    <nav className="app-nav" aria-label="主导航">
      <div className="nav-brand">
        <Bot size={22} />
        <span>圆桌智核</span>
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
            <p className="eyebrow">ROUND TABLE INTELLIGENCE</p>
            <h1>圆桌智核</h1>
            <p>缺人也能开局的桌游 AI 玩家，让狼人杀、阿瓦隆这类朋友局按原板子开起来。</p>
          </div>
        </div>

        <LobbyTablePreview gameId={game?.id || "werewolf"} board={selectedBoard} humanPlayers={humanPlayers} aiSeats={aiSeats} />
        <div className="lobby-primary-actions">
          <button className="primary-command" type="submit" form="room-setup-form">
            <CirclePlay size={18} />
            创建一局
          </button>
          <button className="secondary-command" type="button" onClick={() => navigateTo("join")}>
            <LogIn size={18} />
            加入游戏
          </button>
        </div>
        <div className="lobby-action-strip">
          <button className="ghost-button" type="button" onClick={() => navigateTo("rules")}>
            <BookOpen size={17} />
            查看板子规则
          </button>
          <button className="ghost-button" type="button" onClick={() => navigateTo("personas")}>
            <Library size={17} />
            查看打法库
          </button>
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
          id="room-setup-form"
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
          <div className="setup-step">
            <div className="step-heading">
              <span>1</span>
              <div>
                <strong>选择游戏和板子</strong>
                <small>先确定这局按哪个常用配置开。</small>
              </div>
            </div>
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
            <BoardChoiceStrip game={game} selectedBoard={selectedBoard} onSelect={setBoardId} />
          </div>

          <div className="setup-step">
            <div className="step-heading">
              <span>2</span>
              <div>
                <strong>确认人数</strong>
                <small>填入到场真人数，系统自动补齐 AI。</small>
              </div>
            </div>
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
          </div>

          <div className="setup-step">
            <div className="step-heading">
              <span>3</span>
              <div>
                <strong>选择 AI 打法</strong>
                <small>不同打法会影响 AI 的发言和站边方式。</small>
              </div>
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
          </div>

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

        <BoardSetupSummary game={game} board={selectedBoard} aiSeats={aiSeats} selectedMode={selectedMode} />
      </div>
    </section>
  );
}

function JoinPage({ onRoomFound }) {
  const [joinInput, setJoinInput] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  async function joinGame(event) {
    event.preventDefault();
    const value = joinInput.trim();
    if (!value) {
      setError("请输入房间码或邀请链接。");
      return;
    }

    setJoining(true);
    setError("");
    try {
      const directRoomId = roomIdFromJoinInput(value);
      if (directRoomId) {
        navigateTo(`rooms/${directRoomId}`);
        return;
      }

      const data = await api(`/api/rooms/lookup?code=${encodeURIComponent(value)}`);
      onRoomFound(data.room);
      navigateTo(`rooms/${data.room.id}`);
    } catch (err) {
      setError(err.message || "没有找到这个房间，请确认房间码是否正确。");
    } finally {
      setJoining(false);
    }
  }

  return (
    <section className="join-page">
      <div className="join-hero-panel">
        <p className="eyebrow">JOIN TABLE</p>
        <h1>加入游戏</h1>
        <p>拿到主持人给的房间码或邀请链接后，从这里进入同一张圆桌，再选择自己的真人席位入座。</p>
      </div>

      <form className="join-card" onSubmit={joinGame}>
        <div className="panel-title">
          <div>
            <p className="eyebrow">ROOM ACCESS</p>
            <h2>输入房间信息</h2>
          </div>
          <span className="pill">同桌入座</span>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <label>
          <span>房间码或邀请链接</span>
          <input
            autoFocus
            value={joinInput}
            placeholder="例如 A1B2C3，或粘贴邀请链接"
            onChange={(event) => setJoinInput(event.target.value)}
          />
        </label>

        <div className="join-help-grid">
          <div>
            <strong>房间码</strong>
            <span>创建者在圆桌页面顶部可以看到 6 位码。</span>
          </div>
          <div>
            <strong>邀请链接</strong>
            <span>朋友发来的链接可直接粘贴，不需要手动截取。</span>
          </div>
          <div>
            <strong>入座</strong>
            <span>进入房间后再选择一个空的真人座位。</span>
          </div>
        </div>

        <div className="button-row">
          <button type="submit" disabled={joining}>
            {joining ? <RefreshCw size={18} /> : <LogIn size={18} />}
            {joining ? "正在进入" : "进入圆桌"}
          </button>
          <button className="secondary-button" type="button" onClick={() => navigateTo("setup")}>
            <CirclePlay size={18} />
            创建新局
          </button>
        </div>
      </form>
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
          <p>按游戏、身份和打法方案管理 AI 玩家的行为风格，后续可以直接扩展成可编辑知识库。</p>
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
        {personas.length === 0 && <p className="empty-state">隐藏身份局中，只展示你本机可见的人设信息。</p>}
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

function PlayerJoinPanel({
  room,
  currentPlayer,
  playerName,
  renameName,
  editingName,
  renaming,
  onPlayerNameChange,
  onRenameNameChange,
  onStartRename,
  onCancelRename,
  onRename,
  onJoin,
  onCopyInvite
}) {
  const humanSeats = room.seats.filter((seat) => seat.type === "human");
  const claimedCount = humanSeats.filter((seat) => seat.claimed).length;

  return (
    <section className="tool-panel join-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">JOIN TABLE</p>
          <h2>{currentPlayer ? "我的席位" : "加入这一桌"}</h2>
        </div>
        <span className="pill">{claimedCount}/{humanSeats.length} 已入座</span>
      </div>

      <div className="invite-box">
        <span>房间码</span>
        <strong>{room.joinCode || room.id.slice(-6).toUpperCase()}</strong>
        <button className="ghost-button" type="button" onClick={onCopyInvite}>
          <Clipboard size={16} />
          复制邀请链接
        </button>
      </div>

      {currentPlayer ? (
        <div className="identity-card">
          <ShieldCheck size={20} />
          <div>
            <span>你正在使用</span>
            {editingName ? (
              <form className="rename-form" onSubmit={onRename}>
                <input value={renameName} maxLength={20} onChange={(event) => onRenameNameChange(event.target.value)} autoFocus />
                <button type="submit" disabled={renaming || !renameName.trim()} title="保存昵称">
                  <Check size={16} />
                </button>
                <button className="ghost-button" type="button" onClick={onCancelRename} title="取消">
                  <X size={16} />
                </button>
              </form>
            ) : (
              <div className="name-row">
                <strong>{currentPlayer.name}</strong>
                <button className="icon-button" type="button" onClick={onStartRename} title="修改昵称">
                  <Pencil size={15} />
                </button>
              </div>
            )}
            <p>
              你的身份：<b>{currentPlayer.role || "未分配"}</b>
            </p>
          </div>
        </div>
      ) : (
        <div className="join-form">
          <label>
            <span>你的昵称</span>
            <input value={playerName} placeholder="例如：阿川" onChange={(event) => onPlayerNameChange(event.target.value)} />
          </label>
          <div className="claim-seat-list">
            {humanSeats.map((seat) => (
              <button className={seat.claimed ? "claim-seat claimed" : "claim-seat"} disabled={seat.claimed} key={seat.id} type="button" onClick={() => onJoin(seat.id)}>
                <LogIn size={16} />
                <span>{seat.claimed ? seat.name : `${seat.name} · 可认领`}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
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
            <span>{seat.type === "ai" ? `${seat.style} AI` : seat.claimed ? "真人玩家" : "等待入座"}</span>
          </div>
        </article>
      ))}
    </section>
  );
}

function InteractiveTableStage({ room, currentPlayer, playerName, onPlayerNameChange, onJoin }) {
  const stageRef = useRef(null);
  const seatObjectsRef = useRef([]);
  const [nearSeatId, setNearSeatId] = useState("");
  const [pickedSeatId, setPickedSeatId] = useState("");
  const availableHumanSeats = useMemo(() => room.seats.filter((seat) => seat.type === "human" && !seat.claimed), [room.seats]);
  const seatSignature = useMemo(
    () => room.seats.map((seat) => `${seat.id}:${seat.name}:${seat.type}:${seat.claimed}:${seat.role}:${seat.style}`).join("|"),
    [room.seats]
  );
  const targetSeat = room.seats.find((seat) => seat.id === pickedSeatId) || room.seats.find((seat) => seat.id === nearSeatId);
  const canClaimTarget = !currentPlayer && targetSeat?.type === "human" && !targetSeat.claimed;

  useEffect(() => {
    const mount = stageRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x10120f);
    scene.fog = new THREE.Fog(0x10120f, 8, 18);

    const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.1, 80);
    camera.position.set(0, 6.2, 9.6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    const textureLoader = new THREE.TextureLoader();
    const avatarTextures = avatarUrls.map((url) => {
      const texture = textureLoader.load(url);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    });

    const hemi = new THREE.HemisphereLight(0xffefd0, 0x22362c, 1.7);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffd27a, 2.3);
    key.position.set(-3.8, 7, 4.2);
    key.castShadow = true;
    scene.add(key);
    const rim = new THREE.PointLight(0x65c18c, 1.8, 10);
    rim.position.set(3.4, 2.6, -2.8);
    scene.add(rim);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(13.4, 10.4), new THREE.MeshStandardMaterial({ color: 0x17231d, roughness: 0.9, metalness: 0.02 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const rug = new THREE.Mesh(
      new THREE.CylinderGeometry(3.9, 4.1, 0.025, 96),
      new THREE.MeshStandardMaterial({ color: 0x25362d, roughness: 0.88, metalness: 0.01 })
    );
    rug.scale.set(1.35, 1, 0.82);
    rug.position.y = 0.015;
    rug.receiveShadow = true;
    scene.add(rug);

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(13.4, 4.8), new THREE.MeshStandardMaterial({ color: 0x111813, roughness: 0.95 }));
    backWall.position.set(0, 2.25, -4.9);
    scene.add(backWall);

    const tableBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2.02, 2.18, 0.44, 96),
      new THREE.MeshStandardMaterial({ color: 0x6a4427, roughness: 0.72, metalness: 0.08 })
    );
    tableBase.scale.set(1.18, 1, 0.72);
    tableBase.position.y = 0.45;
    tableBase.castShadow = true;
    tableBase.receiveShadow = true;
    scene.add(tableBase);

    const tableFelt = new THREE.Mesh(
      new THREE.CylinderGeometry(1.78, 1.84, 0.08, 96),
      new THREE.MeshStandardMaterial({ color: 0x243a31, roughness: 0.82, metalness: 0.02 })
    );
    tableFelt.scale.set(1.18, 1, 0.72);
    tableFelt.position.y = 0.72;
    tableFelt.castShadow = true;
    scene.add(tableFelt);

    const centerGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 0.98, 0.1, 64),
      new THREE.MeshStandardMaterial({ color: 0x13231c, emissive: 0x1a3a2d, emissiveIntensity: 0.32, roughness: 0.7 })
    );
    centerGlow.scale.set(1.35, 1, 0.78);
    centerGlow.position.y = 0.82;
    scene.add(centerGlow);

    const seatMaterial = new THREE.MeshStandardMaterial({ color: 0xcaa55e, roughness: 0.62, metalness: 0.06 });
    const humanMaterial = new THREE.MeshStandardMaterial({ color: 0x7ca7f2, roughness: 0.56, metalness: 0.02 });
    const aiMaterial = new THREE.MeshStandardMaterial({ color: 0x65c18c, roughness: 0.56, metalness: 0.02 });
    const occupiedMaterial = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.55, metalness: 0.06 });
    const pickedMaterial = new THREE.MeshStandardMaterial({ color: 0xffd66f, emissive: 0x6b3b00, emissiveIntensity: 0.5, roughness: 0.45 });
    const evilMaterial = new THREE.MeshStandardMaterial({ color: 0xe85c6a, roughness: 0.5 });
    const goodMaterial = new THREE.MeshStandardMaterial({ color: 0x65c18c, roughness: 0.5 });

    const seatObjects = [];
    room.seats.forEach((seat, index) => {
      const angle = (Math.PI * 2 * index) / room.seats.length - Math.PI / 2;
      const x = Math.cos(angle) * 4.55;
      const z = Math.sin(angle) * 3.38;
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.lookAt(0, 0, 0);
      group.userData = { seatId: seat.id, x, z };

      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.2, 36), seat.claimed ? occupiedMaterial : seatMaterial);
      stool.position.y = 0.18;
      stool.castShadow = true;
      stool.receiveShadow = true;
      group.add(stool);

      if (seat.claimed || seat.type === "ai") {
        const avatar = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: avatarTextures[index % avatarTextures.length],
            transparent: true,
            depthWrite: false
          })
        );
        avatar.position.y = 0.9;
        avatar.scale.set(1.02, 1.02, 1.02);
        group.add(avatar);
      }

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.026, 8, 44), seat.type === "ai" ? aiMaterial : humanMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.34;
      ring.castShadow = true;
      group.add(ring);

      scene.add(group);
      seatObjects.push({ group, seat, x, z, ring });
    });
    seatObjectsRef.current = seatObjects;

    const player = new THREE.Group();
    const playerShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.38, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 })
    );
    playerShadow.rotation.x = -Math.PI / 2;
    playerShadow.position.y = 0.035;
    player.add(playerShadow);
    const playerAvatar = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: avatarTextures[0],
        transparent: true,
        depthWrite: false
      })
    );
    playerAvatar.position.y = 0.88;
    playerAvatar.scale.set(1.18, 1.18, 1.18);
    player.add(playerAvatar);
    player.position.set(0, 0, 4.55);
    scene.add(player);

    const keys = new Set();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let animationFrame = 0;
    let lastNearest = "";
    const highlightSeat = (seatId) => {
      seatObjects.forEach((item) => {
        item.ring.material = item.seat.id === seatId ? pickedMaterial : item.seat.type === "ai" ? aiMaterial : humanMaterial;
      });
    };

    const onKeyDown = (event) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
        keys.add(event.code);
      }
    };
    const onKeyUp = (event) => keys.delete(event.code);
    const onPointerDown = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(seatObjects.map((item) => item.group), true);
      const hit = hits.find((item) => {
        let target = item.object;
        while (target.parent && !target.userData.seatId) target = target.parent;
        return target.userData.seatId;
      });
      if (hit) {
        let target = hit.object;
        while (target.parent && !target.userData.seatId) target = target.parent;
        setPickedSeatId(target.userData.seatId);
        highlightSeat(target.userData.seatId);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    const resizeObserver = new ResizeObserver(() => {
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(mount);

    const animate = () => {
      const speed = 0.055;
      let dx = 0;
      let dz = 0;
      if (keys.has("ArrowUp") || keys.has("KeyW")) dz -= speed;
      if (keys.has("ArrowDown") || keys.has("KeyS")) dz += speed;
      if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= speed;
      if (keys.has("ArrowRight") || keys.has("KeyD")) dx += speed;
      if (dx || dz) {
        player.position.x = THREE.MathUtils.clamp(player.position.x + dx, -5.4, 5.4);
        player.position.z = THREE.MathUtils.clamp(player.position.z + dz, -4.2, 5.2);
        player.rotation.y = Math.atan2(dx, dz);
      }

      tableFelt.rotation.y += 0.0012;
      centerGlow.rotation.y -= 0.0016;
      player.position.y = Math.sin(performance.now() * 0.004) * 0.025;

      let nearest = "";
      let nearestDistance = 1.05;
      seatObjects.forEach((item) => {
        const distance = Math.hypot(player.position.x - item.x, player.position.z - item.z);
        item.group.position.y = Math.sin(performance.now() * 0.0025 + item.x) * 0.025;
        if (distance < nearestDistance && item.seat.type === "human" && !item.seat.claimed) {
          nearest = item.seat.id;
          nearestDistance = distance;
        }
      });
      if (nearest !== lastNearest) {
        lastNearest = nearest;
        setNearSeatId(nearest);
        if (!pickedSeatId) highlightSeat(nearest);
      }

      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      resizeObserver.disconnect();
      seatObjectsRef.current = [];
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [room.gameId, seatSignature]);

  useEffect(() => {
    if (!targetSeat || targetSeat.claimed) setPickedSeatId("");
  }, [targetSeat?.id, targetSeat?.claimed]);

  return (
    <section className="interactive-stage" aria-label="可操控圆桌房间">
      <div className="stage-canvas" ref={stageRef} />
      <div className="stage-hud">
        <div>
          <p className="eyebrow">LIVE ROOM</p>
          <h2>走近圆桌并落座</h2>
          <span>WASD / 方向键移动，点击座位可选中。</span>
        </div>
        <div className="stage-seat-hint">
          {currentPlayer ? (
            <strong>已入座：{currentPlayer.name}</strong>
          ) : targetSeat ? (
            <>
              <strong>{targetSeat.name}</strong>
              <span>{canClaimTarget ? "可落座" : targetSeat.claimed ? "已有人" : "AI 席位"}</span>
            </>
          ) : (
            <>
              <strong>{availableHumanSeats.length ? "寻找空座" : "真人席位已满"}</strong>
              <span>靠近金色座位，或直接点击空座。</span>
            </>
          )}
        </div>
      </div>

      {!currentPlayer && (
        <div className="stage-claim-panel">
          <label>
            <span>昵称</span>
            <input value={playerName} placeholder="落座前取个名字" onChange={(event) => onPlayerNameChange(event.target.value)} />
          </label>
          <button type="button" disabled={!canClaimTarget} onClick={() => canClaimTarget && onJoin(targetSeat.id)}>
            <LogIn size={17} />
            {canClaimTarget ? `落座 ${targetSeat.name}` : "选择空座"}
          </button>
        </div>
      )}
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
              <small>{seat.type === "human" ? (seat.claimed ? "真人玩家" : "等待入座") : `${seat.style}型 AI`}</small>
            </div>
            <div className="seat-tags">
              <span className={`tag ${seat.type === "ai" ? "ai" : "human"}`}>{seat.type === "ai" ? "AI" : "真人"}</span>
              <span className={`tag ${roleCamp(room.gameId, seat.role)}`}>{seat.roleVisible ? seat.role : "身份隐藏"}</span>
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

function Room({ room, games, personaModes, playerToken, hostToken, onPlayerTokenChange, onRoomChange, onReset }) {
  const [text, setText] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [renameName, setRenameName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [thinking, setThinking] = useState(false);
  const game = useMemo(() => games.find((item) => item.id === room.gameId), [games, room.gameId]);
  const board = room.board || activeBoard(game, room.boardId, room.seats.length);
  const humans = room.seats.filter((seat) => seat.type === "human");
  const personas = room.seats.map((seat) => seat.persona).filter(Boolean);
  const currentPlayer = room.currentPlayer || room.seats.find((seat) => seat.isYou);
  const currentPhaseIndex = game?.phases.indexOf(room.phase) ?? 0;
  const nextPhase = game?.phases[(currentPhaseIndex + 1) % game.phases.length];
  const isHost = Boolean(room.host?.isHost);

  useEffect(() => {
    if (!currentPlayer) {
      setRenameName("");
      setEditingName(false);
      return;
    }
    if (!editingName) setRenameName(currentPlayer.name);
  }, [currentPlayer?.id, currentPlayer?.name, editingName]);

  async function updatePhase(phase) {
    if (!isHost) return;
    const data = await api(`/api/rooms/${room.id}/phase`, { method: "POST", body: { phase, playerToken, hostToken } });
    onRoomChange(data.room);
  }

  async function joinSeat(seatId) {
    const data = await api(`/api/rooms/${room.id}/join`, {
      method: "POST",
      body: { seatId, playerName: playerName.trim() || "玩家", playerToken, hostToken }
    });
    saveRoomToken(room.id, data.playerToken);
    onPlayerTokenChange(data.playerToken);
    onRoomChange(data.room);
  }

  function startRename() {
    setRenameName(currentPlayer?.name || "");
    setEditingName(true);
  }

  function cancelRename() {
    setRenameName(currentPlayer?.name || "");
    setEditingName(false);
  }

  async function renamePlayer(event) {
    event.preventDefault();
    if (!currentPlayer || !renameName.trim()) return;
    setRenaming(true);
    try {
      const data = await api(`/api/rooms/${room.id}/name`, {
        method: "POST",
        body: { playerName: renameName.trim(), playerToken, hostToken }
      });
      setEditingName(false);
      onRoomChange(data.room);
    } finally {
      setRenaming(false);
    }
  }

  async function copyInvite() {
    await navigator.clipboard?.writeText(inviteUrl(room.id));
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!text.trim() || !currentPlayer) return;
    const data = await api(`/api/rooms/${room.id}/message`, {
      method: "POST",
      body: { seatId: currentPlayer.id, text: text.trim(), playerToken, hostToken }
    });
    setText("");
    onRoomChange(data.room);
  }

  async function runAiTurn() {
    if (!isHost) return;
    setThinking(true);
    try {
      const data = await api(`/api/rooms/${room.id}/ai-turn`, { method: "POST", body: { playerToken, hostToken } });
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
          <h1>{room.seats.length} 人局 · {room.aiSeats} 位 AI 入局</h1>
          <p>
            当前阶段：{room.phase} · 打法方案：{modeLabel(personaModes, room.personaMode)} · AI：{runtimeLabel(room.aiRuntime)} · 消息 {room.messages.length}
          </p>
          <p className="host-note">{isHost ? "房主控制台已解锁" : "玩家视图：等待房主推进流程"}</p>
        </div>
        <div className="room-actions">
          <button type="button" onClick={runAiTurn} disabled={thinking || !isHost}>
            <Sparkles size={18} />
            {thinking ? "思考中" : "AI 发言"}
          </button>
          <button className="secondary-button" type="button" onClick={advancePhase} disabled={!isHost}>
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
          <PlayerJoinPanel
            room={room}
            currentPlayer={currentPlayer}
            playerName={playerName}
            renameName={renameName}
            editingName={editingName}
            renaming={renaming}
            onPlayerNameChange={setPlayerName}
            onRenameNameChange={setRenameName}
            onStartRename={startRename}
            onCancelRename={cancelRename}
            onRename={renamePlayer}
            onJoin={joinSeat}
            onCopyInvite={copyInvite}
          />

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

          <InteractiveTableStage
            room={room}
            currentPlayer={currentPlayer}
            playerName={playerName}
            onPlayerNameChange={setPlayerName}
            onJoin={joinSeat}
          />
          <Messages room={room} />

          {currentPlayer ? (
            <form className="composer" onSubmit={sendMessage}>
              <div className="composer-speaker">{currentPlayer.name}</div>
              <textarea
                rows="3"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="输入你这一轮想说的话"
              />
              <button type="submit">
                <Send size={18} />
                发送
              </button>
            </form>
          ) : humans.length > 0 ? (
            <div className="observer-bar">
              <UsersRound size={18} />
              先在左侧认领一个真人席位，认领后只会在本机显示你的隐藏身份。
            </div>
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
  const [playerToken, setPlayerToken] = useState("");
  const [hostToken, setHostToken] = useState("");

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
    if (route.page !== "room" || !route.roomId) {
      setRoomLoading(false);
      setPlayerToken("");
      setHostToken("");
      setError("");
      return;
    }
    setPlayerToken(getRoomToken(route.roomId));
    setHostToken(getRoomHostToken(route.roomId));
  }, [route.page, route.roomId]);

  useEffect(() => {
    if (route.page !== "room" || !route.roomId) return undefined;
    let cancelled = false;
    let timer = 0;

    async function loadRoom(showLoading = false) {
      if (showLoading) setRoomLoading(true);
      try {
        const data = await api(roomApiPath(route.roomId, playerToken, hostToken));
        if (!cancelled) {
          setRoom(data.room);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setRoom(null);
        }
      } finally {
        if (!cancelled) setRoomLoading(false);
      }
    }

    loadRoom(true);
    timer = window.setInterval(() => loadRoom(false), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [route.page, route.roomId, playerToken, hostToken]);

  async function createRoom(payload) {
    setError("");
    try {
      const data = await api("/api/rooms", { method: "POST", body: payload });
      setRoom(data.room);
      setPlayerToken("");
      if (data.hostToken) {
        saveRoomHostToken(data.room.id, data.hostToken);
        setHostToken(data.hostToken);
      }
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
          playerToken={playerToken}
          hostToken={hostToken}
          onPlayerTokenChange={setPlayerToken}
          onRoomChange={setRoom}
          onReset={() => {
            setRoom(null);
            setPlayerToken("");
            setHostToken("");
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
    if (route.page === "join") return <JoinPage onRoomFound={setRoom} />;
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
