use pausable_flag::{PausableFlagContract, PausableFlagContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_lifecycle_happy_path() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(PausableFlagContract, ());
    let client = PausableFlagContractClient::new(&env, &contract_id);

    client.initialize(&admin);

    assert_eq!(client.get_admin(), admin);
    assert!(!client.is_paused());

    // Pause contract
    client.set_paused(&true);
    assert!(client.is_paused());

    // Unpause contract
    client.set_paused(&false);
    assert!(!client.is_paused());
}
