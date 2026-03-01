# PRD: AgentID SDK

## 0. Executive summary

**AgentID** is an open-source SDK, CLI, and specification that gives AI agents cryptographic identity, capability constraints, and policy-enforced authorization boundaries.

The core promise: **no agent should be able to take a high-stakes action without verifiable identity, scoped authorization, and enforceable policy gates.**

An agent with AgentID cannot send $300k because a stranger on X asked it to. It cannot impersonate another agent. It cannot exceed its declared operational bounds. And when compromised, its keys can be revoked instantly across every system that checks.

Open-source drives adoption. Monetization comes from hosted operations (revocation feeds, monitoring, operator verification) and enterprise controls.

---

## 1. Problem statement

### The incident that defines the problem

In early 2025, autonomous AI agents with access to crypto wallets, APIs, and payment rails began operating on social platforms. One such agent (clawdbot) sent approximately $300,000 from its operator's wallet because a user on X simply asked it to. The agent had no mechanism to verify who was asking, whether the request was authorized, or whether the action was within its operational bounds.

This is not an edge case. It is the default failure mode of the current agent ecosystem.

### Systemic gaps

AI agents are increasingly capable of real-world actions: API calls, data access, code execution, financial transactions, infrastructure changes. The ecosystem currently has no standard way to:

- **Verify an agent's identity** -- who is this agent, and who operates it?
- **Verify a requestor's authority** -- is the person or system making a request authorized to do so?
- **Enforce capability bounds** -- what is this agent allowed to do, and up to what limits?
- **Apply policy gates before execution** -- should this action proceed given the context, risk level, and trust posture?
- **Revoke compromised identities** -- when keys leak or agents are compromised, how do you kill trust instantly?

Without these primitives, the ecosystem produces predictable failures: unauthorized fund transfers, impersonation, replay attacks, privilege escalation, and cascading trust breakdowns in agent-to-agent interactions.

---

## 2. Competitive landscape

### Existing approaches and why they fall short

| Solution | What it does | Why it is insufficient for AI agents |
|---|---|---|
| **API keys** | Authenticate a caller to a service | No capability scoping, no lifecycle (rotation/revocation), no requestor verification. A leaked key grants full access. |
| **OAuth 2.0 / OIDC** | Delegated authorization for users | Designed for human-initiated flows. No concept of autonomous agent identity, capability manifests, or offline verification. |
| **mTLS** | Mutual transport-layer authentication | Proves two endpoints trust each other at the TLS layer. No semantic layer for capabilities, policies, or action-level constraints. |
| **SPIFFE / SPIRE** | Service identity for microservices | Designed for service mesh workloads, not autonomous agents. No manifest model, no capability constraints, no policy engine for action-level decisions. |
| **W3C DID / Verifiable Credentials** | Decentralized identity standard | Correct conceptual direction but extremely complex, slow adoption, no agent-specific semantics, and carries significant tooling overhead for a developer who wants to ship in 5 minutes. |
| **Custom per-platform solutions** | Platform-specific agent identity | Fragments the ecosystem. Every platform reinvents the same primitives. No interoperability, no portability, no standard verification. |

### AgentID's positioning

AgentID is purpose-built for AI agents. It takes the right ideas from DID/VC (cryptographic identity, verifiable claims) and strips away the complexity. It adds what those standards lack: capability constraints with limits, action-level policy gates, and a developer experience that works in 5 minutes.

The bet: the agent ecosystem needs a focused, agent-native identity primitive -- not a general-purpose identity framework adapted for agents.

---

## 3. Target users

### Primary

| User | Need | Success criteria |
|---|---|---|
| **Agent builders** | Add identity + authorization constraints to their agent in minutes | 5-minute integration, clear errors, working examples |
| **API and service owners** | Gate access based on agent trust posture and capability scope | Policy evaluation in <10ms, drop-in middleware |
| **Agent framework maintainers** (LangChain, CrewAI, AutoGen, etc.) | Standard plug-in identity layer for their ecosystem | Adapter pattern, minimal API surface, no opinion on framework internals |

### Secondary

| User | Need |
|---|---|
| **Security and IT teams** | Auditable trust decisions, key lifecycle management, compliance exports |
| **Agent marketplace operators** | Verified agent badges, policy enforcement, trust tiers |
| **Wallet and payment providers** | Agent-level spending constraints, operator verification before financial access |

---

## 4. Trust model

This section makes the guarantees explicit. AgentID defines three trust levels. Each level builds on the previous one.

### Level 0: Cryptographic identity (self-signed)

**What it proves:** This agent controls a specific keypair. The manifest has not been tampered with since signing.

**What it does NOT prove:** Anything about who operates the agent, whether its declared capabilities are real, or whether it is trustworthy.

**Use case:** Agent-to-agent communication where both parties just need tamper-proof identity and replay protection. Low-stakes interactions.

### Level 1: Domain-verified identity

**What it proves:** Everything in Level 0, plus the agent's operator controls a specific domain (via DNS TXT record or `/.well-known/agentid.json`).

**What it does NOT prove:** The organization behind the domain, or that the agent's declared capabilities are independently audited.

**Use case:** API providers gating access. "I will only accept requests from agents whose operators control a domain I recognize."

### Level 2: Organization-verified identity

**What it proves:** Everything in Level 1, plus an external issuer (enterprise IdP, verification service, or certificate authority) has vouched for the operator's organizational identity.

**What it does NOT prove:** That the agent's runtime behavior matches its manifest (that is an enforcement problem, not an identity problem).

**Use case:** Financial transactions, sensitive data access, regulated environments. "I will only process payment requests from agents whose operators are verified organizations."

### What AgentID explicitly does NOT do

- **Runtime enforcement.** AgentID verifies identity and evaluates policy. It does not sandbox or restrict agent execution. Enforcement is the responsibility of the service accepting the request. AgentID provides the decision; the service executes it.
- **Capability attestation.** Capabilities in the manifest are declared by the operator, not independently verified. They are a contract, not a proof. The verifier decides how much weight to give them.

---

## 5. Goals and non-goals

### Goals (v1)

- Generate and manage cryptographic keypairs safely.
- Produce a strict, signed agent manifest with declared capabilities and operational constraints (including limits).
- Verify manifests and signed messages offline with no network dependency.
- Evaluate policies that produce accept/reject/downgrade decisions with reasons.
- Support key rotation with cryptographic continuity proofs.
- Support key revocation with signed revocation statements and revocation list consumption.
- Provide domain-verification (Level 1 trust) in v1 (not deferred to v1.5).
- Ship working examples that demonstrate real value in under 5 minutes.
- Ship both TypeScript and Python SDKs in v1.

### Non-goals (v1)

- No global registry or centralized authority. AgentID is decentralized by default.
- No mandatory real-name identity. Pseudonymous operation is a valid use case.
- No runtime sandboxing or execution enforcement. AgentID is the decision layer, not the enforcement layer.
- No full W3C DID/VC compliance in v1. Interoperability bridges are a v2 concern.
- No on-chain identity or token-gating. Blockchain integration is optional and out of scope for core.

---

## 6. Core concepts

### Identity

A cryptographic keypair (Ed25519). The **agent ID** is derived deterministically from the public key. One agent, one primary identity. Delegation keys are supported for operational separation.

### Manifest

A structured JSON document -- the agent's "passport" -- that declares:
- Who the agent is (name, version, operator)
- What it can do (capabilities with constraints)
- What its operational limits are (spending caps, rate limits, action types)
- When the manifest expires
- How to verify the operator (domain proof, organizational proof)

The manifest is the single source of truth for what a verifier should know about the agent before engaging.

### Constraints

Operational bounds declared in the manifest that specify limits on the agent's authorized behavior. Examples: maximum transaction value, allowed action types, required human approval above a threshold, rate limits. Constraints are declarative -- enforcement is the verifier's responsibility, but AgentID provides the data for that enforcement.

### Signature

Cryptographic proof that the manifest (or any message) was produced by the holder of the private key and has not been modified. Uses Ed25519 signatures in a simple envelope format.

### Policy

A set of rules defined by the **verifier** (the system receiving a request from an agent) that determines whether to accept, reject, or downgrade the interaction based on:
- Manifest validity and expiry
- Trust level (0, 1, or 2)
- Capability match (does the agent declare the capability needed for this action?)
- Constraint compliance (is the requested action within the agent's declared limits?)
- Revocation status

### Revocation

A signed statement that a specific key should no longer be trusted. Distributed via local files or remote revocation lists. Verifiers check revocation status as part of policy evaluation.

---

## 7. Data formats (v0.1)

### Agent manifest

```json
{
  "manifest_version": "0.1",
  "agent_id": "aid_ed25519_<base58-encoded-public-key>",
  "name": "PaymentAssistant",
  "version": "1.2.0",
  "operator": {
    "domain": "payments.example.com",
    "contact": "security@example.com",
    "domain_proof": "dns-txt"
  },
  "capabilities": [
    {
      "id": "payments:send",
      "description": "Send payments to verified recipients",
      "constraints": {
        "max_amount_usd": 500,
        "require_human_approval_above_usd": 100,
        "allowed_recipients": ["verified"],
        "rate_limit": "10/hour"
      }
    },
    {
      "id": "data:read",
      "description": "Read transaction history",
      "constraints": {
        "scope": "own_account"
      }
    }
  ],
  "expires_at": "2026-06-01T00:00:00Z",
  "policy_url": "https://payments.example.com/.well-known/agentid-policy.json",
  "metadata": {}
}
```

Key differences from the original PRD:
- `capabilities` are structured objects with `constraints`, not flat strings.
- `operator` is a first-class field with verification method, not an afterthought.
- `skills` field is removed. The concept is fully covered by `capabilities`.

### Signed manifest envelope

```json
{
  "payload": "<canonicalized manifest JSON>",
  "signature": "<base64-encoded Ed25519 signature>",
  "key_id": "aid_ed25519_<base58-encoded-public-key>",
  "signed_at": "2026-02-28T12:00:00Z"
}
```

### Signed message (for handshakes)

```json
{
  "payload": "<arbitrary message bytes, base64>",
  "nonce": "<verifier-provided nonce>",
  "agent_id": "aid_ed25519_<...>",
  "manifest_ref": "<hash of current signed manifest>",
  "signature": "<base64-encoded Ed25519 signature>",
  "signed_at": "2026-02-28T12:00:05Z"
}
```

### Revocation statement

```json
{
  "type": "revocation",
  "agent_id": "aid_ed25519_<...>",
  "revoked_key_id": "aid_ed25519_<...>",
  "revoked_at": "2026-02-28T13:00:00Z",
  "reason": "key_compromise",
  "signature": "<signed by operator's current valid key or a designated revocation key>"
}
```

### Rotation statement

```json
{
  "type": "rotation",
  "old_key_id": "aid_ed25519_<...>",
  "new_key_id": "aid_ed25519_<...>",
  "rotated_at": "2026-02-28T14:00:00Z",
  "continuity_proof": "<old key signs: 'I delegate trust to new_key_id as of rotated_at'>",
  "signature_by_old_key": "<Ed25519 signature>"
}
```

### Policy format

```json
{
  "policy_version": "0.1",
  "rules": [
    {
      "action": "payments:send",
      "require": {
        "min_trust_level": 1,
        "manifest_not_expired": true,
        "not_revoked": true,
        "capability_declared": "payments:send",
        "constraints_satisfied": true
      },
      "on_fail": "REJECT",
      "reason_template": "Agent {{agent_id}} denied: {{failed_check}}"
    },
    {
      "action": "data:read",
      "require": {
        "min_trust_level": 0,
        "manifest_not_expired": true,
        "not_revoked": true
      },
      "on_fail": "REJECT"
    }
  ],
  "default": "REJECT"
}
```

---

## 8. Step-by-step build plan

### Phase 0: Specification foundation (Weeks 1-2)

**Deliverables:**
1. **Threat model document** covering: impersonation, replay, downgrade, key theft, stale manifests, social engineering (the $300k scenario), and man-in-the-middle during handshake.
2. **Manifest JSON Schema v0.1** (the format above, formalized as JSON Schema).
3. **Signature envelope specification** with test vectors.
4. **Policy format specification v0.1** with evaluation semantics.
5. **Trust level definitions** (Levels 0/1/2) with verification requirements for each.

**Why 2 weeks instead of 1:** This is a security specification. Rushing it undermines the entire product's credibility. Week 1 drafts, week 2 reviews and test vectors.

**Exit criteria:**
- A third party can implement verification from the spec alone, without reading SDK source code.
- Test vectors cover all signing/verification/policy-evaluation paths.

---

### Phase 1: SDK v0 -- TypeScript + Python (Weeks 3-5)

**Deliverables: TypeScript SDK (`@agentid/core`) and Python SDK (`agentid-core`)**

Both SDKs expose identical primitives:

#### Identity module
- `generateKeypair()` -- create Ed25519 keypair
- `loadKeypair(path | env)` -- load from file or environment variable
- `saveKeypair(keypair, path)` -- persist securely (file permissions 0600)
- `getAgentId(publicKey)` -- derive deterministic agent ID from public key

#### Manifest module
- `createManifest(config)` -- build manifest from structured config
- `validateManifest(manifest)` -- validate against JSON Schema, return typed errors
- `canonicalizeManifest(manifest)` -- deterministic JSON serialization (RFC 8785 JCS)

#### Signing module
- `signManifest(manifest, keypair)` -- produce signed envelope
- `signMessage(payload, nonce, keypair, manifestRef)` -- for handshakes

#### Verification module
- `verifySignedManifest(signedManifest, options?)` -- verify signature, check expiry, return result with trust level
- `verifySignedMessage(signedMessage, expectedAgentId?)` -- verify handshake message
- `verifyDomainProof(manifest)` -- check DNS TXT or .well-known (Level 1)

#### Policy module
- `evaluatePolicy(context, policy)` -- evaluate request against policy rules
  - Context: manifest, trust level, requested action, action parameters, revocation status
  - Output: `{ decision: ACCEPT | REJECT | DOWNGRADE, reasons: string[], matched_rule: string }`
- `loadPolicy(path | url)` -- load policy from file or URL

#### Revocation module
- `createRevocation(agentId, keyId, reason, signingKey)` -- produce signed revocation statement
- `checkRevocation(agentId, revocationList)` -- check if agent is revoked
- `loadRevocationList(path | url)` -- load and cache revocation list

**Exit criteria:**
- Two demo agents (one TS, one Python) can exchange manifests, verify signatures, and enforce a policy gate offline.
- All signing/verification operations match the spec's test vectors.
- Policy evaluation correctly rejects an agent requesting `payments:send` with amount exceeding `max_amount_usd`.

---

### Phase 2: CLI + working examples (Week 6)

**CLI: `agentid`** (installed via npm global or pipx)

| Command | Action |
|---|---|
| `agentid init` | Generate keypair, create starter manifest |
| `agentid manifest create` | Interactive manifest builder with capability + constraint prompts |
| `agentid manifest validate` | Validate manifest against schema |
| `agentid sign` | Sign manifest or arbitrary message |
| `agentid verify <file\|url>` | Verify signed manifest, print trust level and details |
| `agentid policy test --manifest <m> --action <a> --policy <p>` | Evaluate policy, print decision with reasons |
| `agentid rotate` | Generate new key, produce rotation statement signed by old key |
| `agentid revoke` | Produce signed revocation statement |
| `agentid domain-proof setup` | Guide user through DNS TXT or .well-known setup for Level 1 |

**Examples:**

| Example | What it demonstrates |
|---|---|
| `examples/basic-agent` | Agent creates identity, signs manifest, publishes to disk |
| `examples/verifier-service` | HTTP service that rejects unverified agents |
| `examples/handshake` | Nonce challenge-response between two agents |
| `examples/payment-gate` | Agent with spending constraints tries to send money; policy enforces limits (the $300k scenario, prevented) |
| `examples/compromised-key` | Simulate key compromise, revoke, and watch verifiers reject |

**Exit criteria:**
- A new developer can run `agentid init && agentid manifest create && agentid sign && agentid verify` and see a trust decision in under 5 minutes.
- The `payment-gate` example clearly demonstrates preventing unauthorized high-value transactions.

---

### Phase 3: Rotation, revocation, and security review (Weeks 7-9)

**Rotation deliverables:**
- Continuity proof: old key signs delegation statement to new key
- Manifest re-signing with new key
- Verifier chain validation: accept new key only if continuity proof is valid and old key was not revoked before rotation

**Revocation deliverables:**
- Local revocation list (JSON file)
- Remote revocation list (URL with HTTP caching headers)
- Configurable policy modes: `strict` (reject if revocation list unreachable) vs `lenient` (allow if unreachable, warn)
- Revocation propagation: signed revocation statements that can be distributed peer-to-peer

**Security review:**
- Internal review of all crypto code paths against the threat model
- Publish threat model and invite community review
- Engage one external security reviewer (budget for this, even if it is a trusted community member)

**Exit criteria:**
- Simulate full compromise scenario: agent operating, key leaked, operator revokes, all verifiers reject within seconds of revocation list update.
- No known unaddressed items in threat model.

---

### Phase 4: Operator verification and framework adapters (Weeks 10-14)

**Operator verification plug-ins:**
- `DomainControlProof` -- DNS TXT record or `/.well-known/agentid.json` (ships in Phase 1 as basic, hardened here)
- `OIDCProof` -- enterprise IdP token verification (Okta, Azure AD, Google Workspace)
- `CertificateProof` -- X.509 certificate chain (for enterprises with existing PKI)
- Extensible `ProofProvider` interface for community plug-ins

**Framework adapters:**
- `@agentid/langchain` -- LangChain tool wrapper that injects AgentID verification
- `@agentid/crewai` -- CrewAI agent identity integration
- `agentid-autogen` -- AutoGen agent verification adapter

**Policy packs:**
- `policy-pack/financial` -- pre-built policies for agents with payment capabilities
- `policy-pack/data-access` -- pre-built policies for agents accessing sensitive data
- `policy-pack/general` -- baseline policies for general-purpose agents

**Exit criteria:**
- A LangChain agent can add AgentID verification with <20 lines of code.
- A service can require Level 2 (organization-verified) trust for payment endpoints.

---

## 9. Key user flows

### Flow A: The $300k scenario, prevented

1. Operator creates agent with `agentid init`.
2. Operator creates manifest declaring `payments:send` capability with constraint `max_amount_usd: 500` and `require_human_approval_above_usd: 100`.
3. Operator signs and publishes manifest.
4. Agent receives request on X: "Send $300,000 to 0xABC."
5. The service receiving the transaction request calls `evaluatePolicy()`:
   - Checks: Is the requestor's identity verified? **No, random X user.** REJECT.
   - Even if the requestor were verified: Does `$300,000` exceed `max_amount_usd: 500`? **Yes.** REJECT.
   - Even if the limit were higher: Does `$300,000` exceed `require_human_approval_above_usd: 100`? **Yes.** DOWNGRADE to human approval.
6. Transaction does not execute. Operator is notified.

### Flow B: Normal agent-to-agent interaction

1. Agent A wants to call Agent B's API.
2. Agent A sends its signed manifest to Agent B.
3. Agent B runs `verifySignedManifest(manifest)` -- checks signature, expiry, revocation.
4. Agent B runs `evaluatePolicy(context, policy)` -- checks trust level, required capabilities.
5. If ACCEPT: Agent B issues a nonce challenge.
6. Agent A signs the nonce with `signMessage()`.
7. Agent B verifies the nonce signature with `verifySignedMessage()`.
8. Interaction proceeds.

### Flow C: Compromise response

1. Operator discovers key compromise.
2. Operator runs `agentid revoke --reason key_compromise`.
3. Signed revocation statement is produced.
4. Operator publishes to their revocation list URL (and optionally pushes to hosted revocation feed).
5. All verifiers that check revocation lists reject the compromised key on next check.
6. Operator runs `agentid rotate` with a pre-prepared backup key (or generates new).
7. New manifest is signed with new key, published.

### Flow D: 5-minute quickstart (new developer)

1. `npm install @agentid/core` (or `pip install agentid-core`)
2. `agentid init` -- generates keypair in `~/.agentid/`
3. `agentid manifest create` -- interactive prompts produce manifest
4. `agentid sign` -- signs manifest
5. `agentid verify ./signed-manifest.json` -- verifies and prints trust level
6. Developer sees: `VERIFIED | Trust Level 0 (self-signed) | Expires 2026-08-28 | 2 capabilities declared`

---

## 10. Product requirements

### Functional requirements

| Area | Requirement |
|---|---|
| **Identity** | Generate Ed25519 keypairs; derive deterministic agent ID; secure key storage (file permissions, env var support) |
| **Manifest** | Strict JSON Schema validation; deterministic canonicalization (RFC 8785); structured capabilities with constraints |
| **Signing** | Ed25519 signatures; simple envelope format; timestamp inclusion |
| **Verification** | Signature verification; expiry enforcement; trust level determination; offline by default |
| **Policy** | Rule-based evaluation; ACCEPT/REJECT/DOWNGRADE decisions; constraint checking (amounts, rates, scopes); clear reason strings |
| **Revocation** | Signed revocation statements; local and remote list support; strict/lenient modes |
| **Rotation** | Continuity proofs; chain validation; manifest re-signing |
| **Domain verification** | DNS TXT and .well-known support; caching; verification result in trust level |
| **Developer experience** | 5-minute quickstart; typed errors with actionable messages; working examples; both TS and Python |

### Non-functional requirements

| Area | Requirement |
|---|---|
| **Performance** | Policy evaluation <10ms; signature verification <5ms; no network calls for Level 0 verification |
| **Security** | Minimal dependencies; audited crypto libraries only (tweetnacl/libsodium); no custom crypto primitives |
| **Determinism** | Identical inputs produce identical outputs across TS and Python SDKs; suitable for CI pipelines |
| **Compatibility** | Backwards-compatible schema versioning; old manifests verifiable by new SDK versions |
| **Portability** | No platform-specific dependencies in core; runs in Node.js, Deno, browser (verification only), and Python 3.9+ |

---

## 11. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Major platform ships competing standard** (OpenAI, Google, Anthropic) | Medium | High | Move fast on spec and adoption. Design for interoperability -- if a platform standard emerges, build a bridge adapter rather than competing. AgentID's value is cross-platform neutrality. |
| **No framework adoption** | Medium | High | Prioritize direct relationships with 3 framework maintainers before v1. Ship adapters, not just docs. Reduce integration to <20 lines. |
| **Schema needs breaking change after v1** | Medium | Medium | Version manifests from day 1. Define migration tooling as a first-class concern. Commit to supporting N-1 versions. |
| **Trust bootstrapping is insufficient** -- users expect more guarantees than Level 0 provides | High | Medium | Be aggressively honest in docs about what each level guarantees. Ship Level 1 (domain verification) in v1, not v1.5. Make the trust level visible in every verification output. |
| **Security vulnerability in crypto implementation** | Low | Critical | Use only established libraries (tweetnacl, libsodium). No custom crypto. External security review before v1.0 stable. Bug bounty program post-launch. |
| **Python SDK lags TypeScript and limits adoption** | Medium | High | Ship both in v1. Python is where most agent frameworks live. If resources are constrained, prioritize Python over TypeScript. |
| **Adoption is slow; spec gets ignored** | Medium | High | Focus on the "pain moment" (the $300k scenario). Ship the `payment-gate` example as the lead demo. Target crypto/DeFi agent builders first -- they have the most acute pain. |

---

## 12. Adoption strategy

### Phase 1: Pain-driven early adopters (Weeks 1-6)

**Target:** Crypto/DeFi agent builders and autonomous agent operators who have experienced or fear the $300k scenario.

**Actions:**
- Lead with the `payment-gate` example in all launch materials.
- Publish a technical post: "How to prevent your AI agent from sending $300k to a stranger" with working code.
- Ship to 3-5 teams building autonomous agents with wallet access. Get them using it before public launch.

### Phase 2: Framework integration (Weeks 7-14)

**Target:** LangChain, CrewAI, AutoGen maintainers.

**Actions:**
- Submit PRs with adapter implementations (not just issues asking them to integrate).
- Offer to co-author documentation for their frameworks.
- Present at their community calls if possible.

### Phase 3: Standard positioning (Weeks 15+)

**Target:** API providers, wallet providers, agent marketplaces.

**Actions:**
- Propose AgentID as a standard identity layer to 2-3 API providers who serve agents.
- Work with wallet providers on AgentID-aware transaction gates.
- Publish an RFC-style specification document for community feedback.

### Adoption metric targets (6 months post-launch)

| Metric | Target |
|---|---|
| npm + PyPI weekly downloads | 1,000+ |
| Repos importing AgentID | 50+ |
| Framework adapters (official or community) | 3+ |
| Verification checks run (opt-in telemetry) | 10,000+/week |

---

## 13. Metrics

### Adoption (leading indicators)

- Weekly downloads (npm + PyPI)
- GitHub stars and forks (vanity, but signals awareness)
- Number of repos importing AgentID (actual usage)
- Number of framework adapters (ecosystem integration)

### Usage (lagging indicators)

- Verification checks run (opt-in telemetry)
- Policy evaluations run
- Revocation checks performed
- Average trust level across verified manifests (are people going beyond Level 0?)

### Ecosystem health

- Third-party policy packs published
- Third-party proof providers contributed
- Community contributions to spec (issues, PRs, RFCs)
- Number of API providers accepting AgentID manifests

---

## 14. Open-source and monetization

### Always free (open-source, MIT or Apache 2.0)

- Specification and JSON Schema
- TypeScript and Python SDKs (signing, verification, policy evaluation)
- CLI
- Reference examples and policy packs
- Framework adapters
- Local revocation list support

### Monetizable (hosted services, enterprise)

| Offering | Value | Pricing model |
|---|---|---|
| **Hosted revocation feed** | Real-time revocation propagation with SLA, no self-hosting | Usage-based (free tier + paid) |
| **Agent monitoring dashboard** | Track manifest changes, key rotations, suspicious activity across your fleet | Per-agent/month |
| **Managed operator verification** | Domain and organization verification as a service (Level 1 + Level 2) | Per-verification |
| **Enterprise policy management** | UI for creating, testing, and deploying policies across teams | Per-seat/month |
| **Audit and compliance exports** | Full audit trail of trust decisions for SOC2/ISO compliance | Per-org/month |
| **Support contracts** | Priority support, integration assistance, custom policy development | Annual contract |

### Monetization sequencing

1. **Months 1-6:** Everything is free. Focus entirely on adoption.
2. **Months 6-12:** Launch hosted revocation feed (free tier generous, paid tier for SLA).
3. **Months 12-18:** Launch monitoring dashboard and managed verification.
4. **Months 18+:** Enterprise features and compliance.

---

## 15. Governance

### Specification governance

- The AgentID specification is developed in the open on GitHub.
- Schema changes follow a proposal process: open an issue, discuss for 2 weeks minimum, require 2 maintainer approvals.
- Breaking changes require a new major version and a documented migration path.
- The project commits to supporting the current and previous major version simultaneously.

### Versioning contract

- Manifest schema uses semantic versioning (`manifest_version` field).
- SDK versions are independent of schema versions.
- SDKs MUST be able to verify manifests from any supported schema version.

### Maintainer structure (initial)

- 1 lead maintainer (project creator) with merge authority.
- Goal: 3 maintainers within 6 months of launch, from at least 2 different organizations.
- Contributor license: DCO (Developer Certificate of Origin) sign-off on commits. No CLA.

---

## 16. Multi-language strategy

| Language | Priority | Timeline | Rationale |
|---|---|---|---|
| **TypeScript** | P0 | v0.1 | Largest web developer ecosystem, strong in API/service development |
| **Python** | P0 | v0.1 | Where most agent frameworks live (LangChain, CrewAI, AutoGen). Not shipping Python in v1 would be a critical miss. |
| **Go** | P1 | v1.5 | Infrastructure and backend services, growing agent ecosystem |
| **Rust** | P2 | v2.0 | Performance-critical verification, WASM compilation for browser |

### Cross-language consistency

- All SDKs MUST pass the same test vector suite.
- API surface names are consistent across languages (adjusted for language idioms).
- The specification is the source of truth, not any single SDK implementation.

---

## 17. Release plan

### v0.1 (public beta)

- Specification + JSON Schema + test vectors
- TypeScript and Python SDKs: identity, manifest, signing, verification, basic policy
- CLI: init, manifest create, sign, verify, policy test
- Domain verification (Level 1 trust)
- 5 working examples including `payment-gate`
- Published to npm and PyPI

### v1.0 (stable)

- Rotation and revocation (battle-tested)
- External security review completed
- Stable schema versioning with migration tooling
- Improved error messages and developer experience
- Performance benchmarks published

### v1.5

- Organization verification (Level 2 trust) with OIDC and certificate plug-ins
- Framework adapters: LangChain, CrewAI, AutoGen
- Pre-built policy packs: financial, data-access, general
- Go SDK
- Hosted revocation feed (free tier)

### v2.0

- Optional transparency log integration
- WASM build for browser-only verification
- Interoperability bridges (W3C DID, SPIFFE)
- Rust SDK
- Enterprise features: monitoring dashboard, compliance exports

---

## 18. Execution checklist (what you do next)

1. Create monorepo with package scaffolding: `packages/core-ts`, `packages/core-py`, `packages/cli`, `examples/`.
2. Write the specification and JSON Schema. This is the foundation; do not skip to code.
3. Write test vectors for signing, verification, and policy evaluation.
4. Implement TypeScript and Python SDKs in parallel against the test vectors.
5. Build CLI as a thin wrapper around the SDK.
6. Build all 5 examples with special emphasis on `payment-gate`.
7. Reach out to 3-5 early adopter teams building autonomous agents.
8. Publish to npm and PyPI.
9. Write one technical launch post: "How to prevent your AI agent from sending $300k to a stranger."
10. Submit adapter PRs to LangChain and CrewAI within 2 weeks of launch.
