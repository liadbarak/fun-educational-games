const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const read = path => readFileSync(join(__dirname, '..', path), 'utf8');
const origin = 'https://puzzleten.com';
const sitemap = read('sitemap.xml');
const robots = read('robots.txt');

for (const utility of ['coin-flip', 'dice-roller']) {
  test(`${utility} has two independently discoverable language versions`, () => {
    const paths = { en: `/${utility}/`, de: `/de/${utility}/` };
    const titles = [];

    for (const [lang, path] of Object.entries(paths)) {
      const html = read(path.slice(1) + 'index.html');
      const otherLang = lang === 'en' ? 'de' : 'en';

      assert.ok(html.includes(`<html lang="${lang}">`));
      assert.ok(html.includes(`<link rel="canonical" href="${origin + path}">`));
      assert.ok(html.includes(`<meta property="og:url" content="${origin + path}">`));
      assert.doesNotMatch(html, /<meta[^>]*name="robots"[^>]*noindex/i);
      assert.ok(sitemap.includes(`<loc>${origin + path}</loc>`));
      assert.doesNotMatch(robots, /^Disallow:\s*\/de(?:\/|\s|$)/m);
      titles.push(html.match(/<title>([^<]+)<\/title>/)[1]);

      for (const [alternateLang, alternatePath] of Object.entries(paths)) {
        assert.ok(html.includes(`<link rel="alternate" hreflang="${alternateLang}" href="${origin + alternatePath}">`));
      }
      assert.ok(html.includes(`hreflang="${otherLang}" href="${paths[otherLang]}"`));
    }
    assert.notEqual(...titles);
  });
}
