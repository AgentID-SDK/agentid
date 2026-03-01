# @agentid-protocol/core

Cryptographic identity, capability constraints, and policy-enforced authorization for AI agents.

[![npm](https://img.shields.io/npm/v/@agentid-protocol/core)](https://www.npmjs.com/package/@agentid-protocol/core)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](https://github.com/AgentID-SDK/agentid/blob/main/LICENSE)

## Why

An AI agent recently sent $300,000 from its operator's wallet because a stranger on X asked it to. The agent had no way to verify who was asking, no operational limits, and no policy gate. This SDK exists to make sure that never happens again.

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

// 1. Create an identity
const keypair = await generateKeypair();
const agentId = getAgentId(keypair.publicKey);

// 2. Create and sign a manifest with spending constraints
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

// 3. Verify identity and enforce policy
const result = await verifySignedManifest(signed);
console.log(result.valid);       // true
console.log(result.trust_level); // 0 (self-signed)

// 4. Evaluate a policy rule
const policy = {
  rules: [{
    action: 'payments:send',
    effect: 'allow',
    conditions: { min_trust_level: 0, require_capability: 'payments:send' },
  }],
  default_effect: 'deny',
};

const decision = evaluatePolicy(policy, {
  manifest: signed.manifest,
  action: 'payments:send',
  trust_level: result.trust_level,
});
console.log(decision.decision); // "allow"
```

## API

### Identity

| Function | Description |
|---|---|
| `generateKeypair()` | Generate an Ed25519 keypair |
| `getAgentId(publicKey)` | Derive a deterministic agent ID from a public key |
| `saveKeypair(keypair, path, options?)` | Save keypair to disk (0600 permissions, overwrite protection) |
| `loadKeypair(path)` | Load keypair from disk |

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
| `signMessage(payload, keypair)` | Sign an arbitrary message |
| `verifySignedManifest(signed, options?)` | Verify signature, expiry, and optionally domain proof |
| `verifySignedMessage(signed)` | Verify an arbitrary signed message |

### Policy

| Function | Description |
|---|---|
| `evaluatePolicy(policy, context)` | Evaluate policy rules against an agent's manifest and action |
| `loadPolicy(path)` | Load a policy from a JSON file |

### Revocation

| Function | Description |
|---|---|
| `createRevocation(agentId, keypair, reason)` | Create a signed revocation statement |
| `checkRevocation(agentId, revocationList)` | Check if an agent ID has been revoked |
| `loadRevocationList(sources, options?)` | Load and signature-verify revocation lists from files or URLs |

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
