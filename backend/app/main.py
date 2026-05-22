from __future__ import annotations

import json
import random
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from secrets import token_hex
from urllib.parse import parse_qs, urlparse


PORT = 8000
APP_DIR = Path(__file__).resolve().parent
ROOMS: dict[str, dict] = {}
SEAT_NAMES = ["北桥", "星野", "南风", "林深", "青石", "白夜", "洛川", "晨雾", "渡鸦", "季夏", "灰塔", "松间"]
PERSONA_KB = json.loads((APP_DIR / "personas.json").read_text(encoding="utf-8"))

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


def persona_modes() -> list[dict]:
    return PERSONA_KB["modes"]


def personas_for_game(game_id: str) -> list[dict]:
    return PERSONA_KB.get(game_id, [])


def compact_persona(persona: dict | None) -> dict:
    if not persona:
        return {
            "id": "default",
            "name": "默认玩家",
            "summary": "使用基础桌游发言策略。",
            "tags": [],
            "voice": [],
        }
    return {
        "id": persona["id"],
        "name": persona["name"],
        "summary": persona["summary"],
        "tags": persona.get("tags", []),
        "voice": persona.get("voice", []),
    }


def pick_persona(game_id: str, role: str, mode: str) -> dict:
    camp = role_camp(game_id, role)
    candidates = [
        persona
        for persona in personas_for_game(game_id)
        if role in persona.get("roles", []) and camp == persona.get("camp") and mode in persona.get("modes", [])
    ]
    if not candidates:
        candidates = [
            persona
            for persona in personas_for_game(game_id)
            if role in persona.get("roles", []) and camp == persona.get("camp")
        ]
    if not candidates:
        candidates = [persona for persona in personas_for_game(game_id) if camp == persona.get("camp")]
    return compact_persona(random.choice(candidates) if candidates else None)


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
    humans = clamp(payload.get("humanPlayers", total - 1), 0, total)
    persona_mode = payload.get("personaMode", "balanced")
    if persona_mode not in {mode["id"] for mode in persona_modes()}:
        persona_mode = "balanced"
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
                "persona": None if is_human else pick_persona(game["id"], roles[index], persona_mode),
                "alive": True,
            }
        )

    room = {
        "id": random_id("room"),
        "gameId": game["id"],
        "phase": game["phases"][0],
        "personaMode": persona_mode,
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
    if not candidates:
        candidates = [item for item in room["seats"] if item["id"] != seat["id"] and item["alive"]]
    return random.choice(candidates)["name"] if candidates else "上一位发言的人"


def has_tag(seat: dict, tag: str) -> bool:
    return tag in (seat.get("persona") or {}).get("tags", [])


def persona_prefix(seat: dict) -> str:
    persona = seat.get("persona")
    if not persona or persona["id"] == "default":
        return ""
    if random.random() < 0.38:
        return f"按我的{persona['name']}打法，"
    return ""


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

    if has_tag(seat, "fake_claim") and room["phase"] in {"白天发言", "投票放逐"}:
        return random.choice(
            [
                f"我可以先跳预言家。昨晚我验了 {target}，这个位置的反馈和发言不太对得上。",
                f"我这里给信息：{target} 不是我想放过的位置。如果有人对跳，现在就出来把警徽流说清楚。",
            ]
        )

    if has_tag(seat, "hard_push") and camp == "evil" and room["phase"] in {"白天发言", "投票放逐"}:
        return random.choice(
            [
                f"我直接打 {target}。TA 一直在补逻辑，这轮不出后面只会更乱。",
                f"别再散票了，我会归到 {target}。TA 的站边变化没有合理解释。",
            ]
        )

    if has_tag(seat, "bus_teammate") and camp == "evil" and room["phase"] == "白天发言":
        return f"我不会因为谁发言像同阵营就保。{target} 这一轮有明显补视角，我愿意先轻踩。"

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
    second_target = other_seat_name(room, seat)

    if has_tag(seat, "hard_question") and room["phase"] in {"开局确认", "圆桌讨论"}:
        return random.choice(
            [
                f"我会直接追问 {target}：你反对这车的标准是什么？只说感觉不够。",
                f"{target} 需要给出可复盘的理由，不然我会把 TA 放进低信任位。",
            ]
        )

    if has_tag(seat, "create_noise") and room["phase"] in {"圆桌讨论", "队伍投票"}:
        return random.choice(
            [
                f"我不想让讨论只围绕车上。{target} 和 {second_target} 的互踩也很像提前设计过。",
                f"现在最危险的是默认某些人干净。{target} 的反应太顺了，我会优先拆这个视角。",
            ]
        )

    if room["phase"] == "开局确认":
        if camp == "evil":
            return random.choice(
                [
                    f"我先观察发言节奏。{target} 如果过早给强结论，我会把 TA 放进重点观察位。",
                    f"第一轮信息少，我不会急着保人。{target} 的标准如果变来变去，后面要重点追问。",
                    f"我想先看谁主动定义好人标准。{target} 现在还不能放过，但也没到直接打死。",
                ]
            )
        if seat["role"] == "梅林":
            return random.choice(
                [
                    f"我会先控制信息量，只看谁急着定队伍。{target} 的第一轮标准值得记录。",
                    f"开局我更看重投票逻辑，不会只听身份感。{target} 和 {second_target} 的互动可以先记下来。",
                    f"先别把话说死。{target} 如果持续给出过准判断，我反而会更谨慎。",
                ]
            )
        return random.choice(
            [
                f"我先不急着站边，重点看 {target} 的组队标准是不是前后一致。",
                f"开局先记标准。{target} 讲理由时如果只给结论，我会降低信任。",
                f"我会看谁愿意解释反对票。{target} 和 {second_target} 这轮的态度差异值得观察。",
            ]
        )

    if room["phase"] == "组队提名":
        if camp == "evil":
            return random.choice(
                [
                    f"我建议队伍里带 {target} 和我。这个组合发言压力比较低，后续任务结果也更好判断。",
                    f"这轮我不想上太复杂的车，{target} 加我就够了，先让任务给信息。",
                    f"我会提一个低冲突队伍：我和 {target}。如果有人强反对，请给具体原因。",
                ]
            )
        if seat["role"] == "梅林":
            return random.choice(
                [
                    f"我会倾向排除发言太顺的人，队伍可以先从我、{target} 开始，但还要听反对理由。",
                    f"提名不要只看谁像好人。我更想让 {target} 上车，同时听 {second_target} 的反对点。",
                    f"我可以接受我和 {target} 先试一车，但不希望大家无脑通过。",
                ]
            )
        return random.choice(
            [
                f"第一轮我更想上发言清楚的人。{target} 可以进队，{ai_target} 暂时观察。",
                f"我倾向让 {target} 上车，因为 TA 至少给了标准；{ai_target} 先留在车下看票型。",
                f"这车最好不要全凭感觉。{target} 可以试，{ai_target} 需要再给一轮解释。",
            ]
        )

    if room["phase"] == "队伍投票":
        if camp == "evil":
            return random.choice(
                [
                    "我会同意这车。现在反复换队只会让信息更乱，先让任务给结果。",
                    f"我倾向通过。{target} 反对得有点泛，没有指出车上具体哪一位危险。",
                    "这车不是完美，但第一轮需要信息。我先同意，任务后再复盘票型。",
                ]
            )
        return random.choice(
            [
                "我不太满意这车的解释。如果提名人不能说明为什么排除某些人，我会投反对。",
                f"我会投反对。{target} 的理由太像补出来的，车上风险没有讲清楚。",
                f"我想先否掉这车。{target} 和 {second_target} 的互保关系还没解释干净。",
            ]
        )

    if room["phase"] == "任务结果":
        if camp == "evil":
            return random.choice(
                [
                    f"任务结果不能只看失败牌，关键是车上谁提前铺了退路。{target} 这点比较明显。",
                    f"我更想追 {target} 的投票，不是只看任务成败。TA 前面已经给自己留了退路。",
                    f"如果任务失败，我不会只打车上。{target} 在车下的反应也很像提前准备过。",
                ]
            )
        return random.choice(
            [
                f"先把车上和车下的发言分开看。{target} 如果一直只攻击结果，不解释投票，我会降低信任。",
                f"任务结果只是一个信息点。{target} 需要解释为什么投票和现在的指控能对上。",
                f"我会同时看车上责任和车下带节奏。{target} 现在的复盘有点跳步。",
            ]
        )

    if room["phase"] == "刺杀梅林":
        if seat["role"] == "刺客":
            return random.choice(
                [
                    f"我会从知道太多但不敢直说的人里找梅林。{target} 的站边有点过于精准。",
                    f"最后我会看谁一直在保护关键好人又不敢说死。{target} 比较像这个位置。",
                    f"刺杀要找信息源，不是找发言最强的人。{target} 的判断命中率值得怀疑。",
                ]
            )
        return random.choice(
            [
                "最后阶段不要给梅林画像。我们只复盘投票，不暴露信息位。",
                f"不要替坏人缩小范围。{target} 这时如果还在画像梅林，我会直接反对。",
                "现在只讨论票型和任务线，不讨论谁像信息位。",
            ]
        )

    if camp == "evil":
        return random.choice(
            [
                f"我觉得 {target} 的逻辑有点过度自信。阿瓦隆里太确定的人经常是在藏视角。",
                f"{target} 的结论来得太快，我更想听 TA 为什么排除了其他可能。",
                f"我不想让讨论只围着我转。{target} 的投票和发言也需要被检验。",
            ]
        )

    return random.choice(
        [
            f"我想把提名理由写清楚：谁上车、谁不上车、为什么。{target} 这轮需要给出标准。",
            f"现在不要只说感觉。{target} 的投票和发言能不能对上，是我判断的重点。",
            f"这局先控信息量。{ai_target} 的发言有价值，但我还没到完全信任。",
            f"我会追问 {target} 的反对理由。只说不舒服不够，要能落到车和票上。",
            f"{target} 和 {second_target} 的判断方向不一样，我想先听他们各自补一轮逻辑。",
        ]
    )


def generate_ai_reply(room: dict, seat: dict) -> str:
    preface = "我直接一点，" if seat["style"] == "进攻" else "我先保守说，" if seat["style"] == "保守" else ""
    body = generate_werewolf_reply(room, seat) if room["gameId"] == "werewolf" else generate_avalon_reply(room, seat)
    return f"{preface}{persona_prefix(seat)}{body}"


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
        parsed = urlparse(self.path)
        path = parsed.path
        if path == "/api/games":
            self.send_json({"games": list(GAMES.values())})
            return

        if path == "/api/personas":
            game_id = parse_qs(parsed.query).get("gameId", [""])[0]
            self.send_json({"modes": persona_modes(), "personas": personas_for_game(game_id)})
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
