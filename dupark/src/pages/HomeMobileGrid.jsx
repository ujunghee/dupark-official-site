import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import gsap from 'gsap'
import { client, urlFor } from '../lib/sanity'
import { lenis } from '../lib/lenis'
import { DUPARK_M_SPA_OK } from '../lib/mobileGridSession'
import './Home.css'

const MOBILE_MAX = 768

function MobileCategoryItem({ cat }) {
  let media
  if (cat.coverImage) {
    media = <img src={urlFor(cat.coverImage).width(600).url()} alt={cat.title} />
  } else if (cat.coverVideoUrl) {
    media = (
      <video
        src={cat.coverVideoUrl}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={cat.title}
      />
    )
  } else {
    media = <div style={{ position: 'absolute', inset: 0, background: '#222' }} />
  }
  return (
    <Link to={`/${cat.slug}`} className="mobile-grid-item">
      <div className="mobile-cat-label">{cat.title}</div>
      <div className="mobile-cat-img">{media}</div>
    </Link>
  )
}

/**
 * 모바일 그리드 전용 (`/m`).
 * `location.state.fromIntro` + 같은 탭에서 방금 세팅된 `sessionStorage` 플래그가 있어야 진입.
 * 전체 새로고침 시 `location.state`가 사라져 `/`(인트로)로 보냄.
 */
export default function HomeMobileGrid() {
  const navigate = useNavigate()
  const location = useLocation()
  const [categories, setCategories] = useState([])
  const gridSectionRef = useRef(null)

  let spaOk = false
  try {
    spaOk = sessionStorage.getItem(DUPARK_M_SPA_OK) === '1'
  } catch {
    spaOk = false
  }
  const fromIntro = location.state?.fromIntro === true
  const allowed = fromIntro && spaOk

  useLayoutEffect(() => {
    if (!allowed) {
      try {
        sessionStorage.removeItem(DUPARK_M_SPA_OK)
      } catch {
        /* ignore */
      }
      navigate('/', { replace: true })
      return undefined
    }
    document.body.classList.add('dupark-home-content')
    return () => document.body.classList.remove('dupark-home-content')
  }, [allowed, navigate])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.innerWidth > MOBILE_MAX) {
      navigate('/', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MOBILE_MAX + 1}px)`)
    const onWide = () => {
      if (mq.matches) navigate('/', { replace: true })
    }
    mq.addEventListener('change', onWide)
    return () => mq.removeEventListener('change', onWide)
  }, [navigate])

  useEffect(() => {
    if (!allowed) return
    client.fetch(
      `*[_type == "category"] | order(coalesce(order, 0) desc, _createdAt desc){
        _id, title, slug, coverImage,
        "coverVideoUrl": coverVideo.asset->url
      }`
    ).then(setCategories)
  }, [allowed])

  useEffect(() => {
    if (!allowed) return
    window.scrollTo(0, 0)
    lenis.scrollTo(0, { immediate: true, force: true })
    lenis.resize()
  }, [allowed])

  useLayoutEffect(() => {
    if (!allowed || categories.length === 0) return
    const section = gridSectionRef.current
    if (!section) return
    const items = gsap.utils.toArray(section.querySelectorAll('.mobile-grid-item'))
    if (!items.length) return

    const reduce =
      typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      gsap.set(items, { clearProps: 'transform,opacity,visibility' })
      return undefined
    }

    gsap.killTweensOf(items)
    /* y + opacity 한 세트로 같은 이징·길이 — 긴 메인 페이드와 분리돼 어색함 제거 */
    gsap.fromTo(
      items,
      { y: 10, autoAlpha: 0 },
      {
        y: 0,
        autoAlpha: 1,
        duration: 0.58,
        stagger: {
          each: 0.05,
          from: 'start',
        },
        ease: 'power3.out',
        onComplete: () => {
          gsap.set(items, { clearProps: 'transform,opacity,visibility' })
        },
      }
    )
    return () => {
      gsap.killTweensOf(items)
    }
  }, [allowed, categories])

  if (!allowed) return null

  return (
    <main id="main-content" tabIndex={-1} className="home-mobile-grid-main">
      <section ref={gridSectionRef} className="mobile-grid-section">
        {categories.map((cat) => (
          <MobileCategoryItem key={cat._id} cat={cat} />
        ))}
      </section>
    </main>
  )
}
