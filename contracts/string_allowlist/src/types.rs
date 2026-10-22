use soroban_sdk::{contracttype, String};

pub const MAX_STRING_LEN: u32 = 64;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    Allowed(String),
    Count,
}
