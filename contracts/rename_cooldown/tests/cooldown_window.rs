use rename_cooldown::{
    CooldownError, RenameCooldownContract, RenameCooldownContractClient,
};
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    Address, Env,
};

#[test]
fn test_exact_cooldown_boundary_conditions() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_sequence_number(500);

    let admin = Address::generate(&env);
    let entry = Address::generate(&env);

    let contract_id = env.register(RenameCooldownContract, ());
    let client = RenameCooldownContractClient::new(&env, &contract_id);

    client.initialize(&admin, &25);

    // Initial rename at sequence 500
    assert_eq!(client.record_rename(&entry, &entry), 500);

    // Ledger 524: 1 sequence short (500 + 25 = 525)
    env.ledger().set_sequence_number(524);
    assert_eq!(client.get_remaining_cooldown(&entry), 1);
    assert_eq!(
        client.try_record_rename(&entry, &entry),
        Err(Ok(CooldownError::CooldownActive))
    );

    // Ledger 525: exact boundary matches
    env.ledger().set_sequence_number(525);
    assert_eq!(client.get_remaining_cooldown(&entry), 0);
    assert_eq!(client.record_rename(&entry, &entry), 525);

    // Next boundary is 525 + 25 = 550
    // Far jump to ledger 600
    env.ledger().set_sequence_number(600);
    assert_eq!(client.get_remaining_cooldown(&entry), 0);
    assert_eq!(client.record_rename(&entry, &entry), 600);
    assert_eq!(client.get_rename_count(&entry), 3);
}

#[test]
fn test_multiple_isolated_entries() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_sequence_number(100);

    let admin = Address::generate(&env);
    let entry_a = Address::generate(&env);
    let entry_b = Address::generate(&env);

    let contract_id = env.register(RenameCooldownContract, ());
    let client = RenameCooldownContractClient::new(&env, &contract_id);

    client.initialize(&admin, &30);

    // Entry A renames at ledger 100
    client.record_rename(&entry_a, &entry_a);
    assert_eq!(client.get_last_rename_ledger(&entry_a), Some(100));
    assert_eq!(client.get_last_rename_ledger(&entry_b), None);

    // Entry A is in cooldown, but Entry B is completely unblocked
    assert!(!client.can_rename(&entry_a));
    assert!(client.can_rename(&entry_b));

    // Entry B renames at ledger 110
    env.ledger().set_sequence_number(110);
    client.record_rename(&entry_b, &entry_b);
    assert_eq!(client.get_last_rename_ledger(&entry_b), Some(110));

    // At ledger 130: Entry A cooldown has expired (100 + 30 = 130), but Entry B still has 10 ledgers (110 + 30 = 140)
    env.ledger().set_sequence_number(130);
    assert!(client.can_rename(&entry_a));
    assert!(!client.can_rename(&entry_b));
    assert_eq!(client.get_remaining_cooldown(&entry_b), 10);

    // Entry A can rename again at 130
    assert_eq!(client.record_rename(&entry_a, &entry_a), 130);
    assert_eq!(client.get_rename_count(&entry_a), 2);
    assert_eq!(client.get_rename_count(&entry_b), 1);
}

#[test]
fn test_dynamic_cooldown_updates() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_sequence_number(1000);

    let admin = Address::generate(&env);
    let entry = Address::generate(&env);

    let contract_id = env.register(RenameCooldownContract, ());
    let client = RenameCooldownContractClient::new(&env, &contract_id);

    client.initialize(&admin, &20);

    client.record_rename(&entry, &entry);
    assert_eq!(client.get_remaining_cooldown(&entry), 20);

    // Admin lengthens the cooldown to 100 ledgers
    client.set_cooldown(&100);
    assert_eq!(client.get_cooldown(), 100);

    // Now remaining cooldown for entry reflects the new threshold (1000 + 100 - 1000 = 100)
    assert_eq!(client.get_remaining_cooldown(&entry), 100);

    // Admin shortens the cooldown to 10 ledgers
    client.set_cooldown(&10);
    assert_eq!(client.get_cooldown(), 10);

    // At ledger 1010, the shortened cooldown is satisfied
    env.ledger().set_sequence_number(1010);
    assert_eq!(client.get_remaining_cooldown(&entry), 0);
    assert!(client.can_rename(&entry));
}
