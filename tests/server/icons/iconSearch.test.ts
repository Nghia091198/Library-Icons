import { describe, expect, it } from 'vitest';
import { expandSearchTerms, rankBySearchRelevance } from '@/server/icons/iconSearch';

const rank = (slugs: string[], query: string) =>
  rankBySearchRelevance(
    slugs.map((slug) => ({ slug })),
    expandSearchTerms(query),
  ).map((item) => item.slug);

describe('expandSearchTerms', () => {
  it('normalizes the query and adds library names for common words', () => {
    expect(expandSearchTerms('User')).toEqual(['user', 'person', 'account-circle']);
    expect(expandSearchTerms('Arrow Down')).toEqual(['arrow-down']);
    expect(expandSearchTerms('   ')).toEqual([]);
  });
});

describe('rankBySearchRelevance', () => {
  it('puts the exact name first, then names starting with the word, then names containing it', () => {
    expect(rank(['bluetooth-searching', 'image-search', 'search-off', 'search'], 'search')).toEqual([
      'search',
      'search-off',
      'image-search',
      'bluetooth-searching',
    ]);
  });

  it('prefers the library name for a common word over partial matches', () => {
    expect(rank(['add-shopping-cart', 'remove-shopping-cart', 'shopping-cart'], 'cart')[0]).toBe('shopping-cart');
    expect(rank(['supervised-user-circle', 'verified-user', 'person'], 'user')[0]).toBe('person');
    expect(rank(['heart-broken', 'monitor-heart', 'favorite'], 'heart')[0]).toBe('favorite');
  });

  it('keeps a direct exact match above a synonym exact match', () => {
    expect(rank(['email', 'mail'], 'mail')).toEqual(['mail', 'email']);
  });
});
