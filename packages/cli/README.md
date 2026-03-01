# @agentid-protocol/cli

Command-line tool for managing AI agent identities, manifests, and trust verification.

[![npm](https://img.shields.io/npm/v/@agentid-protocol/cli)](https://www.npmjs.com/package/@agentid-protocol/cli)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](https://github.com/AgentID-SDK/agentid/blob/main/LICENSE)

## Install

```bash
npm install -g @agentid-protocol/cli
```

Or run directly with npx:

```bash
npx @agentid-protocol/cli <command>
```

Requires Node.js >= 18.

## Commands

### `agentid init`

Generate a new Ed25519 keypair for your agent.

```bash
agentid init
# Creates keypair.json with 0600 permissions

agentid init --output my-agent.json
# Custom output path

agentid init --force
# Overwrite existing keypair
```

### `agentid manifest create`

Create an agent manifest declaring identity, capabilities, and constraints.

```bash
agentid manifest create \
  --name "PaymentBot" \
  --agent-version "1.0.0" \
  --capabilities "payments:send,data:read" \
  --expires "2027-01-01T00:00:00Z"
```

### `agentid sign`

Sign a manifest with your private key.

```bash
agentid sign
# Signs manifest.json using keypair.json, outputs signed-manifest.json

agentid sign --manifest my-manifest.json --keypair my-agent.json --output signed.json
```

### `agentid verify`

Verify a signed manifest's signature, expiry, and trust level.

```bash
agentid verify signed-manifest.json
```

### `agentid policy test`

Test a policy against a signed manifest and action.

```bash
agentid policy test \
  --manifest signed-manifest.json \
  --action "payments:send" \
  --policy policy.json
```

### `agentid rotate`

Rotate to a new keypair with a signed continuity proof.

```bash
agentid rotate
# Generates new keypair, creates rotation statement signed by old key
```

### `agentid revoke`

Revoke an agent identity.

```bash
agentid revoke --reason "Key compromised"
# Creates a signed revocation statement
```

## Typical workflow

```bash
# 1. Generate identity
agentid init

# 2. Create manifest with capabilities
agentid manifest create \
  --name "MyAgent" \
  --agent-version "1.0.0" \
  --capabilities "data:read,data:write"

# 3. Sign it
agentid sign

# 4. Share signed-manifest.json with verifiers

# 5. Verifier checks it
agentid verify signed-manifest.json

# 6. Test against a policy
agentid policy test \
  --manifest signed-manifest.json \
  --action "data:read" \
  --policy policy.json
```

## SDK

The CLI is built on top of [`@agentid-protocol/core`](https://www.npmjs.com/package/@agentid-protocol/core). For programmatic usage, install the core SDK directly:

```bash
npm install @agentid-protocol/core
```

## Links

- [GitHub](https://github.com/AgentID-SDK/agentid)
- [Core SDK](https://www.npmjs.com/package/@agentid-protocol/core)
- [Python SDK](https://github.com/AgentID-SDK/agentid/tree/main/packages/core-py)
- [Examples](https://github.com/AgentID-SDK/agentid/tree/main/examples)

## License

[Apache 2.0](https://github.com/AgentID-SDK/agentid/blob/main/LICENSE)
