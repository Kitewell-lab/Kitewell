/**
 * Truncate a Stellar address (or any identifier) for display as
 * `GGGGGG…WWWWWW`.
 *
 * Falsy input is returned as-is (so `null`/`undefined`/`""` never render as
 * "undefined…"), and values that already fit within the kept characters are
 * returned untouched. `leading`/`trailing` default to the 6+6 split the
 * dashboard previously hard-coded in App.jsx.
 *
 * @param {string|null|undefined} address
 * @param {number} leading characters kept from the start
 * @param {number} trailing characters kept from the end
 * @returns {string|null|undefined}
 */
export function shortenAddress(address, leading = 6, trailing = 6) {
  if (!address) return address;

  const value = String(address);
  if (value.length < leading + trailing) return value;

  return `${value.slice(0, leading)}…${value.slice(-trailing)}`;
}
