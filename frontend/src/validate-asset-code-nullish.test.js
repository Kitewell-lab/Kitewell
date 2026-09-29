import { validateAssetCode } from '@/utils/validate-asset-code';
import { expect } from 'chai';

describe('validateAssetCode with nullish inputs', () => {
  it('throws for null input', () => {
    expect(() => validateAssetCode(null)).to.throw('Asset code is required.');
  });

  it('throws for undefined input', () => {
    expect(() => validateAssetCode(undefined)).to.throw('Asset code is required.');
  });
});