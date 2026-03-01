"""Shared encoding/decoding utilities for cross-language consistency."""

from __future__ import annotations

import base64

BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


def encode_base58(data: bytes) -> str:
    """Encode bytes to base58 string."""
    if len(data) == 0:
        return "1"
    num = int.from_bytes(data, "big")
    result: list[str] = []
    while num > 0:
        num, remainder = divmod(num, 58)
        result.append(BASE58_ALPHABET[remainder])

    for byte in data:
        if byte == 0:
            result.append("1")
        else:
            break

    return "".join(reversed(result)) or "1"


def decode_base58(s: str) -> bytes:
    """Decode base58 string to bytes."""
    if len(s) == 0:
        raise ValueError("Empty base58 string")
    num = 0
    for char in s:
        idx = BASE58_ALPHABET.find(char)
        if idx < 0:
            raise ValueError(f"Invalid base58 character: {char}")
        num = num * 58 + idx

    if num == 0:
        data_bytes = b""
    else:
        hex_str = format(num, "x")
        if len(hex_str) % 2:
            hex_str = "0" + hex_str
        data_bytes = bytes.fromhex(hex_str)

    leading_zeros = 0
    for char in s:
        if char == "1":
            leading_zeros += 1
        else:
            break

    if leading_zeros > 0:
        return b"\x00" * leading_zeros + data_bytes
    return data_bytes


def encode_base64(data: bytes) -> str:
    """Encode bytes to base64 string."""
    return base64.b64encode(data).decode("ascii")


def decode_base64(s: str) -> bytes:
    """Decode base64 string to bytes."""
    return base64.b64decode(s)


def decode_base64_as_string(s: str) -> str:
    """Decode base64 string to UTF-8 string."""
    return base64.b64decode(s).decode("utf-8")
