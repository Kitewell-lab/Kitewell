use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum AllowlistError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    StringEmpty = 3,
    StringTooLong = 4,
    AlreadyAllowed = 5,
    NotAllowed = 6,
}
