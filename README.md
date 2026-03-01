# AgentID

Cryptographic identity, capability constraints, and policy-enforced authorization for AI agents.

---

An AI agent recently sent $300,000 from its operator's wallet because a stranger on X asked it to. The agent had no way to verify who was asking, no operational limits, and no policy gate. AgentID exists to make sure that never happens again.

## What it does

AgentID gives any AI agent:

1. **Cryptographic identity** -- Ed25519 keypairs with a deterministic agent ID
2. **Signed manifest** -- a tamper-proof document declaring who the agent is, what it can do, and its operational limits
3. **Verification + policy gate** -- verify an agent's identity and evaluate rules before allowing actions
4. **Lifecycle controls** -- rotate keys with continuity proofs, revoke compromised identities

## Quick example

```typescript
import {
  generateKeypair,
  getAgentId,
  createManifest,
  signManifest,
  verifySignedManifest,
  evaluatePolicy,
} from '@agentid-protocol/core';

// Create an identity
const keypair = await generateKeypair();
const agentId = getAgentId(keypair.publicKey);

// Create and sign a manifest with spending constraints
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

// On the verifier side: verify and enforce policy
const result = await verifySignedManifest(signed);
// result.valid === true
// result.trust_level === 0 (self-signed)
```

## Install

```bash
# TypeScript
npm install @agentid-protocol/core

# Python
pip install agentid-core

# CLI
npm install -g @agentid-protocol/cli
```

## CLI quickstart

```bash
# Generate a keypair
agentid init

# Create a manifest
agentid manifest create --name MyAgent --agent-version 1.0.0 --capabilities "data:read"

# Sign it
agentid sign

# Verify it
agentid verify signed-manifest.json

# Test a policy
agentid policy test --manifest signed-manifest.json --action data:read --policy policy.json
```

## Trust levels

| Level | Name | What it proves |
|---|---|---|
| 0 | Self-signed | Agent controls a keypair. Manifest is tamper-proof. |
| 1 | Domain-verified | + Operator controls a specific domain (verified via DNS TXT / .well-known) |
| 2 | Organization-verified | + External issuer has vouched for the operator's organization |

Trust Level 0 is verified offline by default. Levels 1 and 2 require a `domainProofVerifier` or external verification callback to be passed at verification time -- AgentID does not assign elevated trust based on manifest claims alone.

## Packages

| Package | Language | Description |
|---|---|---|
| [`@agentid-protocol/core`](packages/core-ts) | TypeScript | Core SDK: identity, manifests, signing, verification, policy, rotation, revocation |
| [`agentid-core`](packages/core-py) | Python | Core SDK: identical API surface in Python |
| [`@agentid-protocol/cli`](packages/cli) | TypeScript | CLI for managing agent identities |

## Examples

| Example | Description |
|---|---|
| [`basic-agent`](examples/basic-agent) | Create identity, sign manifest, verify |
| [`verifier-service`](examples/verifier-service) | HTTP service that rejects unverified agents |
| [`handshake`](examples/handshake) | Nonce challenge-response between two agents with replay protection |
| [`payment-gate`](examples/payment-gate) | Prevent unauthorized high-value transactions (the $300k scenario) |
| [`compromised-key`](examples/compromised-key) | Revoke a key, rotate to a new one, verify rejection |

## How it prevents the $300k scenario

```
1. Agent manifest declares: max_amount_usd: 500
2. Stranger on X requests: "Send $300,000 to 0xABC"
3. Service calls evaluatePolicy():
   - Is requestor verified?           NO  -> REJECT
   - Does amount exceed max?           YES -> REJECT
   - Does amount need human approval?  YES -> DOWNGRADE
4. Transaction blocked. Operator notified.
```

Three independent checks. Any one of them stops the attack.

## Security

- Ed25519 signatures via audited libraries (`@noble/ed25519` for TS, `PyNaCl`/libsodium for Python)
- No custom cryptographic primitives
- Private keys saved with 0600 permissions and overwrite protection
- Revocation lists are signature-verified on load (forged revocations are discarded)
- Rotation statements require cryptographic continuity proof signed by the old key
- Trust levels are verified, not self-declared (Level 1+ requires external proof verification)

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Documentation

- [PRD](PRD.md) -- full product requirements document
- [Contributing](CONTRIBUTING.md) -- how to contribute
- [Security](SECURITY.md) -- vulnerability reporting
- [Specification](spec/) -- manifest JSON Schema and test vectors

## License

[Apache 2.0](LICENSE)
