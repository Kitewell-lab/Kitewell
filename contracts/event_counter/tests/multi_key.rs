use event_counter::{EventCounterContract, EventCounterContractClient};
use soroban_sdk::{symbol_short, Env};

#[test]
fn test_multiple_independent_keys() {
    let env = Env::default();
    let contract_id = env.register(EventCounterContract, ());
    let client = EventCounterContractClient::new(&env, &contract_id);

    let key_login = symbol_short!("login");
    let key_signup = symbol_short!("signup");
    let key_order = symbol_short!("order");

    client.increment_by(&key_login, &10);
    client.increment_by(&key_signup, &5);
    client.increment(&key_order);

    assert_eq!(client.get_count(&key_login), 10);
    assert_eq!(client.get_count(&key_signup), 5);
    assert_eq!(client.get_count(&key_order), 1);
    assert_eq!(client.get_total_count(), 16);
}
