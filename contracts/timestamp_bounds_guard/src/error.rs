use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum GuardError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    InvalidBounds = 3,
    TimestampTooEarly = 4,
    TimestampTooLate = 5,
}
