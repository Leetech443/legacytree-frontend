// Birth order helpers shared by the forms, the tree and the admin portal.
export const ordinal = (n) => { const v = n % 100, s = ['th', 'st', 'nd', 'rd']; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
export const ORDER_OPTIONS = Array.from({ length: 30 }, (_, i) => [String(i + 1), i === 0 ? '1st (oldest)' : ordinal(i + 1)]);
