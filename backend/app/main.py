from __future__ import annotations

import json
import random
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from secrets import token_hex
from urllib.parse import urlparse


PORT = 8000
ROOMS: dict[str, dict] = {}
SEAT_NAMES = ["北桥", "星野", "南风", "林深", "青石", "白夜", "洛川", "晨雾", "渡鸦", "季夏", "灰塔", "松间"]

GAMES = {
    "werewolf": {
        "id": "werewolf",
        "name": "狼人杀",
        "minPlayers": 6,
        "maxPlayers": 12,
        "defaultTarget": 12,
        "phases": ["开局确认", "夜晚行动", "白天发言", "投票放逐", "复盘"],
    },
    "avalon": {
        "id": "avalon",
        "name": "阿瓦隆",
        "minPlayers": 5,
        "maxPlayers": 10,
        "defaultTarget": 8,
        "phases": ["开局确认", "组队提名", "圆桌讨论", "队伍投票", "任务结果", "刺杀梅林"],
    },
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def random_id(prefix: str) -> str:
    return f"{prefix}_{token_hex(5)}"


def clamp(value: int | None, minimum: int, maximum: int) -> int:
    if value is None:
        return minimum
    return min(maximum, max(minimum, int(value)))


def role_plan(game_id: str, players: int) -> list[str]:
    if game_id == "werewolf":
        if players <= 6:
            return ["狼人", "狼人", "预言家", "女巫", "村民", "村民"][:players]
        if players <= 9:
            return ["狼人", "狼人", "狼人", "预言家", "女巫", "猎人", "村民", "村民", "村民"][:players]
        return ["狼人", "狼人", "狼人", "狼人", "预言家", "女巫", "猎人", "守卫", "村民", "村民", "村民", "村民"][:players]

    bad_count = 2 if players <= 6 else 3 if players <= 9 else 4
    roles = ["梅林", "派西维尔", "刺客"]
    for index in range(1, bad_count):
        roles.append("莫甘娜" if index == 1 else "爪牙")
    while len(roles) < players:
        roles.append("忠臣")
    return roles[:players]


def public_room(room: dict) -> dict:
    return {
        **room,
        "game": GAMES[room["gameId"]],
        "aiSeats": len([seat for seat in room["seats"] if seat["type"] == "ai"]),
    }


def append_message(room: dict, speaker: str, text: str, message_type: str = "chat", seat_id: str | None = None) -> dict:
    message = {
        "id": random_id("msg"),
        "speaker": speaker,
        "seatId": seat_id,
        "type": message_type,
        "text": str(text)[:900],
        "at": now_iso(),
    }
    room["messages"].append(message)
    if len(room["messages"]) > 160:
        room["messages"] = room["messages"][-160:]
    return message


def create_room(payload: dict) -> dict:
    game = GAMES.get(payload.get("gameId"), GAMES["werewolf"])
    total = clamp(payload.get("targetPlayers", game["defaultTarget"]), game["minPlayers"], game["maxPlayers"])
    humans = clamp(payload.get("humanPlayers", total - 1), 1, total)
    roles = role_plan(game["id"], total)
    names = SEAT_NAMES[:]
    random.shuffle(roles)
    random.shuffle(names)

    seats = []
    for index in range(total):
        is_human = index < humans
        seats.append(
            {
                "id": f"seat_{index + 1}",
                "name": f"玩家{index + 1}" if is_human else f"AI-{names[index]}",
                "type": "human" if is_human else "ai",
                "role": roles[index],
                "style": "human" if is_human else ["稳健", "进攻", "观察", "保守"][index % 4],
                "alive": True,
            }
        )

    room = {
        "id": random_id("room"),
        "gameId": game["id"],
        "phase": game["phases"][0],
        "createdAt": now_iso(),
        "seats": seats,
        "messages": [],
    }
    append_message(room, "系统", f"已创建 {game['name']} {total} 人局，其中 {humans} 位真人，{total - humans} 位 AI 补位。", "system")
    ROOMS[room["id"]] = room
    return room


def role_camp(game_id: str, role: str) -> str:
    if game_id == "werewolf":
        return "evil" if role == "狼人" else "good"
    return "evil" if role in {"刺客", "莫甘娜", "爪牙", "莫德雷德"} else "good"


def recent_text(room: dict) -> str:
    return " ".join(f"{message['speaker']}: {message['text']}" for message in room["messages"][-6:] if message["type"] != "system")


def other_seat_name(room: dict, seat: dict, seat_type: str = "human") -> str:
    candidates = [item for item in room["seats"] if item["id"] != seat["id"] and item["type"] == seat_type and item["alive"]]
    return random.choice(candidates)["name"] if candidates else "上一位发言的人"


def generate_werewolf_reply(room: dict, seat: dict) -> str:
    camp = role_camp(room["gameId"], seat["role"])
    target = other_seat_name(room, seat)
    latest = recent_text(room)
    suspicion = any(word in latest for word in ["狼人", "可疑", "票", "冲"])

    if room["phase"] == "夜晚行动":
        if seat["role"] == "预言家":
            return f"我会先验 {target}。白天我不会直接跳太满，先看 TA 的发言有没有前后矛盾。"
        if seat["role"] == "女巫":
            return "我倾向先留药，除非第一晚信息特别极端。现在更重要的是记住谁在带节奏。"
        if seat["role"] == "狼人":
            return f"夜里我想避开存在感太低的人，优先处理能整理逻辑的位置，比如 {target}。"
        return "夜晚阶段我没有主动技能，先听信息位白天怎么报，再决定站边。"

    if room["phase"] == "投票放逐":
        if camp == "evil":
            return f"我这一票会压给 {target}。TA 的发言像是在补逻辑，像临时找理由。"
        return f"我会优先票信息闭环最差的人。现在 {target} 的解释还不够完整。"

    if camp == "evil":
        if suspicion:
            return f"我不太认同现在把焦点直接打死。{target} 虽然有问题，但更像紧张，不一定是狼。"
        return f"我先给一个软站边：{target} 的视角有点窄，我想听 TA 再解释一下为什么这么判断。"

    if seat["role"] == "预言家":
        return f"我会把关注点放在发言顺序和票型上。{target} 如果继续只给结论不给原因，我会很想验 TA。"

    return random.choice(
        [
            f"我先不急着定身份。{target} 的发言有信息，但还缺一个明确的怀疑链。",
            f"现在场上最大的问题是有人在跟票。{target} 需要说清楚自己上一轮为什么转向。",
            f"我偏向听完整圈再投。单看当前发言，{target} 的逻辑压力最大。",
        ]
    )


def generate_avalon_reply(room: dict, seat: dict) -> str:
    camp = role_camp(room["gameId"], seat["role"])
    target = other_seat_name(room, seat)
    ai_target = other_seat_name(room, seat, "ai")

    if room["phase"] == "组队提名":
        if camp == "evil":
            return f"我建议队伍里带 {target} 和我。这个组合发言压力比较低，后续任务结果也更好判断。"
        if seat["role"] == "梅林":
            return f"我会倾向排除发言太顺的人，队伍可以先从我、{target} 开始，但还要听反对理由。"
        return f"第一轮我更想上发言清楚的人。{target} 可以进队，{ai_target} 暂时观察。"

    if room["phase"] == "队伍投票":
        if camp == "evil":
            return "我会同意这车。现在反复换队只会让信息更乱，先让任务给结果。"
        return "我不太满意这车的解释。如果提名人不能说明为什么排除某些人，我会投反对。"

    if room["phase"] == "任务结果":
        if camp == "evil":
            return f"任务结果不能只看失败牌，关键是车上谁提前铺了退路。{target} 这点比较明显。"
        return f"先把车上和车下的发言分开看。{target} 如果一直只攻击结果，不解释投票，我会降低信任。"

    if room["phase"] == "刺杀梅林":
        if seat["role"] == "刺客":
            return f"我会从知道太多但不敢直说的人里找梅林。{target} 的站边有点过于精准。"
        return "最后阶段不要给梅林画像。我们只复盘投票，不暴露信息位。"

    if camp == "evil":
        return f"我觉得 {target} 的逻辑有点过度自信。阿瓦隆里太确定的人经常是在藏视角。"

    return random.choice(
        [
            f"我想把提名理由写清楚：谁上车、谁不上车、为什么。{target} 这轮需要给出标准。",
            f"现在不要只说感觉。{target} 的投票和发言能不能对上，是我判断的重点。",
            f"这局先控信息量。{ai_target} 的发言有价值，但我还没到完全信任。",
        ]
    )


def generate_ai_reply(room: dict, seat: dict) -> str:
    preface = "我直接一点，" if seat["style"] == "进攻" else "我先保守说，" if seat["style"] == "保守" else ""
    body = generate_werewolf_reply(room, seat) if room["gameId"] == "werewolf" else generate_avalon_reply(room, seat)
    return f"{preface}{body}"


class ApiHandler(BaseHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "http://localhost:5173")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/games":
            self.send_json({"games": list(GAMES.values())})
            return

        parts = path.strip("/").split("/")
        if len(parts) == 3 and parts[:2] == ["api", "rooms"]:
            room = ROOMS.get(parts[2])
            if room:
                self.send_json({"room": public_room(room)})
            else:
                self.send_json({"detail": "Room not found"}, HTTPStatus.NOT_FOUND)
            return

        self.send_json({"detail": "Not found"}, HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        payload = self.read_json()

        if path == "/api/rooms":
            room = create_room(payload)
            self.send_json({"room": public_room(room)}, HTTPStatus.CREATED)
            return

        parts = path.strip("/").split("/")
        if len(parts) != 4 or parts[:2] != ["api", "rooms"]:
            self.send_json({"detail": "Not found"}, HTTPStatus.NOT_FOUND)
            return

        room = ROOMS.get(parts[2])
        action = parts[3]
        if room is None:
            self.send_json({"detail": "Room not found"}, HTTPStatus.NOT_FOUND)
            return

        if action == "message":
            seat = next((item for item in room["seats"] if item["id"] == payload.get("seatId")), None)
            speaker = seat["name"] if seat else payload.get("speaker", "玩家")
            message = append_message(room, speaker, payload.get("text", ""), seat_id=seat["id"] if seat else None)
            self.send_json({"room": public_room(room), "message": message}, HTTPStatus.CREATED)
            return

        if action == "phase":
            phase = payload.get("phase")
            if phase not in GAMES[room["gameId"]]["phases"]:
                self.send_json({"detail": "Unknown phase"}, HTTPStatus.BAD_REQUEST)
                return
            room["phase"] = phase
            append_message(room, "系统", f"阶段切换到：{phase}", "system")
            self.send_json({"room": public_room(room)})
            return

        if action == "ai-turn":
            ai_seats = [seat for seat in room["seats"] if seat["type"] == "ai" and seat["alive"]]
            if payload.get("seatId"):
                ai_seats = [seat for seat in ai_seats if seat["id"] == payload["seatId"]]
            messages = [append_message(room, seat["name"], generate_ai_reply(room, seat), seat_id=seat["id"]) for seat in ai_seats]
            self.send_json({"room": public_room(room), "messages": messages}, HTTPStatus.CREATED)
            return

        self.send_json({"detail": "Not found"}, HTTPStatus.NOT_FOUND)

    def read_json(self) -> dict:
        length = int(self.headers.get("content-length", "0"))
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args) -> None:
        return


def main() -> None:
    server = ThreadingHTTPServer(("localhost", PORT), ApiHandler)
    print(f"Python API server running at http://localhost:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
