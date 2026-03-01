/**
 * @agentid-protocol/core - Cryptographic identity, manifests, signing, verification,
 * and policy evaluation for AI agents.
 *
 * @packageDocumentation
 */

export { generateKeypair, loadKeypair, saveKeypair, getAgentId } from './identity.js';
export type { SaveKeypairOptions } from './identity.js';
export {
  createManifest,
  validateManifest,
  canonicalizeManifest,
} from './manifest.js';
export type { CreateManifestConfig } from './manifest.js';
export { signManifest, signMessage } from './signing.js';
export {
  verifySignedManifest,
  verifySignedMessage,
  verifyRevocationSignature,
} from './verification.js';
export type { VerifyOptions } from './verification.js';
export { evaluatePolicy, loadPolicy } from './policy.js';
export type { PolicyContext } from './policy.js';
export {
  createRevocation,
  checkRevocation,
  loadRevocationList,
} from './revocation.js';
export type { LoadRevocationListOptions } from './revocation.js';
export { createRotation, verifyRotation } from './rotation.js';

export type {
  Keypair,
  AgentManifest,
  Capability,
  Constraint,
  Operator,
  SignedManifest,
  SignedMessage,
  RevocationStatement,
  RotationStatement,
  Policy,
  PolicyRule,
  PolicyResult,
  PolicyDecision,
  TrustLevel,
  VerificationResult,
} from './types.js';
