use rename_cooldown::{
    calculate_remaining_ledgers, is_rename_allowed, RenameCooldownContract,
    RenameCooldownContractClient,
};
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    Address, Env,
};

#[test]
fn test_pure_helper_functions() {
    // When an entry has never been renamed, remaining is 0 and rename is permitted
    assert_eq!(calculate_remaining_ledgers(100, None, 50), 0);
    assert!(is_rename_allowed(100, None, 50));

    // Entry renamed at ledger 100 with cooldown 50 -> permitted at or after ledger 150
    assert_eq!(calculate_remaining_ledgers(100, Some(100), 50), 50);
    assert!(!is_rename_allowed(100, Some(100), 50));

    assert_eq!(calculate_remaining_ledgers(149, Some(100), 50), 1);
    assert!(!is_rename_allowed(149, Some(100), 50));

    assert_eq!(calculate_remaining_ledgers(150, Some(100), 50), 0);
    assert!(is_rename_allowed(150, Some(100), 50));

    assert_eq!(calculate_remaining_ledgers(200, Some(100), 50), 0);
    assert!(is_rename_allowed(200, Some(100), 50));
}

#[test]
fn test_contract_lifecycle_happy_path() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_sequence_number(100);

    let admin = Address::generate(&env);
    let entry = Address::generate(&env);

    let contract_id = env.register(RenameCooldownContract, ());
    let client = RenameCooldownContractClient::new(&env, &contract_id);

    client.initialize(&admin, &50);

    assert_eq!(client.get_admin(), admin);
    assert_eq!(client.get_cooldown(), 50);
    assert_eq!(client.get_rename_count(&entry), 0);
    assert_eq!(client.get_last_rename_ledger(&entry), None);
    assert_eq!(client.get_remaining_cooldown(&entry), 0);
    assert!(client.can_rename(&entry));
    assert!(client.try_assert_can_rename(&entry).is_ok());

    // Record initial rename at ledger 100
    let recorded = client.record_rename(&entry, &entry);
    assert_eq!(recorded, 100);
    assert_eq!(client.get_rename_count(&entry), 1);
    assert_eq!(client.get_last_rename_ledger(&entry), Some(100));

    // Immediately after, cooldown is active (remaining 50 ledgers)
    assert_eq!(client.get_remaining_cooldown(&entry), 50);
    assert!(!client.can_rename(&entry));
    assert!(client.try_assert_can_rename(&entry).is_err());

    // Advance ledger to 149 (1 ledger remaining before window opens)
    env.ledger().set_sequence_number(149);
    assert_eq!(client.get_remaining_cooldown(&entry), 1);
    assert!(!client.can_rename(&entry));

    // Advance ledger to 150 (window opens exactly at 150)
    env.ledger().set_sequence_number(150);
    assert_eq!(client.get_remaining_cooldown(&entry), 0);
    assert!(client.can_rename(&entry));
    assert!(client.try_assert_can_rename(&entry).is_ok());

    // Record second rename at ledger 150
    let recorded2 = client.record_rename(&entry, &entry);
    assert_eq!(recorded2, 150);
    assert_eq!(client.get_rename_count(&entry), 2);
    assert_eq!(client.get_last_rename_ledger(&entry), Some(150));

    // Now new cooldown requires reaching ledger 200
    assert_eq!(client.get_remaining_cooldown(&entry), 50);
    assert!(!client.can_rename(&entry));

    env.ledger().set_sequence_number(200);
    assert_eq!(client.get_remaining_cooldown(&entry), 0);
    assert!(client.can_rename(&entry));
}
