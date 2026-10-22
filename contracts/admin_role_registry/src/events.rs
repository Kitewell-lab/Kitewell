use soroban_sdk::{contractevent, Address};

#[contractevent(topics = ["admin", "added"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminAddedEvent {
    pub admin: Address,
}

#[contractevent(topics = ["admin", "removed"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminRemovedEvent {
    pub admin: Address,
}
