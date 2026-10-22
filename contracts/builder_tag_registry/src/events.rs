use soroban_sdk::{contractevent, Address, Env, String};

#[contractevent(topics = ["builder_tag_registry", "tag_added"], data_format = "vec")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TagAddedEvent {
    pub builder: Address,
    pub tag: String,
}

#[contractevent(topics = ["builder_tag_registry", "tag_removed"], data_format = "vec")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TagRemovedEvent {
    pub builder: Address,
    pub tag: String,
}

#[contractevent(topics = ["builder_tag_registry", "tags_cleared"], data_format = "vec")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TagsClearedEvent {
    pub builder: Address,
    pub count: u32,
}

#[contractevent(topics = ["builder_tag_registry", "admin_updated"], data_format = "vec")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminUpdatedEvent {
    pub old_admin: Address,
    pub new_admin: Address,
}

#[contractevent(topics = ["builder_tag_registry", "limit_updated"], data_format = "vec")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MaxLimitUpdatedEvent {
    pub old_limit: u32,
    pub new_limit: u32,
}

pub fn emit_tag_added(env: &Env, builder: &Address, tag: &String) {
    TagAddedEvent {
        builder: builder.clone(),
        tag: tag.clone(),
    }
    .publish(env);
}

pub fn emit_tag_removed(env: &Env, builder: &Address, tag: &String) {
    TagRemovedEvent {
        builder: builder.clone(),
        tag: tag.clone(),
    }
    .publish(env);
}

pub fn emit_tags_cleared(env: &Env, builder: &Address, count: u32) {
    TagsClearedEvent {
        builder: builder.clone(),
        count,
    }
    .publish(env);
}

pub fn emit_admin_updated(env: &Env, old_admin: &Address, new_admin: &Address) {
    AdminUpdatedEvent {
        old_admin: old_admin.clone(),
        new_admin: new_admin.clone(),
    }
    .publish(env);
}

pub fn emit_limit_updated(env: &Env, old_limit: u32, new_limit: u32) {
    MaxLimitUpdatedEvent {
        old_limit,
        new_limit,
    }
    .publish(env);
}
