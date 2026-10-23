import { toSlugSearchTerm } from '@/server/icons/iconRepository';

// Cách gọi phổ biến → tên trong thư viện (phần lớn theo tên của Material Design).
// Chỉ áp dụng khi cả từ khoá khớp một mục, để không làm loãng kết quả của từ khoá dài.
const SEARCH_SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  user: ['person', 'account-circle'],
  users: ['group', 'people'],
  profile: ['person', 'account-circle'],
  account: ['person', 'account-circle'],
  avatar: ['account-circle', 'person'],
  heart: ['favorite'],
  love: ['favorite'],
  like: ['favorite', 'thumb-up'],
  wishlist: ['favorite'],
  cart: ['shopping-cart'],
  basket: ['shopping-basket'],
  bag: ['shopping-bag'],
  trash: ['delete'],
  bin: ['delete'],
  remove: ['delete', 'close'],
  x: ['close'],
  cancel: ['close'],
  gear: ['settings'],
  cog: ['settings'],
  hamburger: ['menu'],
  burger: ['menu'],
  magnifier: ['search'],
  find: ['search'],
  mail: ['email', 'mail'],
  envelope: ['email', 'mail'],
  phone: ['call', 'phone'],
  telephone: ['call', 'phone'],
  location: ['place', 'location-on'],
  pin: ['place', 'location-on'],
  marker: ['place', 'location-on'],
  house: ['home'],
  bell: ['notifications'],
  alert: ['notifications', 'warning'],
  pencil: ['edit'],
  calendar: ['calendar-today', 'event'],
  clock: ['schedule', 'access-time'],
  time: ['schedule', 'access-time'],
  eye: ['visibility'],
  hide: ['visibility-off'],
  lock: ['lock'],
  plus: ['add'],
  minus: ['remove'],
  check: ['check', 'done'],
  tick: ['check', 'done'],
  filter: ['filter-list', 'tune'],
  sort: ['sort'],
  share: ['share'],
  truck: ['local-shipping'],
  shipping: ['local-shipping'],
  delivery: ['local-shipping'],
  gift: ['card-giftcard', 'redeem'],
  coupon: ['local-offer', 'sell'],
  tag: ['local-offer', 'sell'],
  discount: ['local-offer', 'percent'],
  money: ['payments', 'attach-money'],
  wallet: ['account-balance-wallet', 'wallet'],
  card: ['credit-card'],
  star: ['star', 'grade'],
  rating: ['star', 'grade'],
  chat: ['chat', 'forum'],
  message: ['chat', 'message'],
};

export function expandSearchTerms(query: string): string[] {
  const base = toSlugSearchTerm(query);
  if (!base) return [];
  const synonyms = SEARCH_SYNONYMS[base] ?? [];
  return [base, ...synonyms.filter((synonym) => synonym !== base)];
}

const MATCH_RANK = {
  exact: 0,
  prefix: 1,
  word: 2,
  contains: 3,
} as const;

function matchRank(slug: string, term: string): number {
  if (slug === term) return MATCH_RANK.exact;
  if (slug.startsWith(`${term}-`)) return MATCH_RANK.prefix;
  if (slug.endsWith(`-${term}`) || slug.includes(`-${term}-`)) return MATCH_RANK.word;
  return MATCH_RANK.contains;
}

// Điểm thấp hơn = liên quan hơn. Khớp qua từ đồng nghĩa xếp ngay sau khớp trực tiếp cùng mức,
// nên "user" vẫn đưa "person" (khớp nguyên tên) lên trên "verified-user" (chỉ khớp một từ).
function relevanceScore(slug: string, terms: readonly string[]): number {
  return Math.min(...terms.map((term, index) => matchRank(slug, term) * 2 + (index === 0 ? 0 : 1)));
}

export function rankBySearchRelevance<TItem extends { slug: string }>(items: TItem[], terms: readonly string[]): TItem[] {
  if (terms.length === 0) return items;
  return items
    .map((item) => ({ item, score: relevanceScore(item.slug, terms) }))
    .sort(
      (first, second) =>
        first.score - second.score ||
        first.item.slug.length - second.item.slug.length ||
        first.item.slug.localeCompare(second.item.slug),
    )
    .map(({ item }) => item);
}
