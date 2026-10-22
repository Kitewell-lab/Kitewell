use event_counter::{CounterError, EventCounterContract, EventCounterContractClient};
use soroban_sdk::{symbol_short, Env};

#[test]
fn test_zero_increment_error() {
    let env = Env::default();
    let contract_id = env.register(EventCounterContract, ());
    let client = EventCounterContractClient::new(&env, &contract_id);

    let key = symbol_short!("test");
    let res = client.try_increment_by(&key, &0);
    assert_eq!(res, Err(Ok(CounterError::ZeroIncrement)));
}

#[test]
fn test_overflow_error() {
    let env = Env::default();
    let contract_id = env.register(EventCounterContract, ());
    let client = EventCounterContractClient::new(&env, &contract_id);

    let key = symbol_short!("overflow");

    // Set close to u64::MAX
    client.increment_by(&key, &u64::MAX);
    assert_eq!(client.get_count(&key), u64::MAX);

    // Incrementing by 1 should overflow
    let res = client.try_increment(&key);
    assert_eq!(res, Err(Ok(CounterError::Overflow)));
}
