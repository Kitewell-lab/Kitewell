use event_counter::{EventCounterContract, EventCounterContractClient};
use soroban_sdk::{symbol_short, Env};

#[test]
fn test_large_increment_and_nonexistent_keys() {
    let env = Env::default();
    let contract_id = env.register(EventCounterContract, ());
    let client = EventCounterContractClient::new(&env, &contract_id);

    let key = symbol_short!("metrics");
    let missing_key = symbol_short!("missing");

    assert_eq!(client.get_count(&missing_key), 0);
    assert!(!client.has_key(&missing_key));

    // Large increment
    let large_amt = 1_000_000_000_000u64;
    let res = client.increment_by(&key, &large_amt);
    assert_eq!(res, large_amt);
    assert_eq!(client.get_count(&key), large_amt);
    assert_eq!(client.get_total_count(), large_amt);
    assert!(client.has_key(&key));
}
