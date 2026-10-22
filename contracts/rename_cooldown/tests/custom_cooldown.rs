use rename_cooldown::{
    RenameCooldownContract, RenameCooldownContractClient,
};
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    Address, Env,
};

#[test]
fn test_custom_per_entry_cooldown_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_sequence_number(100);

    let admin = Address::generate(&env);
    let regular_entry = Address::generate(&env);
    let restricted_entry = Address::generate(&env);

    let contract_id = env.register(RenameCooldownContract, ());
    let client = RenameCooldownContractClient::new(&env, &contract_id);

    client.initialize(&admin, &50);

    // Initial effective cooldown is default (50) for both
    assert_eq!(client.get_effective_cooldown(&regular_entry), 50);
    assert_eq!(client.get_effective_cooldown(&restricted_entry), 50);

    // Admin sets custom strict cooldown (200 ledgers) for restricted_entry
    client.set_entry_cooldown(&restricted_entry, &200);
    assert_eq!(client.get_effective_cooldown(&regular_entry), 50);
    assert_eq!(client.get_effective_cooldown(&restricted_entry), 200);

    // Both entries rename at ledger 100
    client.record_rename(&regular_entry, &regular_entry);
    client.record_rename(&restricted_entry, &restricted_entry);

    assert_eq!(client.get_remaining_cooldown(&regular_entry), 50);
    assert_eq!(client.get_remaining_cooldown(&restricted_entry), 200);

    // Advance to ledger 150 (50 ledgers later)
    env.ledger().set_sequence_number(150);
    assert!(client.can_rename(&regular_entry));
    assert_eq!(client.get_remaining_cooldown(&regular_entry), 0);

    // Restricted entry still has 150 ledgers left in cooldown
    assert!(!client.can_rename(&restricted_entry));
    assert_eq!(client.get_remaining_cooldown(&restricted_entry), 150);

    // Admin clears custom cooldown for restricted_entry; it reverts to default (50)
    client.clear_entry_cooldown(&restricted_entry);
    assert_eq!(client.get_effective_cooldown(&restricted_entry), 50);

    // Because 50 ledgers have passed since ledger 100, restricted_entry is now immediately unblocked
    assert_eq!(client.get_remaining_cooldown(&restricted_entry), 0);
    assert!(client.can_rename(&restricted_entry));
    assert!(client.try_assert_can_rename(&restricted_entry).is_ok());
}
