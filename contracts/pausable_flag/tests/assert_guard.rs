use pausable_flag::{PausableError, PausableFlagContract, PausableFlagContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_assert_not_paused_behavior() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(PausableFlagContract, ());
    let client = PausableFlagContractClient::new(&env, &contract_id);

    client.initialize(&admin);

    // Initial state is unpaused -> assert passes
    assert!(client.try_assert_not_paused().is_ok());

    // Pause contract -> assert returns ContractPaused error
    client.set_paused(&true);
    assert_eq!(
        client.try_assert_not_paused(),
        Err(Ok(PausableError::ContractPaused))
    );

    // Unpause -> assert passes again
    client.set_paused(&false);
    assert!(client.try_assert_not_paused().is_ok());
}
