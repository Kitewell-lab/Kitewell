use soroban_sdk::{contracttype, Address};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    DefaultCooldown,
    LastRename(Address),
    RenameCount(Address),
    CustomCooldown(Address),
}
