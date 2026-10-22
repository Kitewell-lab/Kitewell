use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum AdminRoleError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    NotAuthorized = 3,
    AlreadyAdmin = 4,
    NoSuchAdmin = 5,
    CannotRemoveLastAdmin = 6,
}
