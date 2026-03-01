from agentid.identity import generate_keypair, get_agent_id
from agentid.rotation import create_rotation, verify_rotation


def test_create_rotation():
    old_kp = generate_keypair()
    new_kp = generate_keypair()
    rot = create_rotation(old_kp, new_kp.public_key)
    assert rot.type == "rotation"
    assert rot.old_key_id == get_agent_id(old_kp.public_key)
    assert rot.new_key_id == get_agent_id(new_kp.public_key)
    assert rot.signature_by_old_key


def test_verify_rotation():
    old_kp = generate_keypair()
    new_kp = generate_keypair()
    rot = create_rotation(old_kp, new_kp.public_key)
    valid, errors = verify_rotation(rot)
    assert valid is True
    assert errors == []


def test_reject_tampered_new_key():
    old_kp = generate_keypair()
    new_kp = generate_keypair()
    attacker_kp = generate_keypair()
    rot = create_rotation(old_kp, new_kp.public_key)
    rot.new_key_id = get_agent_id(attacker_kp.public_key)
    valid, errors = verify_rotation(rot)
    assert valid is False
    assert len(errors) > 0


def test_reject_wrong_signing_key():
    old_kp = generate_keypair()
    new_kp = generate_keypair()
    wrong_kp = generate_keypair()
    rot = create_rotation(wrong_kp, new_kp.public_key)
    rot.old_key_id = get_agent_id(old_kp.public_key)
    valid, errors = verify_rotation(rot)
    assert valid is False
