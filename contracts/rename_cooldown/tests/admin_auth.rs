use rename_cooldown::{
    RenameCooldownContract, RenameCooldownContractClient,
};
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    Address, Env,
};

#[test]
fn test_admin_transfer_and_permissions() {
    let env = Env::default();
    env.mock_all_auths();

    let initial_admin = Address::generate(&env);
    let new_admin = Address::generate(&env);

    let contract_id = env.register(RenameCooldownContract, ());
    let client = RenameCooldownContractClient::new(&env, &contract_id);

    client.initialize(&initial_admin, &100);
    assert_eq!(client.get_admin(), initial_admin);

    // Transfer admin
    client.set_admin(&new_admin);
    assert_eq!(client.get_admin(), new_admin);

    // New admin can update cooldown
    client.set_cooldown(&150);
    assert_eq!(client.get_cooldown(), 150);
}

#[test]
fn test_emergency_reset_cooldown() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_sequence_number(500);

    let admin = Address::generate(&env);
    let entry = Address::generate(&env);

    let contract_id = env.register(RenameCooldownContract, ());
    let client = RenameCooldownContractClient::new(&env, &contract_id);

    client.initialize(&admin, &500);

    // Entry renames at ledger 500, setting a 500-ledger cooldown (next allowed is 1000)
    client.record_rename(&entry, &entry);
    assert_eq!(client.get_remaining_cooldown(&entry), 500);
    assert!(!client.can_rename(&entry));

    // Admin executes emergency cooldown reset
    client.reset_cooldown(&entry);

    // Entry can now immediately rename at the current ledger (500)
    assert_eq!(client.get_remaining_cooldown(&entry), 0);
    assert!(client.can_rename(&entry));
    assert!(client.try_assert_can_rename(&entry).is_ok());

    // Record rename succeeds immediately
    let new_seq = client.record_rename(&entry, &entry);
    assert_eq!(new_seq, 500);
    assert_eq!(client.get_rename_count(&entry), 2);
}
