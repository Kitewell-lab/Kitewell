use soroban_sdk::{contractevent, Symbol};

#[contractevent(topics = ["counter_inc"], data_format = "vec")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CounterIncrementEvent {
    pub key: Symbol,
    pub amount: u64,
    pub new_count: u64,
    pub total_count: u64,
}
