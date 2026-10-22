use event_counter::{EventCounterContract, EventCounterContractClient};
use soroban_sdk::{symbol_short, Env};

#[test]
fn test_increment_happy_path() {
    let env = Env::default();
    let contract_id = env.register(EventCounterContract, ());
    let client = EventCounterContractClient::new(&env, &contract_id);

    let key = symbol_short!("clicks");

    assert_eq!(client.get_count(&key), 0);
    assert_eq!(client.get_total_count(), 0);
    assert!(!client.has_key(&key));

    // First increment
    let count1 = client.increment(&key);
    assert_eq!(count1, 1);
    assert_eq!(client.get_count(&key), 1);
    assert_eq!(client.get_total_count(), 1);
    assert!(client.has_key(&key));

    // Second increment
    let count2 = client.increment(&key);
    assert_eq!(count2, 2);
    assert_eq!(client.get_count(&key), 2);
    assert_eq!(client.get_total_count(), 2);
}
