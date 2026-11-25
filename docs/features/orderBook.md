# Order book for a pair

`orderBook.js` reads and shapes a Horizon order book so the offer form can be
priced without placing an offer.

- The pair is checked first: `assertTradablePair(selling, buying)` refuses the
  same asset on both sides and returns the normalized `SELLING/BUYING` keys.
- `orderBookView(book)` keeps the best ten bids and ten asks. An empty book is
  `{ bids: [], asks: [], isEmpty: true }`, an empty state rather than an error.
- `offerPriceFromRow(row)` returns the price of a chosen row for the price
  input. It never submits an offer.
- `orderBookFailureMessage(error)` is the message shown when a load fails. The
  offer form is kept so the user can retry.

`getOrderBook(selling, buying)` in `stellar.js` performs the Horizon read with
the same ten-level limit.

```js
import { assertTradablePair, offerPriceFromRow, orderBookView } from "./orderBook";

assertTradablePair(selling, buying);
const book = orderBookView(await getOrderBook(selling, buying));
if (!book.isEmpty) setPrice(offerPriceFromRow(book.asks[0]));
```
