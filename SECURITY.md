# Security Policy

AgentID is a security-critical project. We take vulnerabilities seriously.

## Supported versions

| Version | Supported |
|---|---|
| 0.x (pre-release) | Yes (best effort) |
| 1.x (when released) | Yes (full support) |

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, report vulnerabilities privately:

1. Email: **security@agentid.dev** (update this with your actual security contact)
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Response timeline

- **Acknowledgment**: within 48 hours
- **Initial assessment**: within 1 week
- **Fix or mitigation**: within 2 weeks for critical issues, 4 weeks for others
- **Public disclosure**: coordinated with the reporter after a fix is available

## Scope

The following are in scope:

- Signature verification bypass
- Key derivation weaknesses
- Policy evaluation bypass
- Manifest canonicalization issues that could lead to signature mismatch
- Revocation check bypass
- Replay attack vectors in the handshake protocol
- Dependency vulnerabilities in crypto libraries

The following are out of scope:

- Issues in example code that is explicitly marked as non-production
- Denial of service via malformed input (unless it causes a crash in a commonly deployed configuration)
- Social engineering of project maintainers

## Crypto libraries

AgentID uses only established, audited cryptographic libraries:

- **TypeScript**: `@noble/ed25519` (audited, pure JS, no native dependencies)
- **Python**: `PyNaCl` (libsodium bindings, extensively audited)

We do not implement custom cryptographic primitives. If you find any custom crypto, that is a bug.
