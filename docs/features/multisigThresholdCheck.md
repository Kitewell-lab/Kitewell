# multisigThresholdCheck

`multisigThresholdCheck` is a lightweight backend arithmetic validator that determines whether a given subset of signer weights sums to at least the required multisig threshold in Stellar (0-255).

## Capabilities

- Performs exact integer arithmetic across signer weights.
- Supports raw weight numbers, numeric strings, and signer objects containing `{ weight }`.
- Strictly enforces Stellar weight limits (each weight and threshold in range `[0, 255]`).
- Computes `surplus` (excess weight beyond threshold) and `deficit` (shortfall needed).
- Provides non-throwing utility `tryCheckMultisigThreshold` with customizable fallback.

## Public API

### `checkMultisigThreshold(weights, threshold)`

Evaluates whether signer weights meet or exceed the threshold.

- **Parameters**:
  - `weights` (`Array<number|string|{weight: number|string}>`): Array of signer weights or signer objects.
  - `threshold` (`number|string`): Required threshold integer (0-255).
- **Returns**: Object `{ satisfied: boolean, totalWeight: number, threshold: number, deficit: number, surplus: number }`
- **Throws**: `InvalidThresholdCheckError` on invalid inputs or out-of-range values.

### `isThresholdSatisfied(weights, threshold)`

Convenience function returning boolean (`true` if total weight >= threshold).

### `tryCheckMultisigThreshold(weights, threshold, fallback = false)`

Safe wrapper returning `fallback` instead of throwing on invalid inputs.

### `MIN_STELLAR_WEIGHT` & `MAX_STELLAR_WEIGHT`

Exported constants (`0` and `255`).

### `InvalidThresholdCheckError`

Custom Error class thrown when parameters fail validation.
