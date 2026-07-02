import React from 'react'

// Équivalent de src/blog/index.njk — « La Une » (article en lead) + liste + CTA.
// Ancien CTA → /demo.html (page supprimée) ; rebranché sur l'app.
const CTA_URL = 'https://app.rubysignal.com'

export default function BlogIndex({ posts }) {
  const featured = posts.find((p) => p.data.featured) || posts[0]
  const rest = featured ? posts.filter((p) => p.url !== featured.url) : posts

  return (
    <div className="journal">
      <h1 className="sr-only">Le journal de Ruby — Analyses sur la vente</h1>

      {posts.length === 0 ? (
        <div className="container--wide journal-empty">
          <p>Les premiers articles arrivent très bientôt.</p>
        </div>
      ) : (
        <>
          {/* La Une : article en lead */}
          {featured && (
            <section className="container--wide">
              <a className="une-lead" href={featured.url}>
                {featured.data.image && (
                  <div className="une-lead__media">
                    <img src={featured.data.image} alt={featured.data.title} />
                  </div>
                )}
                <div className="une-lead__body">
                  <span className="une-lead__flag">À la une</span>
                  <h2 className="une-lead__title">{featured.data.title}</h2>
                  <p className="une-lead__excerpt">{featured.data.excerpt}</p>
                </div>
              </a>
            </section>
          )}

          {/* Les autres articles, en longueur */}
          {rest.length > 0 && (
            <section className="container--wide journal-grid-section">
              <div className="une-list">
                {rest.map((post) => (
                  <a key={post.url} className="une-row" href={post.url}>
                    {post.data.image && (
                      <div className="une-row__media">
                        <img src={post.data.image} alt={post.data.title} loading="lazy" decoding="async" />
                      </div>
                    )}
                    <div className="une-row__body">
                      <h3 className="une-row__title">{post.data.title}</h3>
                      <p className="une-row__excerpt">{post.data.excerpt}</p>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Bandeau CTA */}
      <section className="journal-cta">
        <div className="container--wide journal-cta__inner">
          <div>
            <h2 className="headline-medium journal-cta__title">Recevez nos analyses sur la vente.</h2>
            <p className="journal-cta__text">
              Les méthodes qui font vraiment bouger les taux de conversion, directement issues de
              l'analyse de milliers d'appels.
            </p>
          </div>
          <a href={CTA_URL} className="btn btn--primary btn--large">Demander une démo</a>
        </div>
      </section>
    </div>
  )
}
