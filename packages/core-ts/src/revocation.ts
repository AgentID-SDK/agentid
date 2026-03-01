import * as ed25519 from '@noble/ed25519';
import { readFile } from 'node:fs/promises';
import type { Keypair, RevocationStatement } from './types.js';
import { getAgentId } from './identity.js';
import { encodeBase64 } from './utils.js';
import { verifyRevocationSignature } from './verification.js';

function canonicalizeRevocationPayload(
  statement: Omit<RevocationStatement, 'signature'>
): string {
  return JSON.stringify({
    type: statement.type,
    agent_id: statement.agent_id,
    revoked_key_id: statement.revoked_key_id,
    revoked_at: statement.revoked_at,
    reason: statement.reason,
  });
}

export async function createRevocation(
  agentId: string,
  revokedKeyId: string,
  reason: string,
  signingKeypair: Keypair
): Promise<RevocationStatement> {
  const statement: Omit<RevocationStatement, 'signature'> = {
    type: 'revocation',
    agent_id: agentId,
    revoked_key_id: revokedKeyId,
    revoked_at: new Date().toISOString(),
    reason,
  };

  const payload = canonicalizeRevocationPayload(statement);
  const payloadBytes = new TextEncoder().encode(payload);
  const signatureBytes = await ed25519.signAsync(payloadBytes, signingKeypair.privateKey);

  return {
    ...statement,
    signature: encodeBase64(signatureBytes),
  };
}

export function checkRevocation(
  keyId: string,
  revocationList: RevocationStatement[]
): { revoked: boolean; statement?: RevocationStatement } {
  const match = revocationList.find(
    (r) => r.revoked_key_id === keyId || r.agent_id === keyId
  );
  return match ? { revoked: true, statement: match } : { revoked: false };
}

export interface LoadRevocationListOptions {
  /** Defaults to true. Set to false only for debugging. */
  verifySignatures?: boolean;
}

export async function loadRevocationList(
  source: string,
  options: LoadRevocationListOptions = {}
): Promise<RevocationStatement[]> {
  const verifySignatures = options.verifySignatures ?? true;
  let raw: string;

  if (source.startsWith('http://') || source.startsWith('https://')) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(source, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Failed to fetch revocation list from ${source}: ${response.status}`);
      }
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > 10 * 1024 * 1024) {
        throw new Error('Revocation list exceeds 10MB size limit');
      }
      raw = await response.text();
      if (raw.length > 10 * 1024 * 1024) {
        throw new Error('Revocation list exceeds 10MB size limit');
      }
    } finally {
      clearTimeout(timeout);
    }
  } else {
    raw = await readFile(source, 'utf-8');
  }

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('Revocation list must be a JSON array');
  }

  const statements = parsed as RevocationStatement[];

  if (!verifySignatures) return statements;

  const verified: RevocationStatement[] = [];
  for (const stmt of statements) {
    const valid = await verifyRevocationSignature(stmt);
    if (valid) {
      verified.push(stmt);
    }
  }
  return verified;
}
