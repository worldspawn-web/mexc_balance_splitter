#!/usr/bin/env python3
"""
MEXC Balance Splitter native messaging host.

Reads messages from stdin, computes 1% of balance and splits into 3 rounded legs,
ensuring the sum of legs matches the rounded 1% value. Communicates using the
Native Messaging protocol (4-byte little-endian length + UTF-8 JSON).
"""
from __future__ import annotations

import io
import json
import struct
import sys
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP, getcontext

# Set enough precision for money math
getcontext().prec = 28


@dataclass
class SplitResult:
    one_percent: Decimal
    legs: tuple[Decimal, Decimal, Decimal]

    def to_jsonable(self, decimals: int) -> dict:
        q = Decimal(10) ** -decimals
        return {
            "onePercent": float(self.one_percent.quantize(q, rounding=ROUND_HALF_UP)),
            "legs": [
                float(self.legs[0].quantize(q, rounding=ROUND_HALF_UP)),
                float(self.legs[1].quantize(q, rounding=ROUND_HALF_UP)),
                float(self.legs[2].quantize(q, rounding=ROUND_HALF_UP)),
            ],
        }


def _read_message(stdin: io.BufferedReader) -> dict | None:
    """Read a single Native Messaging message from stdin."""
    raw_length = stdin.read(4)
    if len(raw_length) == 0:
        return None  # EOF
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
    """Send a single Native Messaging message to stdout."""
    data = json.dumps(message, separators=(",", ":")).encode("utf-8")
    stdout.write(struct.pack("<I", len(data)))
    stdout.write(data)
    stdout.flush()


def split_balance(balance: Decimal, decimals: int = 2) -> SplitResult:
    """
    Compute 1% of the balance and split into 3 legs.
    The legs are rounded to the given decimals and adjusted so their sum equals the rounded 1%.
    """
    q = Decimal(10) ** -decimals
    one = (balance * Decimal("0.01")).quantize(q, rounding=ROUND_HALF_UP)
    base = one / Decimal(3)
    # Round each leg
    l1 = base.quantize(q, rounding=ROUND_HALF_UP)
    l2 = base.quantize(q, rounding=ROUND_HALF_UP)
    l3 = base.quantize(q, rounding=ROUND_HALF_UP)
    # Adjust for rounding remainder
    remainder = one - (l1 + l2 + l3)
    while remainder != 0:
        # Distribute the remainder in minimal increments to match 'one'
        if remainder > 0:
            l1 += q
        else:
            l1 -= q
        remainder = one - (l1 + l2 + l3)
    return SplitResult(one_percent=one, legs=(l1, l2, l3))


def main() -> None:
    """Main event loop for the native messaging host."""
    stdin = sys.stdin.buffer
    stdout = sys.stdout.buffer

    while True:
        message = _read_message(stdin)
        if message is None:
            break
        try:
            action = message.get("action")
            if action != "compute":
                _send_message(stdout, {"__error": "Unsupported action"})
                continue

            balance = Decimal(str(message.get("balance", "0")))
            decimals = int(message.get("decimals", 2))
            decimals = max(0, min(8, decimals))

            result = split_balance(balance, decimals)
            _send_message(stdout, result.to_jsonable(decimals))

        except Exception as exc:  # noqa: BLE001
            _send_message(stdout, {"__error": str(exc)})


if __name__ == "__main__":
    main()
