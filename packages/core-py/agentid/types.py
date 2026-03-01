from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


@dataclass
class Keypair:
    public_key: bytes
    private_key: bytes


class TrustLevel(int, Enum):
    SELF_SIGNED = 0
    DOMAIN_VERIFIED = 1
    ORG_VERIFIED = 2


@dataclass
class Constraint:
    max_amount_usd: Optional[float] = None
    require_human_approval_above_usd: Optional[float] = None
    allowed_recipients: Optional[list[str]] = None
    rate_limit: Optional[str] = None
    scope: Optional[str] = None
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class Capability:
    id: str
    description: str
    constraints: Optional[Constraint] = None


@dataclass
class Operator:
    domain: Optional[str] = None
    contact: Optional[str] = None
    domain_proof: Optional[str] = None


@dataclass
class AgentManifest:
    manifest_version: str
    agent_id: str
    name: str
    version: str
    capabilities: list[Capability]
    expires_at: str
    operator: Optional[Operator] = None
    policy_url: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None


@dataclass
class SignedManifest:
    payload: str
    signature: str
    key_id: str
    signed_at: str


@dataclass
class SignedMessage:
    payload: str
    nonce: str
    agent_id: str
    manifest_ref: str
    signature: str
    signed_at: str


@dataclass
class RevocationStatement:
    type: str
    agent_id: str
    revoked_key_id: str
    revoked_at: str
    reason: str
    signature: str


@dataclass
class RotationStatement:
    type: str
    old_key_id: str
    new_key_id: str
    rotated_at: str
    continuity_proof: str
    signature_by_old_key: str


class PolicyDecision(str, Enum):
    ACCEPT = "ACCEPT"
    REJECT = "REJECT"
    DOWNGRADE = "DOWNGRADE"


@dataclass
class PolicyRule:
    action: str
    require: dict[str, Any]
    on_fail: str
    reason_template: Optional[str] = None


@dataclass
class Policy:
    policy_version: str
    rules: list[PolicyRule]
    default: str


@dataclass
class PolicyResult:
    decision: PolicyDecision
    reasons: list[str]
    matched_rule: Optional[str] = None


@dataclass
class VerificationResult:
    valid: bool
    trust_level: TrustLevel
    agent_id: str
    expired: bool
    revoked: bool
    errors: list[str]
    manifest: Optional[AgentManifest] = None
