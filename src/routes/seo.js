/**
 * SEO routes: robots.txt and sitemap.xml
 *
 * robots.txt tells crawlers which paths to skip and where the sitemap is.
 * sitemap.xml lists every public page so search engines can find them all,
 * including products that nothing links to yet.
 */

const express = require('express');
const Product = require('../models/Product');
const { logger } = require('../utils/logger');

const router = express.Router();

const CATEGORIES = ['deck-boxes', 'tokens', 'accessories'];

// Search engines need absolute URLs. Set SITE_URL in production
// (e.g. https://thewizardsbag.com) so it doesn't depend on the Host header.
const siteUrl = req => (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

// XML needs &, <, > and quotes escaped, the same way HTML does.
const xmlEscape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
}[character]));

router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send([
    'User-agent: *',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /auth/',
    '',
    `Sitemap: ${siteUrl(req)}/sitemap.xml`,
    ''
  ].join('\n'));
});

router.get('/sitemap.xml', async (req, res) => {
  try {
    const base = siteUrl(req);
    const products = await Product.find({}, { _id: 1, updatedAt: 1 }).lean();

    const urls = [
      { loc: `${base}/` },
      { loc: `${base}/products` },
      ...CATEGORIES.map(category => ({ loc: `${base}/products?category=${category}` })),
      ...products.map(product => ({
        loc: `${base}/products/${product._id}`,
        lastmod: product.updatedAt ? product.updatedAt.toISOString().slice(0, 10) : undefined
      }))
    ];

    const body = urls.map(({ loc, lastmod }) =>
      `  <url><loc>${xmlEscape(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`
    ).join('\n');

    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
    );
  } catch (error) {
    logger.error('Sitemap generation failed', { error });
    res.status(500).type('text/plain').send('Sitemap unavailable');
  }
});

module.exports = router;