#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, symbol_short, Address, Env, String, Symbol,
};

const LAB: Symbol = symbol_short!("KITEWELL");
const COUNT: Symbol = symbol_short!("COUNT");
const ADMIN: Symbol = symbol_short!("ADMIN");
const PAUSED: Symbol = symbol_short!("PAUSED");

/// Contract errors.
///
/// Pattern chosen: a `#[contracterror]` enum returned as `Result<_, Error>`.
/// Compared with a stringly `panic!`, this keeps `EmptyName` in the contract
/// spec and lets the generated `try_register` surface it as
/// `Err(Ok(Error::EmptyName))`. (`panic_with_error!(&env, Error::EmptyName)` is
/// the equivalent for a fn that must keep a non-`Result` signature.)
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    EmptyName = 1,
    AlreadyInit = 2,
    NotAdmin = 3,
    Paused = 4,
}

#[contract]
pub struct Kitewell;

#[contractimpl]
impl Kitewell {
    /// One-time initialiser that sets the admin address.
    pub fn init(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&ADMIN) {
            return Err(Error::AlreadyInit);
        }
        env.storage().instance().set(&ADMIN, &admin);
        Ok(())
    }

    /// Admin-only pause / unpause toggle.
    pub fn set_paused(env: Env, admin: Address, paused: bool) -> Result<(), Error> {
        admin.require_auth();
        let stored: Address = env
            .storage()
            .instance()
            .get(&ADMIN)
            .ok_or(Error::NotAdmin)?;
        if admin != stored {
            return Err(Error::NotAdmin);
        }
        env.storage().instance().set(&PAUSED, &paused);
        Ok(())
    }

    /// Returns the lab name. Useful as a smoke-test invoke.
    pub fn lab_name(env: Env) -> String {
        String::from_str(&env, "Kitewell")
    }

    /// How many builders have checked in.
    pub fn builder_count(env: Env) -> u32 {
        env.storage().instance().get(&COUNT).unwrap_or(0)
    }

    /// Check in a builder nickname for `caller`. Overwrites previous name.
    ///
    /// Rejects an empty nickname, so a stored builder always has a name.
    pub fn register(env: Env, caller: Address, name: String) -> Result<(), Error> {
        caller.require_auth();

        // Empty-name guard: payload validation only, so it stays independent of
        // the admin pause flag (#13) and of any other state-based check.
        if name.is_empty() {
            return Err(Error::EmptyName);
        }

        let paused: bool = env.storage().instance().get(&PAUSED).unwrap_or(false);
        if paused {
            return Err(Error::Paused);
        }

        let key = (LAB, caller.clone());
        let is_new = !env.storage().persistent().has(&key);
        env.storage().persistent().set(&key, &name);

        if is_new {
            let count: u32 = env.storage().instance().get(&COUNT).unwrap_or(0);
            env.storage().instance().set(&COUNT, &(count + 1));
            env.storage().instance().extend_ttl(1000, 5000);
        }

        env.storage().persistent().extend_ttl(&key, 1000, 5000);

        Ok(())
    }

    /// Look up a builder's registered nickname, if any.
    pub fn get_builder(env: Env, address: Address) -> Option<String> {
        let key = (LAB, address);
        env.storage().persistent().get(&key)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn lab_name_works() {
        let env = Env::default();
        let id = env.register(Kitewell, ());
        let client = KitewellClient::new(&env, &id);
        assert_eq!(client.lab_name(), String::from_str(&env, "Kitewell"));
    }

    #[test]
    fn register_and_count() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(Kitewell, ());
        let client = KitewellClient::new(&env, &id);
        let a = Address::generate(&env);

        assert_eq!(client.builder_count(), 0);
        client.register(&a, &String::from_str(&env, "cem"));
        assert_eq!(client.builder_count(), 1);
        assert_eq!(
            client.get_builder(&a),
            Some(String::from_str(&env, "cem"))
        );
    }

    #[test]
    fn register_rejects_empty_name() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(Kitewell, ());
        let client = KitewellClient::new(&env, &id);
        let a = Address::generate(&env);

        assert_eq!(
            client.try_register(&a, &String::from_str(&env, "")),
            Err(Ok(Error::EmptyName))
        );

        // The rejected check-in wrote nothing: no nickname and no count bump.
        assert_eq!(client.get_builder(&a), None);
        assert_eq!(client.builder_count(), 0);
    }

    #[test]
    fn register_rejects_empty_name_while_paused() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(Kitewell, ());
        let client = KitewellClient::new(&env, &id);
        let admin = Address::generate(&env);
        let a = Address::generate(&env);

        client.init(&admin);
        client.set_paused(&admin, &true);

        // Empty name is payload validation, so pause does not change the error.
        assert_eq!(
            client.try_register(&a, &String::from_str(&env, "")),
            Err(Ok(Error::EmptyName))
        );
        assert_eq!(client.get_builder(&a), None);
        assert_eq!(client.builder_count(), 0);
    }

    #[test]
    fn get_builder_never_registered_is_none() {
        let env = Env::default();
        let id = env.register(Kitewell, ());
        let client = KitewellClient::new(&env, &id);
        let stranger = Address::generate(&env);

        // Lookup is a pure read: no auth and nothing written for an unknown addr.
        assert_eq!(client.get_builder(&stranger), None);
    }

    #[test]
    fn register_twice_keeps_count_and_latest_name() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(Kitewell, ());
        let client = KitewellClient::new(&env, &id);
        let a = Address::generate(&env);

        client.register(&a, &String::from_str(&env, "cem"));
        assert_eq!(client.builder_count(), 1);

        // Re-registering is idempotent for the count and overwrites the nickname.
        client.register(&a, &String::from_str(&env, "cem-late"));
        assert_eq!(client.builder_count(), 1);
        assert_eq!(
            client.get_builder(&a),
            Some(String::from_str(&env, "cem-late"))
        );
    }

    #[test]
    fn init_sets_admin() {
        let env = Env::default();
        let id = env.register(Kitewell, ());
        let client = KitewellClient::new(&env, &id);
        let admin = Address::generate(&env);

        assert!(client.try_init(&admin).is_ok());
    }

    #[test]
    fn init_fails_if_already_set() {
        let env = Env::default();
        let id = env.register(Kitewell, ());
        let client = KitewellClient::new(&env, &id);
        let admin = Address::generate(&env);

        client.init(&admin);
        assert_eq!(client.try_init(&admin), Err(Ok(Error::AlreadyInit)));
    }

    #[test]
    fn set_paused_works_as_admin() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(Kitewell, ());
        let client = KitewellClient::new(&env, &id);
        let admin = Address::generate(&env);

        client.init(&admin);
        assert!(client.try_set_paused(&admin, &true).is_ok());
    }

    #[test]
    fn set_paused_rejects_non_admin() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(Kitewell, ());
        let client = KitewellClient::new(&env, &id);
        let admin = Address::generate(&env);
        let other = Address::generate(&env);

        client.init(&admin);
        assert_eq!(
            client.try_set_paused(&other, &true),
            Err(Ok(Error::NotAdmin))
        );
    }

    #[test]
    fn set_paused_rejects_before_init() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(Kitewell, ());
        let client = KitewellClient::new(&env, &id);
        let admin = Address::generate(&env);

        assert_eq!(
            client.try_set_paused(&admin, &true),
            Err(Ok(Error::NotAdmin))
        );
    }

    #[test]
    fn register_rejects_when_paused() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(Kitewell, ());
        let client = KitewellClient::new(&env, &id);
        let admin = Address::generate(&env);
        let a = Address::generate(&env);

        client.init(&admin);
        client.set_paused(&admin, &true);

        assert_eq!(
            client.try_register(&a, &String::from_str(&env, "blocked")),
            Err(Ok(Error::Paused))
        );
        assert_eq!(client.builder_count(), 0);
    }

    #[test]
    fn register_resumes_after_unpause() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(Kitewell, ());
        let client = KitewellClient::new(&env, &id);
        let admin = Address::generate(&env);
        let a = Address::generate(&env);

        client.init(&admin);
        client.set_paused(&admin, &true);
        client.set_paused(&admin, &false);

        client.register(&a, &String::from_str(&env, "cem"));
        assert_eq!(client.builder_count(), 1);
    }

    #[test]
    fn get_builder_unregistered_address_is_none() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(Kitewell, ());
        let client = KitewellClient::new(&env, &id);
        let known = Address::generate(&env);
        let stranger = Address::generate(&env);

        // Populate the registry so the miss is not just an empty contract.
        client.register(&known, &String::from_str(&env, "cem"));
        assert_eq!(
            client.get_builder(&known),
            Some(String::from_str(&env, "cem"))
        );

        // A never-registered address has no entry even alongside real ones.
        assert_eq!(client.get_builder(&stranger), None);
        assert_eq!(client.builder_count(), 1);
    }
}
