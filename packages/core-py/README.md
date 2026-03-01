# agentid-core

Cryptographic identity, capability constraints, and policy-enforced authorization for AI agents.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](https://github.com/AgentID-SDK/agentid/blob/main/LICENSE)

## Install

```bash
pip install agentid-core
```

Requires Python >= 3.9.

## Quick start

```python
from agentid import (
    generate_keypair,
    get_agent_id,
    create_manifest,
    sign_manifest,
    verify_signed_manifest,
)
from agentid.types import Capability, Constraint

keypair = generate_keypair()
agent_id = get_agent_id(keypair.public_key)

manifest = create_manifest(
    agent_id=agent_id,
    name="PaymentBot",
    version="1.0.0",
    capabilities=[
        Capability(
            id="payments:send",
            description="Send payments",
            constraints=Constraint(
                max_amount_usd=500,
                require_human_approval_above_usd=100,
            ),
        )
    ],
    expires_at="2027-01-01T00:00:00Z",
)

signed = sign_manifest(manifest, keypair)

result = verify_signed_manifest(signed)
print(result.valid)        # True
print(result.trust_level)  # TrustLevel.SELF_SIGNED (0)
```

## API

### Identity

| Function | Description |
|---|---|
| `generate_keypair()` | Generate an Ed25519 keypair |
| `get_agent_id(public_key)` | Derive a deterministic agent ID from a public key |
| `save_keypair(keypair, path)` | Save keypair to disk (0600 permissions, overwrite protection) |
| `load_keypair(source)` | Load keypair from file path or `env:VAR_NAME` |

### Manifests

| Function | Description |
|---|---|
| `create_manifest(...)` | Create an agent manifest with capabilities and constraints |
| `validate_manifest(manifest)` | Validate manifest structure and fields |
| `canonicalize_manifest(manifest)` | Deterministic JSON serialization (RFC 8785 JCS) |

### Signing & verification

| Function | Description |
|---|---|
| `sign_manifest(manifest, keypair)` | Sign a manifest with a private key |
| `sign_message(payload, nonce, keypair, manifest_ref)` | Sign an arbitrary message (for handshakes) |
| `verify_signed_manifest(signed, ...)` | Verify signature, expiry, and optionally domain proof |
| `verify_signed_message(signed, expected_agent_id?)` | Verify an arbitrary signed message |
| `verify_revocation_signature(statement)` | Verify a revocation statement's signature |

### Policy

| Function | Description |
|---|---|
| `evaluate_policy(*, manifest, trust_level, action, policy, ...)` | Evaluate policy rules against an agent's manifest and action |
| `load_policy(source)` | Load a policy from a JSON file |

### Revocation

| Function | Description |
|---|---|
| `create_revocation(agent_id, revoked_key_id, reason, keypair)` | Create a signed revocation statement |
| `check_revocation(key_id, revocation_list)` | Check if a key ID has been revoked |
| `load_revocation_list(source, ...)` | Load and signature-verify a revocation list |

### Key rotation

| Function | Description |
|---|---|
| `create_rotation(old_keypair, new_public_key)` | Create a signed rotation statement (continuity proof) |
| `verify_rotation(statement)` | Verify a rotation statement's signature |

## Security

- Ed25519 via PyNaCl (libsodium bindings, audited)
- No custom cryptographic primitives
- Private keys saved with 0600 permissions
- Revocation lists are signature-verified on load
- Rotation requires cryptographic continuity proof
- Trust levels are verified, not self-declared

## Links

- [GitHub](https://github.com/AgentID-SDK/agentid)
- [TypeScript SDK](https://www.npmjs.com/package/@agentid-protocol/core)
- [CLI](https://www.npmjs.com/package/@agentid-protocol/cli)
- [Examples](https://github.com/AgentID-SDK/agentid/tree/main/examples)

## License

[Apache 2.0](https://github.com/AgentID-SDK/agentid/blob/main/LICENSE)
