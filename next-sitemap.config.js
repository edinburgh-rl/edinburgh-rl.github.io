/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://edinburgh-rl.github.io/',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  outDir: 'out',
  exclude: [
    '/blog',
    '/blog/*'
  ],
  robotsTxtOptions: {
        policies: [
            {
                userAgent: '*',
                allow: '/',
            }
        ]
    }
}
