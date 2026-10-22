use soroban_sdk::{contractevent, String};

#[contractevent(topics = ["allow_add"], data_format = "single-value")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StringAddedEvent {
    pub item: String,
}

#[contractevent(topics = ["allow_rem"], data_format = "single-value")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StringRemovedEvent {
    pub item: String,
}
