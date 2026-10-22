# Operation type label and icon resolver

`frontend/src/operationTypeLabel.js` maps raw Horizon operation `type` strings (e.g. `payment`, `create_account`, `path_payment_strict_send`) into `{ label, iconId }` objects for clean user interface list rendering, providing safe Title Case fallbacks for unknown or future operation types.

## Exported API

### `resolveOperationTypeLabel(rawType, options)`

Resolves the operation type into a structured display object:

```js
import { resolveOperationTypeLabel } from "./operationTypeLabel";

// Known type:
resolveOperationTypeLabel("payment");
// { label: "Payment", iconId: "arrow-right", isKnown: true }

// Path payment:
resolveOperationTypeLabel("path_payment_strict_receive");
// { label: "Path Payment (Strict Receive)", iconId: "git-merge", isKnown: true }

// Unknown type fallback:
resolveOperationTypeLabel("custom_future_op");
// { label: "Custom Future Op", iconId: "help-circle", isKnown: false }

// Nullish / empty safe fallback:
resolveOperationTypeLabel(null);
// { label: "Unknown Operation", iconId: "help-circle", isKnown: false }
```

### `getOperationTypeLabel(rawType, options)`

Convenience helper returning just the label string (e.g. `"Payment"`).

### `getOperationTypeIcon(rawType, options)`

Convenience helper returning just the icon identifier string (e.g. `"arrow-right"`).

### `isKnownOperationType(rawType)`

Returns a boolean indicating whether the operation type is recognized in the predefined map.

### Options

- `fallbackLabel` (string, default: `'Unknown Operation'`): Fallback label for null/empty values.
- `fallbackIcon` (string, default: `'help-circle'`): Fallback icon identifier.
- `autoTitleCase` (boolean, default: `true`): Whether unknown string types are converted into Title Case.
