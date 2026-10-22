# Horizon paging cursor builder

`backend/src/pagingCursorBuilder.js` extracts cursor information from Horizon collection response records and builds next-page request parameters (`cursor`, `order`, `limit`, `hasMore`).

## What it does

- Extracts `paging_token`, `pagingToken`, or `cursor` property from the trailing record in a collections result set.
- Validates the requested page limit within the permitted Horizon range `[1, 200]`.
- Enforces valid ordering (`asc` or `desc`).
- Signals `hasMore: true` when record count matches or exceeds the page limit.
- Gracefully handles empty results with configurable fallback cursor.

## Public API

### `buildPagingParams(records, options)`

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `records` | `Array<object>` | — | Array of Horizon collection records |
| `options.limit` | `number` | `10` | Number of items requested per page (between 1 and 200) |
| `options.order` | `string` | `"asc"` | Ordering: `"asc"` or `"desc"` |
| `options.fallbackCursor` | `string \| null` | `null` | Cursor value to return when `records` is empty |

### Return Value

```js
{
  cursor: string | null,
  order: "asc" | "desc",
  limit: number,
  hasMore: boolean
}
```

### Examples

```js
import { buildPagingParams } from "./pagingCursorBuilder.js";

const records = [
  { id: "1", paging_token: "100" },
  { id: "2", paging_token: "200" },
];

const params = buildPagingParams(records, { limit: 10, order: "asc" });
// => { cursor: "200", order: "asc", limit: 10, hasMore: false }
```
