use soroban_sdk::{testutils::Address as _, Address, Env, String};
use string_allowlist::{
    AllowlistError, StringAllowlistContract, StringAllowlistContractClient,
};

#[test]
fn test_length_boundaries_and_rejections() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(StringAllowlistContract, ());
    let client = StringAllowlistContractClient::new(&env, &contract_id);

    client.initialize(&admin);

    // Empty string rejected
    let empty = String::from_str(&env, "");
    assert_eq!(
        client.try_add(&empty),
        Err(Ok(AllowlistError::StringEmpty))
    );

    // Single character allowed
    let single = String::from_str(&env, "a");
    assert!(client.try_add(&single).is_ok());

    // 64-character boundary allowed
    let str_64 = String::from_str(
        &env,
        "1234567890123456789012345678901234567890123456789012345678901234",
    );
    assert_eq!(str_64.len(), 64);
    assert!(client.try_add(&str_64).is_ok());

    // 65-character rejected
    let str_65 = String::from_str(
        &env,
        "12345678901234567890123456789012345678901234567890123456789012345",
    );
    assert_eq!(str_65.len(), 65);
    assert_eq!(
        client.try_add(&str_65),
        Err(Ok(AllowlistError::StringTooLong))
    );
}
