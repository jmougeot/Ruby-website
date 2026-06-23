import React from 'react'
import { site, absoluteUrl, dateIso, slugify } from '../site.js'

// Équivalent de src/_includes/layouts/base.njk — squelette HTML partagé par toutes
// les pages du journal (index, article, rubrique). Rendu en HTML statique par
// scripts/build-blog.mjs (renderToStaticMarkup). Le DOCTYPE est ajouté côté script.
export default function Layout({
  title,
  metaTitle,
  description,
  ogType = 'website',
  ogUrl = '/',
  image,
  date,
  categories = [],
  activeUrl,
  children,
}) {
  const pageTitle = metaTitle || (title ? `${title} — ${site.name}` : site.title)
  const desc = description || site.tagline
  const ogImage = absoluteUrl(image || '/assets/images/logo.png')

  return (
    <html lang={site.lang}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content={desc} />

        {/* Open Graph */}
        <meta property="og:title" content={title || site.title} />
        <meta property="og:description" content={desc} />
        <meta property="og:type" content={ogType} />
        <meta property="og:url" content={absoluteUrl(ogUrl)} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:locale" content="fr_FR" />
        {ogType === 'article' && date && (
          <meta property="article:published_time" content={dateIso(date)} />
        )}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title || site.title} />
        <meta name="twitter:description" content={desc} />

        <title>{pageTitle}</title>

        <link rel="canonical" href={absoluteUrl(ogUrl)} />
        <link rel="icon" type="image/png" href="/assets/images/logo.png" />
        <link rel="alternate" type="application/atom+xml" title={site.journalName} href="/feed.xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Spectral:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/css/style.css" />
        <link rel="stylesheet" href="/css/blog.css" />
      </head>
      <body>
        {/* En-tête éditorial du journal */}
        <header className="journal-header">
          <div className="journal-header__inner">
            <a href="/blog/" className="journal-header__brand">
              <img src="/assets/images/logo.png" alt="Ruby" className="journal-header__logo" />
            </a>
            <a href="/blog/" className="journal-header__name">Le journal de Ruby</a>
            <a href="/" className="journal-header__back">Retour au site &rarr;</a>
          </div>
        </header>

        {/* Navigation par rubriques */}
        <nav className="journal-nav">
          <div className="journal-nav__inner">
            <a
              href="/blog/"
              className={`journal-nav__link${activeUrl === '/blog/' ? ' is-active' : ''}`}
            >
              À la une
            </a>
            {categories.map((cat) => {
              const url = `/blog/rubrique/${slugify(cat)}/`
              return (
                <a
                  key={cat}
                  href={url}
                  className={`journal-nav__link${activeUrl === url ? ' is-active' : ''}`}
                >
                  {cat}
                </a>
              )
            })}
          </div>
        </nav>

        <main>{children}</main>

        {/* Footer */}
        <footer className="footer">
          <div className="container--wide">
            <div className="footer__simple">
              <span className="footer__logo">
                <img src="/assets/images/logo.png" alt="Ruby" className="footer__logo-img" />
              </span>
              <nav className="footer__links-inline">
                <a href="/" className="footer__link">Retour au site</a>
                <a href="/privacy.html" className="footer__link">Confidentialité</a>
                <a href="/terms.html" className="footer__link">CGU</a>
                <a href="mailto:hello@getruby.io" className="footer__link">Contact</a>
              </nav>
            </div>
            <div className="footer__bottom">
              <p className="footer__copyright">© 2026 Ruby. Tous droits réservés.</p>
            </div>
          </div>
        </footer>

        <script src="/js/main.js" />
      </body>
    </html>
  )
}
