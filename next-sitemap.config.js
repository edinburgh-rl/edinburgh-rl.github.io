/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://edinburgh-rl.github.io/',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  robotsTxtOptions: {
        policies: [
            {
                userAgent: '*',
                allow: '/',
            }
        ]
    }
}