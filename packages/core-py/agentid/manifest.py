from __future__ import annotations

import json
import math
from dataclasses import asdict
from datetime import datetime
from typing import Any

from agentid.types import AgentManifest, Capability, Constraint, Operator

MANIFEST_VERSION = "0.1"

REQUIRED_FIELDS = ["manifest_version", "agent_id", "name", "version", "capabilities", "expires_at"]


def create_manifest(
    *,
    agent_id: str,
    name: str,
    version: str,
    capabilities: list[Capability],
    expires_at: str,
    operator: Operator | None = None,
    policy_url: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> AgentManifest:
    manifest = AgentManifest(
        manifest_version=MANIFEST_VERSION,
        agent_id=agent_id,
        name=name,
        version=version,
        capabilities=capabilities,
        expires_at=expires_at,
        operator=operator,
        policy_url=policy_url,
        metadata=metadata,
    )

    errors = validate_manifest(manifest)
    if errors:
        raise ValueError(f"Invalid manifest: {'; '.join(errors)}")

    return manifest


def validate_manifest(manifest: AgentManifest) -> list[str]:
    errors: list[str] = []
    d = asdict(manifest)

    for field_name in REQUIRED_FIELDS:
        val = d.get(field_name)
        if val is None or (isinstance(val, str) and val == ""):
            errors.append(f"Missing required field: {field_name}")

    if manifest.manifest_version and manifest.manifest_version != MANIFEST_VERSION:
        errors.append(
            f"Unsupported manifest version: {manifest.manifest_version} "
            f"(expected {MANIFEST_VERSION})"
        )

    if manifest.agent_id and not manifest.agent_id.startswith("aid_ed25519_"):
        errors.append('agent_id must start with "aid_ed25519_"')

    if manifest.name and len(manifest.name) > 256:
        errors.append("name must be 256 characters or less")

    if manifest.capabilities is not None:
        if not isinstance(manifest.capabilities, list):
            errors.append("capabilities must be a list")
        else:
            for i, cap in enumerate(manifest.capabilities):
                if not cap.id:
                    errors.append(f"capabilities[{i}]: missing id")
                if not cap.description:
                    errors.append(f"capabilities[{i}]: missing description")

    if manifest.expires_at:
        try:
            datetime.fromisoformat(manifest.expires_at.replace("Z", "+00:00"))
        except ValueError:
            errors.append("expires_at is not a valid ISO 8601 date")

    return errors


def canonicalize_manifest(manifest: AgentManifest) -> str:
    """RFC 8785 (JCS) canonicalization."""
    d = _manifest_to_dict(manifest)
    return _canonicalize(d)


def _manifest_to_dict(manifest: AgentManifest) -> dict[str, Any]:
    d = asdict(manifest)
    return _strip_none(d)


def _strip_none(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, dict):
        stripped = {}
        for k, v in value.items():
            sv = _strip_none(v)
            if sv is not None and sv != {}:
                stripped[k] = sv
        return stripped
    if isinstance(value, list):
        return [_strip_none(item) for item in value]
    return value


def _canonicalize(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int) and not isinstance(value, bool):
        return str(value)
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            raise ValueError("Cannot canonicalize non-finite number")
        if value == int(value):
            return str(int(value))
        return json.dumps(value)
    if isinstance(value, str):
        return json.dumps(value)
    if isinstance(value, list):
        return "[" + ",".join(_canonicalize(item) for item in value) + "]"
    if isinstance(value, dict):
        keys = sorted(value.keys())
        pairs = [
            json.dumps(k) + ":" + _canonicalize(value[k])
            for k in keys
            if value[k] is not None
        ]
        return "{" + ",".join(pairs) + "}"
    raise TypeError(f"Cannot canonicalize value of type {type(value)}")
