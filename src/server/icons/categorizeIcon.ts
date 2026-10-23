import { ICON_SET_STYLE, type IconSetStyle } from '@/shared/constants/icons';

export const ICON_CATEGORY_SLUG = {
  arrows: 'arrows',
  chevrons: 'chevrons',
  navigation: 'navigation',
  actions: 'actions',
  alerts: 'alerts',
  commerce: 'commerce',
  payment: 'payment',
  shipping: 'shipping',
  communication: 'communication',
  social: 'social',
  brands: 'brands',
  users: 'users',
  media: 'media',
  files: 'files',
  editor: 'editor',
  layout: 'layout',
  dateTime: 'date-time',
  devices: 'devices',
  maps: 'maps',
  security: 'security',
  data: 'data',
  development: 'development',
  weather: 'weather',
  education: 'education',
  countries: 'countries',
  other: 'other',
} as const;

export type IconCategorySlug = (typeof ICON_CATEGORY_SLUG)[keyof typeof ICON_CATEGORY_SLUG];

const C = ICON_CATEGORY_SLUG;

const SOCIAL_KEYWORDS = [
  'facebook', 'messenger', 'instagram', 'threads', 'tiktok', 'youtube', 'zalo', 'twitter', 'linkedin',
  'pinterest', 'reddit', 'telegram', 'whatsapp', 'snapchat', 'discord', 'viber', 'skype', 'social',
];

const PAYMENT_BRAND_KEYWORDS = ['visa', 'mastercard', 'paypal', 'momo', 'vnpay', 'zalopay', 'amex', 'jcb', 'stripe', 'applepay'];

// Thứ tự là độ ưu tiên: khi slug khớp nhiều nhóm, nhóm đứng trước thắng (add-shopping-cart → commerce, không phải actions).
const KEYWORD_RULES: ReadonlyArray<readonly [IconCategorySlug, readonly string[]]> = [
  [C.chevrons, ['chevron', 'chevrons', 'caret', 'angle']],
  [C.arrows, ['arrow', 'arrows', 'undo', 'redo', 'swap', 'rotate', 'reply', 'forward', 'north', 'south', 'east', 'west', 'trending', 'turn', 'subdirectory', 'expand', 'collapse', 'move']],
  [C.payment, ['payment', 'payments', 'credit', 'card', 'wallet', 'cash', 'money', 'coin', 'coins', 'bank', 'atm', 'receipt', 'invoice', 'currency', 'euro', 'dollar']],
  [C.shipping, ['truck', 'shipping', 'delivery', 'package', 'parcel', 'inventory', 'warehouse']],
  [C.commerce, ['cart', 'shop', 'shopping', 'store', 'storefront', 'bag', 'basket', 'sell', 'tag', 'price', 'discount', 'coupon', 'voucher', 'gift', 'sale', 'product', 'order', 'loyalty', 'redeem', 'barcode', 'qr']],
  [C.alerts, ['alert', 'warning', 'error', 'info', 'help', 'notification', 'notifications', 'bell', 'check', 'done', 'report', 'priority', 'success', 'cancel', 'block', 'question']],
  [C.communication, ['mail', 'email', 'message', 'messages', 'chat', 'comment', 'forum', 'phone', 'call', 'contact', 'contacts', 'send', 'inbox', 'sms', 'voicemail', 'mark', 'unread']],
  [C.security, ['lock', 'unlock', 'shield', 'key', 'security', 'password', 'fingerprint', 'verified', 'privacy', 'admin']],
  [C.users, ['user', 'users', 'person', 'people', 'group', 'account', 'face', 'profile', 'badge', 'supervisor', 'identity', 'avatar']],
  [C.dateTime, ['calendar', 'date', 'time', 'clock', 'schedule', 'alarm', 'timer', 'history', 'event', 'today', 'hourglass', 'pending']],
  [C.maps, ['map', 'location', 'pin', 'place', 'directions', 'compass', 'globe', 'public', 'flight', 'hotel', 'restaurant', 'car', 'train', 'bus', 'travel', 'explore', 'near', 'route']],
  [C.media, ['play', 'pause', 'stop', 'video', 'music', 'audio', 'volume', 'mic', 'camera', 'image', 'photo', 'movie', 'film', 'headphones', 'album', 'podcast', 'record', 'skip', 'replay', 'shuffle', 'repeat', 'queue', 'subtitles', 'radio', 'gallery']],
  [C.files, ['file', 'files', 'folder', 'document', 'description', 'attach', 'attachment', 'cloud', 'download', 'upload', 'archive', 'note', 'article', 'draft', 'save', 'content', 'clipboard']],
  [C.editor, ['edit', 'format', 'text', 'font', 'align', 'bold', 'italic', 'underline', 'pen', 'pencil', 'brush', 'draw', 'crop', 'highlight', 'paragraph', 'title', 'strikethrough', 'spellcheck', 'link', 'insert', 'paste', 'cut', 'quote']],
  [C.data, ['chart', 'graph', 'analytics', 'insights', 'pie', 'bar', 'data', 'database', 'leaderboard', 'query', 'stats', 'percent', 'poll']],
  [C.devices, ['device', 'devices', 'smartphone', 'mobile', 'laptop', 'computer', 'desktop', 'tablet', 'tv', 'monitor', 'keyboard', 'mouse', 'printer', 'battery', 'bluetooth', 'wifi', 'signal', 'usb', 'memory', 'router', 'cast', 'headset', 'sim', 'cell', 'nfc', 'watch']],
  [C.development, ['code', 'terminal', 'bug', 'api', 'developer', 'git', 'html', 'css', 'javascript', 'webhook', 'integration']],
  [C.weather, ['weather', 'sun', 'sunny', 'rain', 'snow', 'storm', 'wind', 'thunder', 'moon', 'night', 'sunrise', 'sunset', 'umbrella', 'temperature', 'thermostat']],
  [C.education, ['school', 'book', 'books', 'education', 'graduation', 'science', 'calculate', 'quiz', 'class', 'library', 'stories']],
  [C.layout, ['grid', 'layout', 'dashboard', 'view', 'table', 'column', 'row', 'list', 'menu', 'apps', 'widgets', 'sidebar', 'window', 'tab', 'split', 'fullscreen', 'aspect']],
  [C.navigation, ['home', 'close', 'more', 'search', 'settings', 'filter', 'sort', 'back', 'exit', 'logout', 'login', 'open', 'launch', 'first', 'last']],
  [C.actions, ['add', 'remove', 'delete', 'trash', 'plus', 'minus', 'share', 'favorite', 'heart', 'star', 'bookmark', 'thumb', 'like', 'visibility', 'eye', 'print', 'refresh', 'sync', 'zoom', 'power', 'toggle', 'tune', 'build', 'extension', 'copy']],
];

const CATEGORY_BY_KEYWORD = new Map<string, { category: IconCategorySlug; priority: number }>();
KEYWORD_RULES.forEach(([category, keywords], priority) => {
  for (const keyword of keywords) {
    if (!CATEGORY_BY_KEYWORD.has(keyword)) CATEGORY_BY_KEYWORD.set(keyword, { category, priority });
  }
});

// Nhóm trong file Figma, dùng khi tên icon không đủ để đoán.
const CATEGORY_BY_SOURCE_GROUP: Record<string, IconCategorySlug> = {
  'arrow': C.arrows,
  'arrows': C.arrows,
  'commerce': C.commerce,
  'finance & ecommerce': C.commerce,
  'payment method icon': C.payment,
  'communication': C.communication,
  'social icon': C.social,
  'social media logo': C.social,
  'integration icons': C.brands,
  'country icons': C.countries,
  'media': C.media,
  'media & devices': C.media,
  'images': C.media,
  'device': C.devices,
  'date & time': C.dateTime,
  'time': C.dateTime,
  'alert': C.alerts,
  'alerts & feedback': C.alerts,
  'editor': C.editor,
  'note': C.editor,
  'data visualization': C.data,
  'charts': C.data,
  'files': C.files,
  'layout': C.layout,
  'maps & travel': C.maps,
  'people': C.users,
  'users': C.users,
  'security': C.security,
  'weather': C.weather,
  'development': C.development,
  'education': C.education,
  'action': C.actions,
  'system': C.navigation,
  // Chủ đề gốc của Material Icons (nhóm "Archived" trong file Figma).
  'content': C.actions,
  'toggle': C.actions,
  'image': C.media,
  'av': C.media,
  'maps': C.maps,
  'places': C.maps,
  'hardware': C.devices,
  'home': C.devices,
  'notification': C.alerts,
  'search': C.navigation,
  'navigation': C.navigation,
  'file': C.files,
  // "Social" của Material là người, nhóm, hoạt động; khác nhóm logo "Social icon".
  'social': C.users,
};

export interface CategorizeInput {
  slug: string;
  setStyle: IconSetStyle;
  sourceGroup?: string | null;
}

export function categorizeIcon({ slug, setStyle, sourceGroup }: CategorizeInput): IconCategorySlug {
  const tokens = slug.split('-');
  const groupCategory = sourceGroup ? CATEGORY_BY_SOURCE_GROUP[sourceGroup.trim().toLowerCase()] : undefined;

  if (tokens.some((token) => SOCIAL_KEYWORDS.includes(token))) return C.social;
  if (tokens.some((token) => PAYMENT_BRAND_KEYWORDS.includes(token))) return C.payment;
  if (groupCategory === C.countries || groupCategory === C.social || groupCategory === C.payment) return groupCategory;
  if (setStyle === ICON_SET_STYLE.brand) return groupCategory ?? C.brands;

  const keywordMatch = tokens
    .map((token) => CATEGORY_BY_KEYWORD.get(token))
    .filter((match) => match !== undefined)
    .sort((first, second) => first.priority - second.priority)[0];

  return keywordMatch?.category ?? groupCategory ?? C.other;
}
