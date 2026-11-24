import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const meta = (name) => {
  for (const attr of ['property', 'name']) {
    const value = html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`))?.[1];
    if (value) return value;
  }
  return undefined;
};

const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
const description = meta('description');

// Link previews read these tags verbatim, so the title and description must not
// drift from the ones the page itself uses.
assert.equal(meta('og:title'), title, 'og:title mirrors <title>');
assert.equal(meta('twitter:title'), title, 'twitter:title mirrors <title>');
assert.equal(meta('og:description'), description, 'og:description mirrors the meta description');
assert.equal(meta('twitter:description'), description, 'twitter:description mirrors the meta description');

const imageUrl = meta('og:image');
assert.match(imageUrl, /^https:\/\/ziratbank\.loan\/og-image\.png$/, 'og:image is an absolute https URL');
assert.equal(meta('twitter:image'), imageUrl);
assert.equal(meta('twitter:card'), 'summary_large_image');
assert.equal(meta('og:image:width'), '1200');
assert.equal(meta('og:image:height'), '630');
assert.match(meta('og:url'), /^https:\/\/ziratbank\.loan\//, 'og:url is absolute');
assert.ok(meta('og:image:alt'), 'the preview image has alt text');

// Crawlers reject or downscale heavy images: WhatsApp caps previews at 300 kB.
const image = readFileSync(new URL('../public/og-image.png', import.meta.url));
const png = image.subarray(0, 24);
assert.equal(png.subarray(1, 4).toString(), 'PNG', 'og-image.png is a PNG');
assert.deepEqual([...png.subarray(16, 24)], [0, 0, 4, 0xb0, 0, 0, 2, 0x76], 'og-image.png is 1200x630');
assert.ok(statSync(new URL('../public/og-image.png', import.meta.url)).size < 300_000, 'og-image.png stays under 300 kB');

console.log('open graph tests passed');
