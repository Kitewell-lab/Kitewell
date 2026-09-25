import test from "node:test";
import assert from "node:assert/strict";
import { mapBalance, mapBalances } from "./mapBalances.js";

test("mapBalance: correctly maps native XLM balance", () => {
  const rawNative = {
    asset_type: "native",
    balance: "100.5000000",
    buying_liabilities: "0.0000000",
    selling_liabilities: "0.0000000",
  };

  const mapped = mapBalance(rawNative);
  assert.deepEqual(mapped, {
    key: "native",
    code: "XLM",
    issuer: null,
    balance: "100.5000000",
    limit: null,
    isNative: true,
  });
});

test("mapBalance: correctly maps credit_alphanum4 asset balance", () => {
  const rawCredit4 = {
    asset_type: "credit_alphanum4",
    asset_code: "USDC",
    asset_issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    balance: "50.0000000",
    limit: "10000.0000000",
    buying_liabilities: "0.0000000",
    selling_liabilities: "0.0000000",
  };

  const mapped = mapBalance(rawCredit4);
  assert.deepEqual(mapped, {
    key: "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    code: "USDC",
    issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    balance: "50.0000000",
    limit: "10000.0000000",
    isNative: false,
  });
});

test("mapBalance: correctly maps credit_alphanum12 asset balance", () => {
  const rawCredit12 = {
    asset_type: "credit_alphanum12",
    asset_code: "STELLAREUR",
    asset_issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    balance: "12.3400000",
    limit: "5000.0000000",
  };

  const mapped = mapBalance(rawCredit12);
  assert.deepEqual(mapped, {
    key: "STELLAREUR:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    code: "STELLAREUR",
    issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    balance: "12.3400000",
    limit: "5000.0000000",
    isNative: false,
  });
});

test("mapBalances: maps mixed native and credit fixtures preserving order", () => {
  const fixtures = [
    {
      asset_type: "native",
      balance: "99.0000000",
    },
    {
      asset_type: "credit_alphanum4",
      asset_code: "TEST",
      asset_issuer: "GABC123",
      balance: "10.0000000",
      limit: "100.0000000",
    },
  ];

  const results = mapBalances(fixtures);
  assert.equal(results.length, 2);
  assert.equal(results[0].key, "native");
  assert.equal(results[0].isNative, true);
  assert.equal(results[1].key, "TEST:GABC123");
  assert.equal(results[1].isNative, false);
});

test("mapBalances: handles empty or invalid inputs gracefully", () => {
  assert.deepEqual(mapBalances([]), []);
  assert.deepEqual(mapBalances(null), []);
  assert.deepEqual(mapBalances(undefined), []);
  assert.deepEqual(mapBalances("non-array string"), []);
  assert.deepEqual(mapBalances([null, undefined, 42]), []);
});
