import React from 'react'
import { site, dateFr, dateIso, absoluteUrl } from '../site.js'
import PostCard from './PostCard.jsx'

// Équivalent de src/_includes/layouts/article.njk — article complet + articles liés +
// CTA + JSON-LD. Ancien CTA → /demo.html (supprimé) ; rebranché sur l'app.
const CTA_URL = 'https://app.rubysignal.com'

export default function Article({ post, contentHtml, minutes, related = [], ogImage }) {
  const { title, excerpt, image, date, category, author } = post.data
  const by = author || site.author
  // Image du JSON-LD = carte sociale raster (ogImage) si fournie, sinon l'illustration.
  const schemaImage = ogImage || image

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: excerpt || site.tagline,
    datePublished: dateIso(date),
    author: { '@type': 'Person', name: by },
    publisher: {
      '@type': 'Organization',
      name: 'Ruby',
      logo: { '@type': 'ImageObject', url: absoluteUrl('/assets/images/logo.png') },
    },
    mainEntityOfPage: absoluteUrl(post.url),
    ...(schemaImage ? { image: absoluteUrl(schemaImage) } : {}),
  }

  return (
    <>
      <article className="article">
        <div className="article__container">
          <nav className="article__breadcrumb">
            <a href="/blog/">Journal</a>
            {category && (
              <>
                <span className="article__dot">·</span>
                <span>{category}</span>
              </>
            )}
          </nav>

          <header className="article__header">
            {category && <span className="label article__kicker">{category}</span>}
            <h1 className="headline-large article__title">{title}</h1>
            {excerpt && <p className="article__standfirst">{excerpt}</p>}
            <div className="article__meta">
              <span className="article__author-name">{by}</span>
              <span className="article__dot">·</span>
              <time dateTime={dateIso(date)}>{dateFr(date)}</time>
              <span className="article__dot">·</span>
              <span>{minutes} min de lecture</span>
            </div>
          </header>

          {image && (
            <figure className="article__hero">
              <img src={image} alt={title} />
            </figure>
          )}

          <div
            className="article__body legal__content"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />

          <aside className="article__author-box">
            <div className="article__author-avatar">{by.charAt(0)}</div>
            <div>
              <span className="article__author-label">Écrit par</span>
              <strong className="article__author-fullname">{by}</strong>
              <p className="article__author-bio">
                Ruby analyse 100 % des appels commerciaux pour révéler ce qui fait vendre. Nos
                analyses terrain sur la vente, ici même.
              </p>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="related section section--light">
            <div className="container--wide">
              <div className="post-grid post-grid--3">
                {related.map((p) => (
                  <PostCard key={p.url} post={p} />
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="cta cta--light section">
          <div className="cta__content">
            <h2 className="headline-medium cta__title">Envie de voir Ruby sur vos propres appels ?</h2>
            <div className="btn-group">
              <a href={CTA_URL} className="btn btn--primary btn--large">Demander une démo</a>
            </div>
          </div>
        </section>
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  )
}
