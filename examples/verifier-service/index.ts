/**
 * Verifier Service Example
 *
 * An HTTP server that requires AgentID verification before serving requests.
 * Demonstrates how an API/service owner gates access based on agent trust posture.
 */

import { createServer } from 'node:http';
import {
  verifySignedManifest,
  evaluatePolicy,
} from '@agentid-sdk/core';
import type { Policy, SignedManifest, TrustLevel } from '@agentid-sdk/core';

const policy: Policy = {
  policy_version: '0.1',
  rules: [
    {
      action: 'data:read',
      require: {
        min_trust_level: 0,
        manifest_not_expired: true,
        not_revoked: true,
        capability_declared: 'data:read',
      },
      on_fail: 'REJECT',
    },
  ],
  default: 'REJECT',
};

const server = createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/api/data') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  const body = await readBody(req);
  let signedManifest: SignedManifest;
  try {
    const parsed = JSON.parse(body);
    signedManifest = parsed.signed_manifest;
    if (!signedManifest) throw new Error('Missing signed_manifest');
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid request body. Include { signed_manifest: {...} }' }));
    return;
  }

  const verification = await verifySignedManifest(signedManifest);
  if (!verification.valid) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Verification failed',
      details: verification.errors,
    }));
    return;
  }

  const policyResult = evaluatePolicy(
    {
      manifest: verification.manifest!,
      trustLevel: verification.trust_level as TrustLevel,
      action: 'data:read',
      revoked: verification.revoked,
      expired: verification.expired,
    },
    policy
  );

  if (policyResult.decision !== 'ACCEPT') {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: `Policy decision: ${policyResult.decision}`,
      reasons: policyResult.reasons,
    }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    message: 'Access granted',
    agent: verification.manifest!.name,
    trust_level: verification.trust_level,
    data: { sample: 'This is the protected data.' },
  }));
});

function readBody(req: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
  });
}

const PORT = 3456;
server.listen(PORT, () => {
  console.log(`=== AgentID Verifier Service ===`);
  console.log(`Listening on http://localhost:${PORT}`);
  console.log(`\nPOST /api/data with { "signed_manifest": {...} }`);
  console.log(`The service verifies the agent's identity and evaluates policy before responding.\n`);
});
