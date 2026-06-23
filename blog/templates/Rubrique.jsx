import React from 'react'
import PostCard from './PostCard.jsx'

// Équivalent de src/blog/rubrique.njk — page d'une rubrique (catégorie).
// Ancien CTA → /demo.html (supprimé) ; rebranché sur l'app.
const CTA_URL = 'https://app.rubysignal.com'

export default function Rubrique({ category, posts }) {
  return (
    <div className="journal">
      <section className="container--wide rubrique-page">
        <header className="rubrique-head">
          <span className="label">Rubrique</span>
          <h1 className="rubrique-head__title">{category}</h1>
          <p className="rubrique-head__count">
            {posts.length} article{posts.length > 1 ? 's' : ''}
          </p>
        </header>
        <div className="post-grid post-grid--3">
          {posts.map((post) => (
            <PostCard key={post.url} post={post} />
          ))}
        </div>
      </section>

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
