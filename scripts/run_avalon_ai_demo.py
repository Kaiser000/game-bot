from __future__ import annotations

import argparse
import json
import random
import re
import statistics
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.main import append_message, create_room, generate_ai_reply  # noqa: E402


PHASES = ["开局确认", "组队提名", "圆桌讨论", "队伍投票", "任务结果", "刺杀梅林"]
PHASE_KEYWORDS = {
    "开局确认": ["观察", "标准", "站边", "信息量"],
    "组队提名": ["队伍", "进队", "提名", "上车"],
    "圆桌讨论": ["标准", "投票", "发言", "逻辑", "信任"],
    "队伍投票": ["同意", "反对", "投"],
    "任务结果": ["任务", "结果", "失败牌", "车上", "车下"],
    "刺杀梅林": ["梅林", "画像", "复盘", "刺"],
}
FORBIDDEN_SELF_REVEAL = ["我是梅林", "我是刺客", "我是莫甘娜", "我是爪牙", "我是坏人"]
FALLBACK_TARGET = "上一位发言的人"


def run_single_game(game_index: int, seed: int) -> dict:
    random.seed(seed)
    room = create_room({"gameId": "avalon", "targetPlayers": 8, "humanPlayers": 0})
    phase_scores = []
    transcript = []

    for phase in PHASES:
        room["phase"] = phase
        append_message(room, "系统", f"阶段切换到：{phase}", "system")
        messages = []
        for seat in room["seats"]:
            text = generate_ai_reply(room, seat)
            message = append_message(room, seat["name"], text, seat_id=seat["id"])
            messages.append(message)
            transcript.append({"phase": phase, "speaker": seat["name"], "role": seat["role"], "text": text})
        phase_scores.append(score_phase(phase, messages))

    score = score_game(room, phase_scores)
    return {
        "gameIndex": game_index,
        "seed": seed,
        "score": score,
        "roomId": room["id"],
        "roles": {seat["name"]: seat["role"] for seat in room["seats"]},
        "phaseScores": phase_scores,
        "transcript": transcript,
    }


def score_phase(phase: str, messages: list[dict]) -> dict:
    texts = [message["text"] for message in messages]
    signatures = [normalize_text(text) for text in texts]
    keyword_hits = sum(any(keyword in text for keyword in PHASE_KEYWORDS[phase]) for text in texts)
    target_fallbacks = sum(FALLBACK_TARGET in text for text in texts)
    self_reveals = sum(any(term in text for term in FORBIDDEN_SELF_REVEAL) for text in texts)
    too_short = sum(len(text) < 18 for text in texts)
    duplicate_count = len(texts) - len(set(texts))
    template_duplicates = len(signatures) - len(set(signatures))
    return {
        "phase": phase,
        "messages": len(messages),
        "keywordHitRate": round(keyword_hits / len(messages), 3),
        "fallbackTargets": target_fallbacks,
        "selfReveals": self_reveals,
        "tooShort": too_short,
        "duplicates": duplicate_count,
        "templateDuplicates": template_duplicates,
    }


def normalize_text(text: str) -> str:
    text = re.sub(r"AI-[^\s，。；、]+", "<seat>", text)
    text = re.sub(r"玩家\d+", "<seat>", text)
    text = re.sub(r"\s+", "", text)
    return text


def score_game(room: dict, phase_scores: list[dict]) -> dict:
    all_messages = [message for message in room["messages"] if message["type"] == "chat"]
    text_lengths = [len(message["text"]) for message in all_messages]
    keyword_rate = statistics.mean(phase["keywordHitRate"] for phase in phase_scores)
    fallback_targets = sum(phase["fallbackTargets"] for phase in phase_scores)
    self_reveals = sum(phase["selfReveals"] for phase in phase_scores)
    too_short = sum(phase["tooShort"] for phase in phase_scores)
    duplicates = sum(phase["duplicates"] for phase in phase_scores)
    template_duplicates = sum(phase["templateDuplicates"] for phase in phase_scores)
    speaker_counts = Counter(message["speaker"] for message in all_messages)

    score = 80
    score -= fallback_targets * 8
    score -= self_reveals * 15
    score -= too_short * 3
    score -= duplicates * 2
    score -= template_duplicates * 2
    score += round(keyword_rate * 15)
    score += 5 if len(speaker_counts) == 8 and min(speaker_counts.values()) == len(PHASES) else 0

    return {
        "total": max(0, min(100, score)),
        "chatMessages": len(all_messages),
        "averageLength": round(statistics.mean(text_lengths), 1),
        "keywordHitRate": round(keyword_rate, 3),
        "fallbackTargets": fallback_targets,
        "selfReveals": self_reveals,
        "tooShort": too_short,
        "duplicates": duplicates,
        "templateDuplicates": template_duplicates,
        "speakerBalance": dict(sorted(speaker_counts.items())),
    }


def summarize(results: list[dict]) -> dict:
    best = max(results, key=lambda item: item["score"]["total"])
    scores = [item["score"]["total"] for item in results]
    return {
        "games": len(results),
        "bestGameIndex": best["gameIndex"],
        "bestScore": best["score"]["total"],
        "averageScore": round(statistics.mean(scores), 1),
        "minScore": min(scores),
        "maxScore": max(scores),
        "totalMessages": sum(item["score"]["chatMessages"] for item in results),
        "totalFallbackTargets": sum(item["score"]["fallbackTargets"] for item in results),
        "totalSelfReveals": sum(item["score"]["selfReveals"] for item in results),
        "totalTemplateDuplicates": sum(item["score"]["templateDuplicates"] for item in results),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Run repeated 8-player all-AI Avalon demos.")
    parser.add_argument("--games", type=int, default=12)
    parser.add_argument("--seed", type=int, default=20260522)
    parser.add_argument("--out", type=Path, default=ROOT / "docs" / "avalon-ai-demo-results.json")
    args = parser.parse_args()

    results = [run_single_game(index + 1, args.seed + index) for index in range(args.games)]
    payload = {"summary": summarize(results), "results": results}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(payload["summary"], ensure_ascii=False, indent=2))
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
