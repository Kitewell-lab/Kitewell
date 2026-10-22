# operationTypeLabel

`operationTypeLabel` is a frontend presentation module that maps raw Horizon operation type strings into user-friendly display labels and icon IDs for operation list and transaction detail components.

## Capabilities

- Comprehensive registry covering Stellar payment, trustline, offer, claimable balance, sponsorship, and Soroban contract operations.
- Accepts raw type strings (e.g. `'payment'`, `'create_account'`) or operation objects containing `{ type }`.
- Tolerates case differences and whitespace without throwing.
- Fallback safely to `{ label: 'Unknown Operation', iconId: 'help-circle' }` on unknown operations.
- Provides helper functions (`getOperationLabel`, `getOperationIconId`, `isKnownOperationType`).

## Public API

### `resolveOperationTypeLabel(typeOrOp, options)`

Resolves the `{ label, iconId }` descriptor.

- **Parameters**:
  - `typeOrOp` (`string|Object`): Operation type string or object with `.type`.
  - `options` (`Object`, optional):
    - `fallback` (`Object`, default: `DEFAULT_UNKNOWN_OPERATION`): Custom fallback object.
- **Returns**: `{ label: string, iconId: string }`

### `getOperationLabel(typeOrOp, options)`

Returns only the label string.

### `getOperationIconId(typeOrOp, options)`

Returns only the iconId string.

### `isKnownOperationType(type)`

Returns `true` if recognized, `false` otherwise.

### `OPERATION_TYPE_REGISTRY` & `DEFAULT_UNKNOWN_OPERATION`

Exported metadata objects.
