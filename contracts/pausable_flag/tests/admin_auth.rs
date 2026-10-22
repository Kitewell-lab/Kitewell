use pausable_flag::{PausableFlagContract, PausableFlagContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_admin_transfer_and_control() {
    let env = Env::default();
    env.mock_all_auths();

    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);
    let contract_id = env.register(PausableFlagContract, ());
    let client = PausableFlagContractClient::new(&env, &contract_id);

    client.initialize(&admin1);
    assert_eq!(client.get_admin(), admin1);

    // Transfer admin to admin2
    client.set_admin(&admin2);
    assert_eq!(client.get_admin(), admin2);

    // admin2 can pause
    client.set_paused(&true);
    assert!(client.is_paused());
}
