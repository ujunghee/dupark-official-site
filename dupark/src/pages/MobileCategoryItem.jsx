import { Link } from 'react-router-dom'
import { urlFor } from '../lib/sanity'
import SanityAutoplayVideo from '../component/SanityAutoplayVideo'

const M_GRID_POSTER_W = 600

function mobileCatVideoPoster(cat) {
  if (!cat) return undefined
  if (cat.coverImage) return urlFor(cat.coverImage).width(M_GRID_POSTER_W).url()
  if (cat.hoverImage) return urlFor(cat.hoverImage).width(M_GRID_POSTER_W).url()
  return undefined
}

/** `/m` 그리드·`/main` 모바일 그리드 공통 */
export function MobileCategoryItem({ cat }) {
  let media
  if (cat.coverImage) {
    media = <img src={urlFor(cat.coverImage).width(600).url()} alt={cat.title} />
  } else if (cat.coverVideoUrl) {
    media = (
      <SanityAutoplayVideo
        src={cat.coverVideoUrl}
        poster={mobileCatVideoPoster(cat)}
        ariaLabel={cat.title}
        preload="metadata"
        loop
        stopLinkClick
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    )
  } else {
    media = (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'color-mix(in srgb, var(--site-text, #000) 8%, var(--site-bg, #fff))',
        }}
      />
    )
  }
  return (
    <Link to={`/${cat.slug}`} className="mobile-grid-item">
      <div className="mobile-cat-label">{cat.title}</div>
      <div className="mobile-cat-img">{media}</div>
    </Link>
  )
}
