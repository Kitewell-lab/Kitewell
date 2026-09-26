#![no_std]
use soroban_sdk::{contract, contractimpl, contracterror, symbol_short, Address, Env, String, Symbol};

const LAB: Symbol = symbol_short!("KITEWELL");
const COUNT: Symbol = symbol_short!("COUNT");
const ADMIN: Symbol = symbol_short!("ADMIN");
const PAUSED: Symbol = symbol_short!("PAUSED");

#[contracterror]
pub enum Error {
    AlreadyInit = 1,
    NotAdmin = 2,
    Paused = 3,
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
    /// Rejects when paused.
    pub fn register(env: Env, caller: Address, name: String) -> Result<(), Error> {
        let paused: bool = env.storage().instance().get(&PAUSED).unwrap_or(false);
        if paused {
            return Err(Error::Paused);
        }
        caller.require_auth();

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
        let err = client.try_init(&admin).unwrap();
        assert_eq!(err, Err(Error::AlreadyInit));
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
        let err = client.try_set_paused(&other, &true).unwrap();
        assert_eq!(err, Err(Error::NotAdmin));
    }

    #[test]
    fn set_paused_rejects_before_init() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(Kitewell, ());
        let client = KitewellClient::new(&env, &id);
        let admin = Address::generate(&env);

        let err = client.try_set_paused(&admin, &true).unwrap();
        assert_eq!(err, Err(Error::NotAdmin));
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
    fn register_rejects_when_paused() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(Kitewell, ());
        let client = KitewellClient::new(&env, &id);
        let admin = Address::generate(&env);
        let a = Address::generate(&env);

        client.init(&admin);
        client.set_paused(&admin, &true);

        let err = client.try_register(&a, &String::from_str(&env, "blocked")).unwrap();
        assert_eq!(err, Err(Error::Paused));
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
}
