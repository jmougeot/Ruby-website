import React from 'react'

// Équivalent de src/_includes/partials/post-card.njk
export default function PostCard({ post }) {
  return (
    <a className="post-card" href={post.url}>
      {post.data.image && (
        <div className="post-card__media">
          <img src={post.data.image} alt={post.data.title} loading="lazy" decoding="async" />
        </div>
      )}
      <div className="post-card__body">
        <h3 className="post-card__title">{post.data.title}</h3>
        <p className="post-card__excerpt">{post.data.excerpt}</p>
      </div>
    </a>
  )
}
