use soroban_sdk::{contractevent, Address};

#[contractevent(topics = ["rename_cd", "init"], data_format = "vec")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InitializedEvent {
    pub admin: Address,
    pub cooldown: u32,
}

#[contractevent(topics = ["rename_cd", "admin_xfer"], data_format = "vec")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminTransferredEvent {
    pub old_admin: Address,
    pub new_admin: Address,
}

#[contractevent(topics = ["rename_cd", "cd_update"], data_format = "vec")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CooldownUpdatedEvent {
    pub old_cooldown: u32,
    pub new_cooldown: u32,
}

#[contractevent(topics = ["rename_cd", "recorded"], data_format = "vec")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RenameRecordedEvent {
    pub entry: Address,
    pub caller: Address,
    pub ledger: u32,
    pub next_allowed_ledger: u32,
}

#[contractevent(topics = ["rename_cd", "reset"], data_format = "vec")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CooldownResetEvent {
    pub entry: Address,
    pub admin: Address,
}

#[contractevent(topics = ["rename_cd", "entry_cd"], data_format = "vec")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EntryCooldownSetEvent {
    pub entry: Address,
    pub cooldown: u32,
}

#[contractevent(topics = ["rename_cd", "entry_clr"], data_format = "vec")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EntryCooldownClearedEvent {
    pub entry: Address,
    pub admin: Address,
}
