# @agentid-protocol/core

Cryptographic identity, capability constraints, and policy-enforced authorization for AI agents.

[![npm](https://img.shields.io/npm/v/@agentid-protocol/core)](https://www.npmjs.com/package/@agentid-protocol/core)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](https://github.com/AgentID-SDK/agentid/blob/main/LICENSE)

## Install

```bash
npm install @agentid-protocol/core
```

Requires Node.js >= 18.

## Quick start

```typescript
import {
  generateKeypair,
  getAgentId,
  createManifest,
  signManifest,
  verifySignedManifest,
  evaluatePolicy,
} from '@agentid-protocol/core';

const keypair = await generateKeypair();
const agentId = getAgentId(keypair.publicKey);

const manifest = createManifest({
  agentId,
  name: 'PaymentBot',
  version: '1.0.0',
  capabilities: [{
    id: 'payments:send',
    description: 'Send payments',
    constraints: {
      max_amount_usd: 500,
      require_human_approval_above_usd: 100,
    },
  }],
  expiresAt: '2027-01-01T00:00:00Z',
});

const signed = await signManifest(manifest, keypair);
const result = await verifySignedManifest(signed);
// result.valid === true
// result.trust_level === 0 (self-signed)

const decision = evaluatePolicy(
  {
    manifest: result.manifest!,
    trustLevel: result.trust_level,
    action: 'payments:send',
    actionParams: { amount_usd: 50 },
    revoked: false,
    expired: false,
  },
  {
    policy_version: '0.1',
    rules: [{
      action: 'payments:send',
      require: { capability_declared: 'payments:send', constraints_satisfied: true },
      on_fail: 'REJECT',
    }],
    default: 'REJECT',
  }
);
// decision.decision === "ACCEPT"
```

## API

### Identity

| Function | Description |
|---|---|
| `generateKeypair()` | Generate an Ed25519 keypair |
| `getAgentId(publicKey)` | Derive a deterministic agent ID from a public key |
| `saveKeypair(keypair, path, options?)` | Save keypair to disk (0600 permissions, overwrite protection) |
| `loadKeypair(source)` | Load keypair from file path or `env:VAR_NAME` |

### Manifests

| Function | Description |
|---|---|
| `createManifest(config)` | Create an agent manifest with capabilities and constraints |
| `validateManifest(manifest)` | Validate manifest structure and fields |
| `canonicalizeManifest(manifest)` | Deterministic JSON serialization (RFC 8785 JCS) |

### Signing & verification

| Function | Description |
|---|---|
| `signManifest(manifest, keypair)` | Sign a manifest with a private key |
| `signMessage(payload, nonce, keypair, manifestRef)` | Sign an arbitrary message (for handshakes) |
| `verifySignedManifest(signed, options?)` | Verify signature, expiry, and optionally domain proof |
| `verifySignedMessage(signed, expectedAgentId?)` | Verify an arbitrary signed message |
| `verifyRevocationSignature(statement)` | Verify a revocation statement's signature |

### Policy

| Function | Description |
|---|---|
| `evaluatePolicy(context, policy)` | Evaluate policy rules against an agent's manifest and action |
| `loadPolicy(source)` | Load a policy from a JSON file or URL |

### Revocation

| Function | Description |
|---|---|
| `createRevocation(agentId, revokedKeyId, reason, keypair)` | Create a signed revocation statement |
| `checkRevocation(keyId, revocationList)` | Check if a key ID has been revoked |
| `loadRevocationList(source, options?)` | Load and signature-verify a revocation list from file or URL |

### Key rotation

| Function | Description |
|---|---|
| `createRotation(oldKeypair, newPublicKey)` | Create a signed rotation statement (continuity proof) |
| `verifyRotation(statement)` | Verify a rotation statement's signature |

## Trust levels

| Level | Name | Verification |
|---|---|---|
| 0 | Self-signed | Agent controls a keypair. Verified offline. |
| 1 | Domain-verified | Operator controls a domain (DNS TXT / .well-known). Requires `domainProofVerifier` callback. |
| 2 | Organization-verified | External issuer vouches for operator. Requires external verification. |

## Security

- Ed25519 via `@noble/ed25519` (audited, pure JS)
- No custom cryptographic primitives
- Private keys saved with 0600 permissions
- Revocation lists are signature-verified on load
- Rotation requires cryptographic continuity proof
- Trust levels are verified, not self-declared

## Links

- [GitHub](https://github.com/AgentID-SDK/agentid)
- [CLI package](https://www.npmjs.com/package/@agentid-protocol/cli)
- [Python SDK](https://github.com/AgentID-SDK/agentid/tree/main/packages/core-py)
- [Examples](https://github.com/AgentID-SDK/agentid/tree/main/examples)

## License

[Apache 2.0](https://github.com/AgentID-SDK/agentid/blob/main/LICENSE)
