#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, symbol_short, Address, Env, String, Symbol,
};

const LAB: Symbol = symbol_short!("KITEWELL");
const COUNT: Symbol = symbol_short!("COUNT");

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
}

#[contract]
pub struct Kitewell;

#[contractimpl]
impl Kitewell {
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
}
