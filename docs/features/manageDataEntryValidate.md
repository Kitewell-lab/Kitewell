# Stellar manageData entry validator

`backend/src/manageDataEntryValidate.js` exports functions and constants to validate a Stellar `manageData` operation's `name` and `value` entries against protocol limits:

- **Name limits**: Non-empty UTF-8 string with a maximum of 64 bytes.
- **Value limits**: Up to 64 bytes (Buffer, Uint8Array, or base64/UTF-8 string), or `null`/`undefined` to represent data entry deletion.

## Exported API

### `checkManageDataEntry(entry, options)`

Inspects a manageData entry object `{ name, value }` and returns a typed result object without throwing:

```js
import { checkManageDataEntry } from "../../backend/src/manageDataEntryValidate.js";

const result = checkManageDataEntry({ name: "app_config", value: "stellar" });
// { ok: true, name: "app_config", nameByteLength: 10, hasValue: true, isDelete: false, valueByteLength: 7 }

const deleteResult = checkManageDataEntry({ name: "old_key", value: null });
// { ok: true, name: "old_key", nameByteLength: 7, hasValue: false, isDelete: true, valueByteLength: 0 }

const errorResult = checkManageDataEntry({ name: "", value: "x" });
// { ok: false, code: "EMPTY_NAME", error: "manageData name cannot be an empty string", details: { ... } }
```

### `validateManageDataEntry(entry, options)`

Alias / wrapper around `checkManageDataEntry` with support for `{ throwOnError: true }`.

### `isValidManageDataEntry(entry, options)`

Returns a boolean indicating whether the entry satisfies all Stellar protocol constraints.

### `assertManageDataEntry(entry, options)`

Throws an `InvalidManageDataEntryError` if the entry is invalid.

### Constants

- `MAX_MANAGE_DATA_KEY_BYTES`: `64`
- `MAX_MANAGE_DATA_VALUE_BYTES`: `64`
