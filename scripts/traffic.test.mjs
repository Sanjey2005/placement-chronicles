/**
 * Self-check for lib/traffic.ts. Run: node scripts/traffic.test.mjs
 *
 * Covers what silently skews the visitor numbers if it breaks: source
 * classification, bot filtering, the IST range windows, and the bucket keys the
 * chart zero-fills against (they must match the Mongo pipeline's format).
 */
import assert from 'node:assert/strict';

const t = await import('../lib/traffic.ts');
const HOST = 'placement-chronicles.vercel.app';

// Where a view came from
assert.deepEqual(t.classifySource(undefined, null, HOST), { source: null, referrer: null }); // in-site navigation
assert.equal(t.classifySource('', null, HOST).source, 'Direct');
assert.equal(t.classifySource('https://l.wl.co/', null, HOST).source, 'WhatsApp');
assert.equal(t.classifySource('https://www.google.com/', null, HOST).source, 'Google');
assert.equal(t.classifySource('https://mail.google.com/', null, HOST).source, 'Gmail');
assert.equal(t.classifySource('https://ecampus.psgtech.ac.in/studzone', null, HOST).source, 'eCampus');
assert.equal(t.classifySource(`https://${HOST}/login`, null, HOST).source, null); // our own login page is not an arrival
assert.equal(t.classifySource('', 'wa', HOST).source, 'WhatsApp'); // utm wins
assert.equal(t.classifySource('https://example.org/x', null, HOST).referrer, 'example.org');

// Browsers, systems, bots, devices
const chrome = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const edge = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0';
const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
assert.deepEqual(t.parseUserAgent(chrome), { browser: 'Chrome', os: 'Android' });
assert.deepEqual(t.parseUserAgent(edge), { browser: 'Edge', os: 'Windows' });
assert.deepEqual(t.parseUserAgent(iphone), { browser: 'Safari', os: 'iOS' });
assert.equal(t.isBot('Mozilla/5.0 (compatible; Googlebot/2.1)'), true);
assert.equal(t.isBot(''), true);
assert.equal(t.isBot('Mozilla/5.0 (Linux; Android 13; CUBOT KingKong) Chrome/120.0'), false);
assert.equal(t.deviceFromWidth(390), 'Mobile');
assert.equal(t.deviceFromWidth(800), 'Tablet');
assert.equal(t.deviceFromWidth(1440), 'Desktop');
assert.equal(t.deviceFromWidth('1440'), null);

// IST windows: 10:30 IST on 22 Oct 2026
const now = new Date('2026-10-22T05:00:00Z');
assert.equal(t.istDateKey(now), '2026-10-22');
assert.equal(t.istDateKey(new Date('2026-10-21T19:00:00Z')), '2026-10-22'); // 00:30 IST is already the 22nd
const today = t.rangeWindow('today', now);
assert.equal(today.from.toISOString(), '2026-10-21T18:30:00.000Z'); // IST midnight
assert.equal(today.prev.from.toISOString(), '2026-10-20T18:30:00.000Z');
const week = t.rangeWindow('7d', now);
assert.equal(week.from.toISOString(), '2026-10-15T18:30:00.000Z');
assert.equal(t.rangeWindow('12m', now).from.toISOString(), '2025-10-31T18:30:00.000Z'); // 1 Nov 2025 IST
assert.equal(t.rangeWindow('12m', now).prev, null);

// Bucket keys match the pipeline's '%Y-%m-%dT%H:%M' in IST and cover the whole window
const hours = t.bucketKeys(today.from, now, 'hour');
assert.equal(hours[0], '2026-10-22T00:00');
assert.equal(hours.at(-1), '2026-10-22T10:00');
assert.equal(hours.length, 11);
const days = t.bucketKeys(week.from, now, 'day');
assert.deepEqual([days.length, days[0], days.at(-1)], [7, '2026-10-16T00:00', '2026-10-22T00:00']);
const months = t.bucketKeys(t.rangeWindow('12m', now).from, now, 'month');
assert.deepEqual([months.length, months[0], months.at(-1)], [12, '2025-11-01T00:00', '2026-10-01T00:00']);
assert.equal(t.bucketLabel('2026-10-22T14:00', 'hour'), '2 PM');
assert.equal(t.bucketLabel('2026-10-22T00:00', 'day'), '22 Oct');
assert.equal(t.bucketLabel('2026-10-01T00:00', 'month'), 'Oct 2026');

// Small formatters
assert.equal(t.formatDuration(45), '45s');
assert.equal(t.formatDuration(125), '2m 05s');
assert.equal(t.formatDuration(3720), '1h 02m');
assert.deepEqual(t.countRows(['/', '/chat', '/', null]), [
    { name: '/', visitors: 2 },
    { name: '/chat', visitors: 1 },
    { name: null, visitors: 1 },
]);
assert.equal(t.pageLabel('/'), 'Home feed');
assert.equal(t.pageLabel('/somewhere'), '/somewhere');

console.log('traffic.test.mjs: all assertions passed');
