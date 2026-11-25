# Claimable balance clawback

`clawbackClaimableBalance.js` decides which claimable balances the connected
account may claw back and builds the operation.

- Only balances the connected account created (`source_account`) are listed.
- Clawback is offered only when the connected account is the asset issuer and
  the issuer has `auth_clawback_enabled`. Otherwise the action is hidden.
- Native XLM and balances that were already claimed are never offered.
- `clawbackClaimableBalanceOperation(id)` accepts a Horizon id (72 hex
  characters with the `00000000` type prefix) or a bare 64-hex hash and builds
  one `clawbackClaimableBalance` operation.
- `withoutClaimedBalance(records, id)` drops a balance from the unclaimed list
  after a clawback, so a refresh does not show it again.

`getIssuerClawbackEnabled(issuer)` in `stellar.js` reads the issuer's account
flags, and `clawbackClaimableBalanceWithFreighter(publicKey, balanceId)` in
`freighter.js` signs and submits the transaction.

```js
import {
  clawbackCandidates,
  clawbackClaimableBalanceOperation,
} from "./clawbackClaimableBalance";

const candidates = clawbackCandidates({ records, account, assetFlagsByAsset });
const operation = clawbackClaimableBalanceOperation(candidates[0].id);
```

A Horizon failure (`op_already_claimed`) is surfaced as-is and the balance
stays out of the unclaimed list on the next refresh.
