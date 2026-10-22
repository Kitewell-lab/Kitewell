use soroban_sdk::{contracterror, contracttype, Address};

/// Maximum default number of tags allowed per builder address.
pub const DEFAULT_MAX_TAGS: u32 = 10;

/// Maximum character byte length for an individual tag.
pub const MAX_TAG_LENGTH: u32 = 32;

/// Contract storage keys.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Contract administrator address.
    Admin,
    /// Configured maximum tags per builder.
    MaxTagsLimit,
    /// Vector of tags associated with a builder address.
    BuilderTags(Address),
}

/// Errors returned by the builder tag registry contract.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum TagError {
    /// The contract has not yet been initialized.
    NotInitialized = 1,
    /// The contract has already been initialized.
    AlreadyInitialized = 2,
    /// Caller is not authorized to perform the operation.
    Unauthorized = 3,
    /// Provided tag is empty.
    TagEmpty = 4,
    /// Tag exceeds the maximum permitted byte length (32 bytes).
    TagTooLong = 5,
    /// Builder has reached the maximum permitted number of tags.
    TagLimitReached = 6,
    /// The tag has already been assigned to this builder.
    TagAlreadyExists = 7,
    /// The specified tag was not found on this builder.
    TagNotFound = 8,
    /// Configured maximum tag limit must be greater than zero and at most 100.
    InvalidMaxLimit = 9,
}
