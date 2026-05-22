import { useEffect, useMemo, useState } from "react";
import { Bot, CirclePlay, Send, Sparkles } from "lucide-react";
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

function Setup({ games, personaModes, onCreate }) {
  const [gameId, setGameId] = useState(games[0]?.id || "werewolf");
  const game = games.find((item) => item.id === gameId) || games[0];
  const [targetPlayers, setTargetPlayers] = useState(game?.defaultTarget || 12);
  const [humanPlayers, setHumanPlayers] = useState(Math.max(1, (game?.defaultTarget || 12) - 1));
  const [personaMode, setPersonaMode] = useState("balanced");

  useEffect(() => {
    if (!game) return;
    setTargetPlayers(game.defaultTarget);
    setHumanPlayers(Math.max(1, game.defaultTarget - 1));
  }, [game?.id]);

  const avalon = games.find((item) => item.id === "avalon");

  return (
    <section className="setup-panel">
      <div className="brand-row">
        <div className="brand-mark" aria-hidden="true">
          <Bot size={34} />
        </div>
        <div>
          <h1>桌游 AI 补位</h1>
          <p>缺一个人也能开局，让 AI 先坐上空位陪你们跑文字局。</p>
        </div>
      </div>

      <form
        className="setup-grid"
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
        <button type="submit">
          <CirclePlay size={18} />
          创建文字局
        </button>
      </form>

      {avalon && (
        <button
          className="quick-demo"
          type="button"
          onClick={() => onCreate({ gameId: "avalon", targetPlayers: 8, humanPlayers: 0, personaMode })}
        >
          <Sparkles size={18} />
          8 人阿瓦隆全 AI 演示
        </button>
      )}

      <div className="demo-strip" aria-hidden="true">
        <span>身份分配</span>
        <span>阶段推进</span>
        <span>真人发言</span>
        <span>AI 补位</span>
      </div>
    </section>
  );
}

function SeatList({ room }) {
  return (
    <div className="seat-list">
      {room.seats.map((seat) => (
        <article className="seat" key={seat.id}>
          <div>
            <strong>{seat.name}</strong>
            <small>{seat.type === "human" ? "真人玩家" : `${seat.style}型 AI · ${seat.persona?.name || "默认玩家"}`}</small>
            {seat.persona?.summary && <em>{seat.persona.summary}</em>}
          </div>
          <div className="seat-tags">
            <span className={`tag ${seat.type === "ai" ? "ai" : "human"}`}>{seat.type === "ai" ? "AI" : "真人"}</span>
            <span className={`tag ${roleCamp(room.gameId, seat.role)}`}>{seat.role}</span>
          </div>
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

function Room({ room, games, onRoomChange }) {
  const [text, setText] = useState("");
  const [speakerId, setSpeakerId] = useState(room.seats.find((seat) => seat.type === "human")?.id || "");
  const [thinking, setThinking] = useState(false);
  const game = useMemo(() => games.find((item) => item.id === room.gameId), [games, room.gameId]);
  const humans = room.seats.filter((seat) => seat.type === "human");

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

  return (
    <section className="room-panel">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">{game?.name || "桌游房间"}</p>
          <h2>{room.seats.length} 人局 · {room.aiSeats} 位 AI 补位</h2>
          <p className="room-meta">打法方案：{room.personaMode || "balanced"}</p>
        </div>

        <label className="phase-control">
          <span>阶段</span>
          <select value={room.phase} onChange={(event) => updatePhase(event.target.value)}>
            {game?.phases.map((phase) => (
              <option key={phase} value={phase}>
                {phase}
              </option>
            ))}
          </select>
        </label>

        <SeatList room={room} />
      </aside>

      <section className="table-panel">
        <div className="table-toolbar">
          <div>
            <p className="eyebrow">圆桌发言</p>
            <h2>{room.phase}</h2>
          </div>
          <button type="button" onClick={runAiTurn} disabled={thinking}>
            <Sparkles size={18} />
            {thinking ? "思考中" : "AI 发言"}
          </button>
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
        <Room room={room} games={games} onRoomChange={setRoom} />
      ) : (
        <Setup games={games} personaModes={personaModes} onCreate={createRoom} />
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
