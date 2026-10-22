use rename_cooldown::{
    CooldownError, RenameCooldownContract, RenameCooldownContractClient,
};
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    Address, Env,
};

#[test]
fn test_uninitialized_contract_rejections() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let entry = Address::generate(&env);

    let contract_id = env.register(RenameCooldownContract, ());
    let client = RenameCooldownContractClient::new(&env, &contract_id);

    // Queries before initialization return NotInitialized
    assert_eq!(
        client.try_get_admin(),
        Err(Ok(CooldownError::NotInitialized))
    );
    assert_eq!(
        client.try_get_cooldown(),
        Err(Ok(CooldownError::NotInitialized))
    );
    assert_eq!(
        client.try_get_remaining_cooldown(&entry),
        Err(Ok(CooldownError::NotInitialized))
    );
    assert_eq!(
        client.try_can_rename(&entry),
        Err(Ok(CooldownError::NotInitialized))
    );
    assert_eq!(
        client.try_assert_can_rename(&entry),
        Err(Ok(CooldownError::NotInitialized))
    );
    assert_eq!(
        client.try_record_rename(&entry, &entry),
        Err(Ok(CooldownError::NotInitialized))
    );
    assert_eq!(
        client.try_set_cooldown(&50),
        Err(Ok(CooldownError::NotInitialized))
    );
    assert_eq!(
        client.try_set_admin(&admin),
        Err(Ok(CooldownError::NotInitialized))
    );
    assert_eq!(
        client.try_reset_cooldown(&entry),
        Err(Ok(CooldownError::NotInitialized))
    );
}

#[test]
fn test_duplicate_initialization_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);

    let contract_id = env.register(RenameCooldownContract, ());
    let client = RenameCooldownContractClient::new(&env, &contract_id);

    assert!(client.try_initialize(&admin1, &60).is_ok());
    assert_eq!(
        client.try_initialize(&admin2, &100),
        Err(Ok(CooldownError::AlreadyInitialized))
    );
}

#[test]
fn test_zero_cooldown_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let entry = Address::generate(&env);

    let contract_id = env.register(RenameCooldownContract, ());
    let client = RenameCooldownContractClient::new(&env, &contract_id);

    // Initializing with 0 is rejected
    assert_eq!(
        client.try_initialize(&admin, &0),
        Err(Ok(CooldownError::ZeroCooldown))
    );

    // Initialize with valid cooldown
    client.initialize(&admin, &40);

    // Setting cooldown to 0 is rejected
    assert_eq!(
        client.try_set_cooldown(&0),
        Err(Ok(CooldownError::ZeroCooldown))
    );

    // Setting entry cooldown to 0 is rejected
    assert_eq!(
        client.try_set_entry_cooldown(&entry, &0),
        Err(Ok(CooldownError::ZeroCooldown))
    );
}

#[test]
fn test_unauthorized_record_rename_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_sequence_number(200);

    let admin = Address::generate(&env);
    let victim = Address::generate(&env);
    let attacker = Address::generate(&env);

    let contract_id = env.register(RenameCooldownContract, ());
    let client = RenameCooldownContractClient::new(&env, &contract_id);

    client.initialize(&admin, &50);

    // Third-party caller attempting to trigger rename cooldown on victim is rejected
    assert_eq!(
        client.try_record_rename(&attacker, &victim),
        Err(Ok(CooldownError::Unauthorized))
    );

    // Victim can rename themselves
    assert!(client.try_record_rename(&victim, &victim).is_ok());

    // Admin can also trigger rename on behalf of victim
    env.ledger().set_sequence_number(300);
    assert!(client.try_record_rename(&admin, &victim).is_ok());
}
