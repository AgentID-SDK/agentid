import * as ed25519 from '@noble/ed25519';
import type { Keypair, AgentManifest, SignedManifest, SignedMessage } from './types.js';
import { canonicalizeManifest } from './manifest.js';
import { getAgentId } from './identity.js';
import { encodeBase64 } from './utils.js';

/** Sign a manifest, producing a signed envelope. */
export async function signManifest(
  manifest: AgentManifest,
  keypair: Keypair
): Promise<SignedManifest> {
  const payload = canonicalizeManifest(manifest);
  const payloadBytes = new TextEncoder().encode(payload);
  const signatureBytes = await ed25519.signAsync(payloadBytes, keypair.privateKey);

  return {
    payload,
    signature: encodeBase64(signatureBytes),
    key_id: getAgentId(keypair.publicKey),
    signed_at: new Date().toISOString(),
  };
}

/** Sign an arbitrary message (used for nonce-based handshakes). */
export async function signMessage(
  payload: string,
  nonce: string,
  keypair: Keypair,
  manifestRef: string
): Promise<SignedMessage> {
  const message = `${nonce}:${payload}:${manifestRef}`;
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = await ed25519.signAsync(messageBytes, keypair.privateKey);

  return {
    payload: encodeBase64(new TextEncoder().encode(payload)),
    nonce,
    agent_id: getAgentId(keypair.publicKey),
    manifest_ref: manifestRef,
    signature: encodeBase64(signatureBytes),
    signed_at: new Date().toISOString(),
  };
}
