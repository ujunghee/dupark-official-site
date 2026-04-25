import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { client, urlFor } from '../lib/sanity'
import { lenis } from '../lib/lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './Home.css'

const MOBILE_BREAKPOINT = 768

function MobileCategoryItem({ cat }) {
  const navigate = useNavigate()
  return (
    <div onClick={() => navigate(`/${cat.slug}`)} style={{ cursor: 'pointer' }}>
      <div className="mobile-cat-label">{cat.title}</div>
      <div className="mobile-cat-img">
        {cat.coverImage
          ? <img src={urlFor(cat.coverImage).width(600).url()} alt={cat.title} />
          : <div style={{ position: 'absolute', inset: 0, background: '#222' }} />
        }
      </div>
    </div>
  )
}

function CategoryCard({ cat }) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={() => navigate(`/${cat.slug}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="category-card"
    >
      <div className="category-card-label">{cat.title}</div>
      <div className="category-card-img">
        {cat.coverImage && (
          <img
            src={urlFor(cat.coverImage).width(700).url()} alt={cat.title}
            style={{ opacity: hovered && cat.hoverImage ? 0 : 1 }}
          />
        )}
        {cat.hoverImage && (
          <img
            src={urlFor(cat.hoverImage).width(700).url()} alt={cat.title}
            style={{ opacity: hovered ? 1 : 0 }}
          />
        )}
      </div>
    </div>
  )
}

export default function Home() {
  const horizontalRef = useRef(null)
  const trackRef      = useRef(null)
  const ctxRef        = useRef(null)
  const logoRef       = useRef(null)
  const videoRef      = useRef(null)
  const spacerRef     = useRef(null)
  const [categories,   setCategories]   = useState([])
  const [isMobile,     setIsMobile]     = useState(() => window.innerWidth <= MOBILE_BREAKPOINT)
  const [videoSrc,     setVideoSrc]     = useState(null)
  const [videoPoster,  setVideoPoster]  = useState(null)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    const handler = (e) => {
      if (e.matches && ctxRef.current) {
        ctxRef.current.revert()
        ctxRef.current = null
      }
      setIsMobile(e.matches)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    client.fetch(`*[_type == "category"] | order(order asc)`).then(setCategories)
  }, [])

  useEffect(() => {
    client
      .fetch(`*[_type == "siteSettings"][0]{ "videoUrl": introVideo.asset->url, "posterUrl": introVideoPoster.asset->url }`)
      .then((data) => {
        if (data?.videoUrl)  setVideoSrc(data.videoUrl)
        if (data?.posterUrl) setVideoPoster(data.posterUrl)
      })
  }, [])

  // ── 새로고침 시 최상단으로 ──
  useEffect(() => {
    window.scrollTo(0, 0)
    lenis.scrollTo(0, { duration: 0 })
  }, [])

  // ── 인트로 로고 reveal 애니메이션 ──
  useEffect(() => {
    if (!logoRef.current) return
    const tween = gsap.fromTo(
      logoRef.current,
      { yPercent: 100 },
      { yPercent: 0, duration: 2.4, ease: 'power4.out', delay: 0.6 }
    )
    return () => tween.kill()
  }, [])

  // ── 비디오 스크롤 줌 ──
  useEffect(() => {
    if (!videoRef.current || !spacerRef.current) return
    const tween = gsap.fromTo(
      videoRef.current,
      { scale: 1 },
      {
        scale: 2,
        ease: 'none',
        scrollTrigger: {
          trigger: spacerRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
      }
    )
    return () => tween.kill()
  }, [])

  // ── 비디오 구간 → 컨텐츠 섹션 스냅 ──
  useEffect(() => {
    let isSnapping = false

    const snapTo = (target) => {
      isSnapping = true
      lenis.scrollTo(target, {
        duration: .8,
        ease: 'power3.out',
        lock: true,
        onComplete: () => {
          isSnapping = false
          lenis.start()
        },
      })
    }

    const onWheel = (e) => {
      if (isSnapping) return
      const vh = window.innerHeight
      const scroll = lenis.scroll
      if (scroll < vh && e.deltaY > 0)                    snapTo(vh)
      else if (scroll > 0 && scroll <= vh && e.deltaY < 0) snapTo(0)
    }

    let touchStartY = 0
    const onTouchStart = (e) => { touchStartY = e.touches[0].clientY }
    const onTouchEnd = (e) => {
      if (isSnapping) return
      const vh    = window.innerHeight
      const scroll = lenis.scroll
      const diff  = touchStartY - e.changedTouches[0].clientY

      if (Math.abs(diff) < 30) return

      if (scroll < vh && diff > 0)                    snapTo(vh)
      else if (scroll > 0 && scroll <= vh && diff < 0) snapTo(0)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  // ── 가로 스크롤 GSAP ──
  useLayoutEffect(() => {
    if (ctxRef.current) { ctxRef.current.revert(); ctxRef.current = null }
    if (categories.length === 0 || isMobile) return

    const horizontal = horizontalRef.current
    const track      = trackRef.current
    if (!horizontal || !track) return

    ctxRef.current = gsap.context(() => {
      const cards = Array.from(track.querySelectorAll('.category-card'))

      gsap.set(cards, { y: 60, opacity: 0 })

      ScrollTrigger.create({
        trigger: horizontal,
        start: 'top 70%',
        once: true,
        onEnter: () => {
          gsap.to(cards, { y: 0, opacity: 1, duration: 1.2, stagger: 0.08, ease: 'power3.out', delay: 0.2 })
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
    }
  }, [categories, isMobile])

  return (
    <main>
      {/* ── 배경 비디오 ── */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw', height: '100vh',
        zIndex: -1,
        background: '#000',
        overflow: 'hidden',
      }}>
        <video
          ref={videoRef}
          autoPlay muted loop playsInline
          poster={videoPoster || undefined}
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
        >
          {videoSrc && <source src={videoSrc} type="video/mp4" />}
        </video>
      </div>

      {/* ── 인트로 로고 ── */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 0,
        overflow: 'hidden',
        mixBlendMode: 'difference',
      }}>
        <img
          ref={logoRef}
          src="/logo-white.svg"
          alt="DUPARK"
          style={{ height: '3.5rem', width: 'auto', display: 'block', userSelect: 'none' }}
        />
      </div>

      {/* ── 100vh 스페이서 ── */}
      <div ref={spacerRef} style={{ height: '100vh', position: 'relative', zIndex: 1, pointerEvents: 'none' }} />

      {/* ── 데스크탑: 가로 스크롤 섹션 ── */}
      {!isMobile && (
        <section ref={horizontalRef} className="h-scroll-section">
          <div ref={trackRef} className="h-scroll-track">
            {categories.map((cat) => (
              <CategoryCard key={cat._id} cat={cat} />
            ))}
          </div>
        </section>
      )}

      {/* ── 모바일: 2열 그리드 ── */}
      {isMobile && (
        <section className="mobile-grid-section">
          {categories.map((cat) => (
            <MobileCategoryItem key={cat._id} cat={cat} />
          ))}
        </section>
      )}
    </main>
  )
}
