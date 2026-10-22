import { describe, it, expect } from 'vitest';
import { validatePathPaymentHops, HOP_ERROR_CODES } from './pathPaymentHopValidate.js';

describe('pathPaymentHopValidate - invalid asset descriptor', () => {
  it('rejects asset string without colon separator', () => {
    const result = validatePathPaymentHops(['INVALIDASSET']);
    expect(result.valid).toBe(false);
    expect(result.code).toBe(HOP_ERROR_CODES.INVALID_ASSET_DESCRIPTOR);
  });

  it('rejects invalid issuer public key', () => {
    const result = validatePathPaymentHops(['USDC:invalid_issuer']);
    expect(result.valid).toBe(false);
    expect(result.code).toBe(HOP_ERROR_CODES.INVALID_ASSET_DESCRIPTOR);
  });

  it('rejects asset code longer than 12 characters', () => {
    const issuer = 'GA5WBPYA5WKBC3HCMAFZ9MA4T5FDJSOHPXWDWQUXQW7H7QNOUV27G5TU';
    const result = validatePathPaymentHops([`TOOLONGASSETCODE123:${issuer}`]);
    expect(result.valid).toBe(false);
    expect(result.code).toBe(HOP_ERROR_CODES.INVALID_ASSET_DESCRIPTOR);
  });
});
