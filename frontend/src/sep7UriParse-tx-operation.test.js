import { describe, it, expect } from 'vitest';
import { parseSep7Uri } from './sep7UriParse.js';

describe('sep7UriParse - tx operation', () => {
  it('parses standard SEP-7 tx operation with xdr and callback', () => {
    const uri = 'web+stellar:tx?xdr=AAAAAGX...&callback=url%3Ahttps%3A%2F%2Fexample.com%2Fcallback&pubkey=GA5WBPYA5WKBC3HCMAFZ9MA4T5FDJSOHPXWDWQUXQW7H7QNOUV27G5TU';

    const result = parseSep7Uri(uri);

    expect(result.operation).toBe('tx');
    expect(result.params.xdr).toBe('AAAAAGX...');
    expect(result.params.callback).toBe('url:https://example.com/callback');
    expect(result.params.pubkey).toBe('GA5WBPYA5WKBC3HCMAFZ9MA4T5FDJSOHPXWDWQUXQW7H7QNOUV27G5TU');
  });
});
