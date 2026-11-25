# Order book for a pair

`orderBook.js` reads and shapes a Horizon order book so the offer form can be
priced without placing an offer.

- The pair is checked first: `assertTradablePair(selling, buying)` refuses the
  same asset on both sides and returns the normalized `SELLING/BUYING` keys.
- `orderBookView(book)` keeps the best ten bids and ten asks. An empty book is
  `{ bids: [], asks: [], isEmpty: true }`, an empty state rather than an error.
- `offerPriceFromRow(row)` returns the price of a chosen row.
- `offerPriceFractionFromRow(row)` returns the numerator and denominator for the
  offer form, taken from Horizon's exact `price_r`, so the offer keeps the book's
  price instead of a rounded decimal.
- `orderBookFailureMessage(error)` is the message shown when a load fails. The
  offer form is kept so the user can retry.

`getOrderBook(selling, buying)` in `stellar.js` performs the Horizon read with
the same ten-level limit and returns the shaped view.

```js
import {
  assertTradablePair,
  offerPriceFractionFromRow,
  orderBookView,
} from "./orderBook";

assertTradablePair(selling, buying);
const book = await getOrderBook(buildAsset(selling), buildAsset(buying));
if (!book.isEmpty) fillOfferPrice(offerPriceFractionFromRow(book.asks[0]));
```

The Order tab loads the book for the offer pair, shows up to ten bids and ten
asks with price and amount, and fills the offer's price numerator and
denominator when a row is chosen. Choosing a row never places an offer.
