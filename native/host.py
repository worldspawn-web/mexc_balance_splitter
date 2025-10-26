#!/usr/bin/env python3
"""
Native host for MEXC Balance Splitter.

Accepts:
{
  "action": "compute",
  "balance": <float|str>,
  "percent": <float>,   # default 1.0
  "steps": <int>,       # default 3
  "decimals": <int>     # default 2
}

Returns:
{ "target": <float>, "legs": [<float> ...] }
"""
from __future__ import annotations

import io
import json
import struct
import sys
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP, getcontext

# more precision for money math
getcontext().prec = 28


@dataclass
class SplitResult:
    target: Decimal
    legs: tuple[Decimal, ...]


def _read_message(stdin: io.BufferedReader) -> dict | None:
    raw_length = stdin.read(4)
    if len(raw_length) == 0:
        return None
    if len(raw_length) < 4:
        return None
    message_length = struct.unpack("<I", raw_length)[0]
    if message_length == 0:
        return None
    data = stdin.read(message_length)
    if not data:
        return None
    try:
        return json.loads(data.decode("utf-8"))
    except json.JSONDecodeError:
        return None


def _send_message(stdout: io.BufferedWriter, message: dict) -> None:
    data = json.dumps(message, separators=(",", ":")).encode("utf-8")
    stdout.write(struct.pack("<I", len(data)))
    stdout.write(data)
    stdout.flush()


def split_balance(balance: Decimal, percent: Decimal, steps: int, decimals: int) -> SplitResult:
    """
    Compute <percent>% of balance, split into <steps> legs, and round to <decimals>.
    Ensures sum(legs) == rounded target (with minimal unit adjustments).
    """
    d = max(0, min(8, int(decimals)))
    n = max(1, int(steps))
    q = (Decimal(10) ** -d)

    target = (balance * (percent / Decimal("100"))).quantize(q, rounding=ROUND_HALF_UP)
    base = target / Decimal(n)

    legs = [base.quantize(q, rounding=ROUND_HALF_UP) for _ in range(n)]
    remainder = target - sum(legs)

    # distribute remainder in minimal units
    step = q if remainder >= 0 else -q
    i = 0
    while remainder != 0:
        legs[i % n] += step
        remainder = target - sum(legs)
        i += 1

    return SplitResult(target=target, legs=tuple(legs))


def main() -> None:
    stdin = sys.stdin.buffer
    stdout = sys.stdout.buffer

    while True:
        msg = _read_message(stdin)
        if msg is None:
            break
        try:
            if msg.get("action") != "compute":
                _send_message(stdout, {"__error": "Unsupported action"})
                continue

            balance = Decimal(str(msg.get("balance", "0")))
            percent = Decimal(str(msg.get("percent", "1")))
            steps = int(msg.get("steps", 3))
            decimals = int(msg.get("decimals", 2))

            res = split_balance(balance, percent, steps, decimals)
            q = (Decimal(10) ** -max(0, min(8, int(decimals))))
            payload = {
                "target": float(res.target.quantize(q, rounding=ROUND_HALF_UP)),
                "legs": [float(x.quantize(q, rounding=ROUND_HALF_UP)) for x in res.legs],
            }
            _send_message(stdout, payload)

        except Exception as exc:  # noqa: BLE001
            _send_message(stdout, {"__error": str(exc)})


if __name__ == "__main__":
    main()
