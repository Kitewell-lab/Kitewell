# Sponsorship base reserve fee estimator

`backend/src/sponsorshipFeeEstimate.js` calculates the required base reserve in XLM for sponsored Stellar ledger entries (trustlines, signers, data entries, offers, and new accounts).

Calculations are performed via documented Stellar base reserve constants using BigInt integer arithmetic to prevent floating-point errors.

## Stellar Protocol Sizing Constants

- Standard base reserve: `0.5 XLM` (`5,000,000 stroops`) per ledger entry.
- Sponsored accounts require `2 base reserves` (`1.0 XLM`).
- `1 XLM` = `10,000,000 stroops`.

## Exported API

### `estimateSponsorshipReserve(input, options)`

Computes the required reserve in XLM. Accepts either an integer entry count or a breakdown object:

```js
import { estimateSponsorshipReserve } from "../../backend/src/sponsorshipFeeEstimate.js";

// Single entry count:
estimateSponsorshipReserve(1);
// "0.5"

estimateSponsorshipReserve(4);
// "2.0"

// Breakdown object:
estimateSponsorshipReserve({
  trustlines: 1,
  signers: 1,
  dataEntries: 2,
  accounts: 1, // accounts count as 2 base reserves
});
// "3.0"
```

### `checkSponsorshipReserve(input, options)`

Non-throwing inspector returning `{ ok: true, totalEntries, reserveXlm, reserveStroops, breakdown }` or `{ ok: false, error, code, details }`.

### `isValidSponsorshipReserveInput(input, options)`

Returns a boolean indicating whether inputs are valid.

### Options

- `baseReserveXlm` (number, default: `0.5`): Custom base reserve in XLM for testnets or custom network configurations.
