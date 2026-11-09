import {
  KNOWN_STELLAR_TOML_FIELDS,
  MAX_STELLAR_TOML_BYTES,
  STELLAR_TOML_PARSE_ERROR,
} from "./stellarTomlFieldsParseConstants.js";

const KNOWN_FIELD_SET = new Set(KNOWN_STELLAR_TOML_FIELDS);

/**
 * Parse a `stellar.toml` file's raw text content and extract known top-level
 * fields (`NETWORK_PASSPHRASE`, `FEDERATION_SERVER`, `AUTH_SERVER`,
 * `SIGNING_KEY`, `HORIZON_URL`) into a plain object, ignoring unknown keys
 * and keys declared inside `[table]` or `[[array_of_tables]]` sections.
 *
 * No network fetch is performed.
 *
 * @param {string} rawToml Raw text content of a `stellar.toml` file.
 * @returns { Partial<Record<
 *   "NETWORK_PASSPHRASE" | "FEDERATION_SERVER" | "AUTH_SERVER" | "SIGNING_KEY" | "HORIZON_URL",
 *   string
 * >> } Plain object containing the extracted known top-level fields.
 * @throws {TypeError} When `rawToml` is not a string.
 * @throws {RangeError} When `rawToml` exceeds `MAX_STELLAR_TOML_BYTES` (102,400 UTF-8 bytes).
 * @throws {Error} When a top-level line or section header is malformed, a
 *   top-level key is duplicated, or a known field's value is not a quoted string.
 *
 * @example
 * parseStellarTomlFields(`
 *   NETWORK_PASSPHRASE = "Test SDF Network ; September 2015"
 *   HORIZON_URL = "https://horizon-testnet.stellar.org"
 *   VERSION = "2.5.0"
 * `);
 * // => {
 * //   NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
 * //   HORIZON_URL: "https://horizon-testnet.stellar.org",
 * // }
 */
export function parseStellarTomlFields(rawToml) {
  if (typeof rawToml !== "string") {
    throw new TypeError(STELLAR_TOML_PARSE_ERROR.TYPE);
  }

  if (Buffer.byteLength(rawToml, "utf8") > MAX_STELLAR_TOML_BYTES) {
    throw new RangeError(STELLAR_TOML_PARSE_ERROR.TOO_LARGE);
  }

  /** @type {Record<string, string>} */
  const extracted = {};
  /** @type {Set<string>} */
  const seenTopLevelKeys = new Set();

  const lines = rawToml.split(/\r?\n/);
  let inTopLevel = true;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    if (trimmed.startsWith("[")) {
      const headerWithoutComment = stripUnquotedComment(trimmed).trim();
      if (!isValidSectionHeader(headerWithoutComment)) {
        throw new Error(STELLAR_TOML_PARSE_ERROR.SYNTAX);
      }
      inTopLevel = false;
      continue;
    }

    if (!inTopLevel) {
      continue;
    }

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) {
      throw new Error(STELLAR_TOML_PARSE_ERROR.SYNTAX);
    }

    const key = trimmed.slice(0, eqIndex).trim();
    const rawValuePart = trimmed.slice(eqIndex + 1).trim();

    if (!/^[A-Za-z0-9_-]+$/.test(key) || rawValuePart === "") {
      throw new Error(STELLAR_TOML_PARSE_ERROR.SYNTAX);
    }

    if (seenTopLevelKeys.has(key)) {
      throw new Error(`${STELLAR_TOML_PARSE_ERROR.DUPLICATE_KEY}: ${key}`);
    }
    seenTopLevelKeys.add(key);

    if (!KNOWN_FIELD_SET.has(key)) {
      continue;
    }

    extracted[key] = parseQuotedStringValue(rawValuePart);
  }

  return extracted;
}

/**
 * Non-throwing companion to {@link parseStellarTomlFields}.
 *
 * @param {unknown} rawToml Candidate `stellar.toml` content.
 * @returns {{ ok: true, fields: Record<string, string> } | { ok: false, error: string }}
 */
export function tryParseStellarTomlFields(rawToml) {
  try {
    const fields = parseStellarTomlFields(rawToml);
    return { ok: true, fields };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Validate a TOML `[table]` or `[[array_of_tables]]` header line.
 *
 * @param {string} header
 * @returns {boolean}
 */
function isValidSectionHeader(header) {
  if (header.startsWith("[[")) {
    if (!header.endsWith("]]") || header.length < 5) return false;
    const inner = header.slice(2, -2).trim();
    return /^[A-Za-z0-9_.-]+$/.test(inner);
  }

  if (header.startsWith("[")) {
    if (!header.endsWith("]") || header.length < 3) return false;
    const inner = header.slice(1, -1).trim();
    return /^[A-Za-z0-9_.-]+$/.test(inner);
  }

  return false;
}

/**
 * Strip a trailing `# ...` comment that appears outside of quotes.
 *
 * @param {string} text
 * @returns {string}
 */
function stripUnquotedComment(text) {
  let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote === '"') {
      if (ch === "\\") {
        i += 1;
        continue;
      }
      if (ch === '"') quote = null;
    } else if (quote === "'") {
      if (ch === "'") quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "#") {
      return text.slice(0, i);
    }
  }
  return text;
}

/**
 * Parse a single-line TOML double-quoted (`"..."`) or single-quoted (`'...'`)
 * string value, allowing an optional trailing `# comment`.
 *
 * @param {string} rawValuePart
 * @returns {string}
 */
function parseQuotedStringValue(rawValuePart) {
  const quoteChar = rawValuePart[0];
  if (quoteChar !== '"' && quoteChar !== "'") {
    throw new Error(STELLAR_TOML_PARSE_ERROR.INVALID_VALUE);
  }

  if (quoteChar === "'") {
    const closeIdx = rawValuePart.indexOf("'", 1);
    if (closeIdx === -1) {
      throw new Error(STELLAR_TOML_PARSE_ERROR.INVALID_VALUE);
    }
    const trailing = rawValuePart.slice(closeIdx + 1).trim();
    if (trailing !== "" && !trailing.startsWith("#")) {
      throw new Error(STELLAR_TOML_PARSE_ERROR.INVALID_VALUE);
    }
    return rawValuePart.slice(1, closeIdx);
  }

  let out = "";
  let closed = false;
  let closeIdx = -1;

  for (let i = 1; i < rawValuePart.length; i += 1) {
    const ch = rawValuePart[i];
    if (ch === "\\") {
      if (i + 1 >= rawValuePart.length) {
        throw new Error(STELLAR_TOML_PARSE_ERROR.INVALID_VALUE);
      }
      const next = rawValuePart[i + 1];
      if (next === '"' || next === "\\") {
        out += next;
      } else if (next === "n") {
        out += "\n";
      } else if (next === "t") {
        out += "\t";
      } else if (next === "r") {
        out += "\r";
      } else {
        throw new Error(STELLAR_TOML_PARSE_ERROR.INVALID_VALUE);
      }
      i += 1;
      continue;
    }

    if (ch === '"') {
      closed = true;
      closeIdx = i;
      break;
    }

    out += ch;
  }

  if (!closed) {
    throw new Error(STELLAR_TOML_PARSE_ERROR.INVALID_VALUE);
  }

  const trailing = rawValuePart.slice(closeIdx + 1).trim();
  if (trailing !== "" && !trailing.startsWith("#")) {
    throw new Error(STELLAR_TOML_PARSE_ERROR.INVALID_VALUE);
  }

  return out;
}
