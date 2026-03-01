import { describe, it, expect } from 'vitest';
import { generateKeypair, getAgentId } from '../src/identity.js';
import { createRotation, verifyRotation } from '../src/rotation.js';

describe('rotation', () => {
  it('creates a signed rotation statement', async () => {
    const oldKp = await generateKeypair();
    const newKp = await generateKeypair();

    const rotation = await createRotation(oldKp, newKp.publicKey);

    expect(rotation.type).toBe('rotation');
    expect(rotation.old_key_id).toBe(getAgentId(oldKp.publicKey));
    expect(rotation.new_key_id).toBe(getAgentId(newKp.publicKey));
    expect(rotation.continuity_proof).toContain('rotate:');
    expect(rotation.signature_by_old_key).toBeTruthy();
  });

  it('verifies a valid rotation statement', async () => {
    const oldKp = await generateKeypair();
    const newKp = await generateKeypair();

    const rotation = await createRotation(oldKp, newKp.publicKey);
    const { valid, errors } = await verifyRotation(rotation);

    expect(valid).toBe(true);
    expect(errors).toEqual([]);
  });

  it('rejects tampered rotation (changed new_key_id)', async () => {
    const oldKp = await generateKeypair();
    const newKp = await generateKeypair();
    const attackerKp = await generateKeypair();

    const rotation = await createRotation(oldKp, newKp.publicKey);
    rotation.new_key_id = getAgentId(attackerKp.publicKey);

    const { valid, errors } = await verifyRotation(rotation);
    expect(valid).toBe(false);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects rotation signed by wrong key', async () => {
    const oldKp = await generateKeypair();
    const newKp = await generateKeypair();
    const wrongKp = await generateKeypair();

    const rotation = await createRotation(wrongKp, newKp.publicKey);
    rotation.old_key_id = getAgentId(oldKp.publicKey);

    const { valid } = await verifyRotation(rotation);
    expect(valid).toBe(false);
  });
});
