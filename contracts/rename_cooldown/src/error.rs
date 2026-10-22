use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum CooldownError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    ZeroCooldown = 3,
    CooldownActive = 4,
    Unauthorized = 5,
}
