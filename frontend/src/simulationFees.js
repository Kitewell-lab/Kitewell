import * as StellarSdk from "@stellar/stellar-sdk";

/**
 * Soroban simulation fee helpers.
 *
 * A simulation reports a resource fee (CPU, memory, ledger I/O) while the
 * inclusion fee is the classic per-operation fee. Showing one number hides
 * which part the user is about to sign, so the panel shows both in stroops and
 * marks a missing field as unavailable rather than as zero.
 *
 * @module simulationFees
 */

/**
 * Normalize a fee value to a stroop string.
 *
 * @param {unknown} value Fee from the simulation or transaction.
 * @returns {string|null} Non-negative integer string, or `null` when missing
 *   or malformed.
 */
function stroops(value) {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  return /^\d+$/.test(text) ? text : null;
}

/**
 * Split a simulation result into its two fees.
 *
 * @param {object|null} simulation Soroban RPC simulateTransaction response.
 * @param {unknown} [inclusionFee] The fee of the simulated transaction (the
 *   classic inclusion fee), used when the response does not carry one.
 * @returns {{
 *   error: string|null,
 *   inclusionFee: string|null,
 *   resourceFee: string|null,
 *   totalFee: string|null,
 * }} Fees in stroops; `null` means the field was not reported.
 */
export function parseSimulationFees(simulation, inclusionFee = null) {
  if (!simulation || typeof simulation !== "object") {
    return { error: null, inclusionFee: null, resourceFee: null, totalFee: null };
  }

  if (simulation.error) {
    // A failed simulation reports no fee at all; do not show 0.
    return {
      error: String(simulation.error),
      inclusionFee: null,
      resourceFee: null,
      totalFee: null,
    };
  }

  const resourceFee = stroops(simulation.minResourceFee);
  const inclusion = stroops(
    simulation.inclusionFee ?? simulation.inclusion_fee ?? inclusionFee
  );

  const totalFee =
    resourceFee !== null && inclusion !== null
      ? (BigInt(resourceFee) + BigInt(inclusion)).toString()
      : null;

  return { error: null, inclusionFee: inclusion, resourceFee, totalFee };
}

/**
 * Extract address credentials from the authorization entries returned by
 * Soroban simulation. Source-account credentials need no extra address entry.
 *
 * @param {unknown} entries Simulation result authorization entries.
 * @returns {string[]} Authorized addresses.
 */
export function parseSimulationAuthorizationAddresses(entries) {
  if (!Array.isArray(entries)) return [];

  return entries.flatMap((entry) => {
    const credentials = entry?.credentials?.();
    const credentialType = credentials?.switch?.().name;
    let addressCredentials;

    switch (credentialType) {
      case "sorobanCredentialsAddress":
        addressCredentials = credentials.address();
        break;
      case "sorobanCredentialsAddressV2":
        addressCredentials = credentials.addressV2();
        break;
      case "sorobanCredentialsAddressWithDelegates":
        addressCredentials =
          credentials.addressWithDelegates().addressCredentials();
        break;
      case "sorobanCredentialsSourceAccount":
        return [];
      default:
        throw new TypeError("Simulation returned an invalid authorization entry.");
    }

    const address = addressCredentials.address();
    if (!address) {
      throw new TypeError("Simulation authorization entry has no address.");
    }

    return [
      StellarSdk.scValToNative(StellarSdk.xdr.ScVal.scvAddress(address)),
    ];
  });
}

/**
 * Whether the current form has a successful simulation for its exact inputs.
 *
 * @param {object|null} simulation Simulation state.
 * @param {string|null} simulationKey Inputs used for the simulation.
 * @param {string} currentKey Current form inputs.
 * @returns {boolean}
 */
export function isSimulationReady(simulation, simulationKey, currentKey) {
  return Boolean(
    simulation &&
      !simulation.error &&
      simulationKey &&
      simulationKey === currentKey
  );
}

/**
 * Render one fee field for the panel.
 *
 * @param {string|null|undefined} value Fee in stroops.
 * @returns {string} The stroop count or `"unavailable"`.
 */
export function formatSimulationFee(value) {
  return value === null || value === undefined ? "unavailable" : String(value);
}
