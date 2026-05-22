import { Link } from 'react-router-dom'
import { imageUrl } from '../lib/sanity'
import SanityAutoplayVideo from '../component/SanityAutoplayVideo'

const M_GRID_POSTER_W = 600

function mobileCatVideoPoster(cat) {
  if (!cat) return undefined
  if (cat.coverImage) return imageUrl(cat.coverImage, M_GRID_POSTER_W, 76)
  if (cat.hoverImage) return imageUrl(cat.hoverImage, M_GRID_POSTER_W, 76)
  return undefined
}

/** `/m` 그리드·`/main` 모바일 그리드 공통 */
export function MobileCategoryItem({ cat }) {
  let media
  if (cat.coverImage) {
    media = <img src={imageUrl(cat.coverImage, 600, 76)} alt={cat.title} />
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
