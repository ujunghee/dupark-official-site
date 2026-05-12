import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { urlFor } from '../lib/sanity'
import { lenis } from '../lib/lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import SanityAutoplayVideo from '../component/SanityAutoplayVideo'
import './Home.css'

const HOME_CARD_MEDIA_W = 700

function catCoverVideoPoster(cat) {
  if (!cat) return undefined
  if (cat.coverImage) return urlFor(cat.coverImage).width(HOME_CARD_MEDIA_W).url()
  if (cat.hoverImage) return urlFor(cat.hoverImage).width(HOME_CARD_MEDIA_W).url()
  return undefined
}

function catHoverVideoPoster(cat) {
  if (!cat) return undefined
  if (cat.hoverImage) return urlFor(cat.hoverImage).width(HOME_CARD_MEDIA_W).url()
  if (cat.coverImage) return urlFor(cat.coverImage).width(HOME_CARD_MEDIA_W).url()
  return undefined
}

function CardMedia({ image, videoUrl, posterUrl, alt, hidden }) {
  const style = hidden ? { opacity: 0 } : { opacity: 1 }
  if (image) {
    return <img src={urlFor(image).width(HOME_CARD_MEDIA_W).url()} alt={alt} style={style} />
  }
  if (videoUrl) {
    return (
      <SanityAutoplayVideo
        src={videoUrl}
        poster={posterUrl}
        ariaLabel={alt}
        preload="metadata"
        loop
        stopLinkClick
        style={{
          width: '100%',
          aspectRatio: '3/4',
          objectFit: 'cover',
          display: 'block',
          ...style,
        }}
      />
    )
  }
  return null
}

function CategoryCard({ cat }) {
  const [hovered, setHovered] = useState(false)
  const hasCover = Boolean(cat.coverImage || cat.coverVideoUrl)
  const hasHover = Boolean(cat.hoverImage || cat.hoverVideoUrl)

  return (
    <Link
      to={`/${cat.slug}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="category-card"
    >
      <div className="category-card-label">{cat.title}</div>
      <div className="category-card-img">
        {hasCover && (
          <CardMedia
            image={cat.coverImage}
            videoUrl={cat.coverVideoUrl}
            posterUrl={catCoverVideoPoster(cat)}
            alt={cat.title}
            hidden={hovered && hasHover}
          />
        )}
        {hasHover && (
          <CardMedia
            image={cat.hoverImage}
            videoUrl={cat.hoverVideoUrl}
            posterUrl={catHoverVideoPoster(cat)}
            alt={cat.title}
            hidden={!hovered}
          />
        )}
      </div>
    </Link>
  )
}

/** 데스크톱 가로 카테고리 — `/` 홈·`/main` PC 공통 */
export default function HomeDesktopHorizontal({ categories }) {
  const horizontalRef = useRef(null)
  const trackRef = useRef(null)
  const ctxRef = useRef(null)

  useLayoutEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.revert()
      ctxRef.current = null
    }
    if (!categories?.length) return

    const horizontal = horizontalRef.current
    const track = trackRef.current
    if (!horizontal || !track) return

    ctxRef.current = gsap.context(() => {
      const cards = Array.from(track.querySelectorAll('.category-card'))

      gsap.set(cards, { y: 50, opacity: 0 })

      ScrollTrigger.create({
        trigger: horizontal,
        start: 'top 70%',
        once: true,
        onEnter: () => {
          gsap.to(cards, { y: 0, opacity: 1, duration: 1.2, stagger: 0.05, ease: 'power3.out', delay: 0.2 })
        },
      })

      gsap.to(track, {
        x: () => -(track.scrollWidth - horizontal.clientWidth),
        ease: 'none',
        scrollTrigger: {
          trigger: horizontal,
          start: 'top top',
          end: () => `+=${track.scrollWidth - horizontal.clientWidth}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })
    })

    return () => {
      ctxRef.current?.revert()
      ctxRef.current = null
      lenis.scrollTo(0, { immediate: true, force: true })
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      lenis.resize()
      ScrollTrigger.refresh()
    }
  }, [categories])

  return (
    <section ref={horizontalRef} className="h-scroll-section">
      <div ref={trackRef} className="h-scroll-track">
        {categories.map((cat) => (
          <CategoryCard key={cat._id} cat={cat} />
        ))}
      </div>
    </section>
  )
}
