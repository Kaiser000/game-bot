import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  BrainCircuit,
  CirclePlay,
  Clock3,
  Library,
  MessageSquareText,
  RefreshCw,
  Send,
  Sparkles,
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

function Setup({ games, personaModes, onCreate }) {
  const [gameId, setGameId] = useState(games[0]?.id || "werewolf");
  const game = games.find((item) => item.id === gameId) || games[0];
  const [targetPlayers, setTargetPlayers] = useState(game?.defaultTarget || 12);
  const [humanPlayers, setHumanPlayers] = useState(Math.max(1, (game?.defaultTarget || 12) - 1));
  const [personaMode, setPersonaMode] = useState("balanced");
  const [personas, setPersonas] = useState([]);

  useEffect(() => {
    if (!game) return;
    setTargetPlayers(game.defaultTarget);
    setHumanPlayers(Math.max(1, game.defaultTarget - 1));
  }, [game?.id]);

  useEffect(() => {
    if (!gameId) return;
    api(`/api/personas?gameId=${gameId}`).then((data) => setPersonas(data.personas)).catch(() => setPersonas([]));
  }, [gameId]);

  const selectedMode = personaModes.find((mode) => mode.id === personaMode);
  const aiSeats = Math.max(0, targetPlayers - humanPlayers);
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
            onCreate({ gameId, targetPlayers, humanPlayers, personaMode });
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

          <div className="number-row">
            <label>
              <span>目标人数</span>
              <input
                type="number"
                min={game?.minPlayers}
                max={game?.maxPlayers}
                value={targetPlayers}
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
                onClick={() => onCreate({ gameId: "avalon", targetPlayers: 8, humanPlayers: 0, personaMode })}
              >
                <Sparkles size={18} />
                8 人全 AI
              </button>
            )}
          </div>
        </form>
      </div>

      <KnowledgePanel personas={personas} title={`${game?.name || "游戏"}打法库`} compact />
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
              <span className={`tag ${persona.camp}`}>{persona.camp === "evil" ? "坏人" : "好人"}</span>
            </div>
            <p>{persona.summary}</p>
            <div className="mini-tags">
              {persona.roles?.slice(0, 4).map((role) => (
                <span key={role}>{role}</span>
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
          <p className="eyebrow">{game?.name || "桌游房间"}</p>
          <h1>{room.seats.length} 人局 · {room.aiSeats} 位 AI 补位</h1>
          <p>
            当前阶段：{room.phase} · 打法方案：{modeLabel(personaModes, room.personaMode)} · 消息 {room.messages.length}
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

  useEffect(() => {
    Promise.all([api("/api/games"), api("/api/personas")])
      .then(([gamesData, personasData]) => {
        setGames(gamesData.games);
        setPersonaModes(personasData.modes);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function createRoom(payload) {
    setError("");
    try {
      const data = await api("/api/rooms", { method: "POST", body: payload });
      setRoom(data.room);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="app-shell">
      {error && <div className="error-banner">{error}</div>}
      {room ? (
        <Room room={room} games={games} personaModes={personaModes} onRoomChange={setRoom} onReset={() => setRoom(null)} />
      ) : (
        <Setup games={games} personaModes={personaModes} onCreate={createRoom} />
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
