import { describe, it, expect } from 'vitest';
import { parseSep7Uri } from './sep7UriParse.js';

describe('sep7UriParse - pay operation', () => {
  it('parses standard SEP-7 pay operation with destination, amount, and memo', () => {
    const uri = 'web+stellar:pay?destination=GA5WBPYA5WKBC3HCMAFZ9MA4T5FDJSOHPXWDWQUXQW7H7QNOUV27G5TU&amount=120.5&memo=Order123&memo_type=MEMO_TEXT';

    const result = parseSep7Uri(uri);

    expect(result.operation).toBe('pay');
    expect(result.params).toEqual({
      destination: 'GA5WBPYA5WKBC3HCMAFZ9MA4T5FDJSOHPXWDWQUXQW7H7QNOUV27G5TU',
      amount: '120.5',
      memo: 'Order123',
      memo_type: 'MEMO_TEXT'
    });
    expect(result.rawUri).toBe(uri);
  });
});
