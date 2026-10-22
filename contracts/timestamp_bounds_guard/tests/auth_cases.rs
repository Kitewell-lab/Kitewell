use soroban_sdk::{testutils::Address as _, testutils::Ledger as _, Address, Env};
use timestamp_bounds_guard::{
    TimestampBounds, TimestampBoundsGuardContract,
    TimestampBoundsGuardContractClient,
};

#[test]
fn test_admin_update_bounds_and_ledger_validation() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(TimestampBoundsGuardContract, ());
    let client = TimestampBoundsGuardContractClient::new(&env, &contract_id);

    client.initialize(&admin, &1000, &2000);

    // Update bounds
    client.set_bounds(&3000, &4000);
    let bounds: TimestampBounds = client.get_bounds();
    assert_eq!(bounds.min_timestamp, 3000);
    assert_eq!(bounds.max_timestamp, 4000);

    // Set ledger timestamp
    env.ledger().set_timestamp(3500);
    assert!(client.try_validate_current_ledger().is_ok());

    // Advance ledger timestamp beyond max
    env.ledger().set_timestamp(4001);
    assert!(client.try_validate_current_ledger().is_err());
}
