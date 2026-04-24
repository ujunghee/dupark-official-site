import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { client, urlFor } from '../lib/sanity'
import { lenis } from '../lib/lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const MOBILE_BREAKPOINT = 768

function MobileCategoryItem({ cat }) {
  const navigate = useNavigate()
  return (
    <div
      onClick={() => navigate(`/${cat.slug}`)}
      style={{
        position: 'relative',
        width: '100%',
        height: '56vw',
        overflow: 'hidden',
        cursor: 'pointer',
        borderBottom: '1px solid #222',
      }}
    >
      {cat.coverImage
        ? <img src={urlFor(cat.coverImage).width(800).url()} alt={cat.title}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        : <div style={{ position: 'absolute', inset: 0, background: '#111' }} />
      }
      <div style={{
        position: 'absolute', bottom: '1.2rem', left: '1.2rem',
        color: '#fff', fontSize: '0.75rem', fontWeight: 700,
        letterSpacing: '0.1em', mixBlendMode: 'difference',
      }}>
        {cat.title}
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
      style={{ flexShrink: 0, width: '36vw', cursor: 'pointer' }}
    >
      <div style={{
        fontSize: '0.7rem', fontWeight: 700,
        letterSpacing: '0.08em', color: '#000',
        marginBottom: '0.6rem', userSelect: 'none',
      }}>
        {cat.title}
      </div>

      <div style={{
        width: '100%', aspectRatio: '3/4',
        position: 'relative', overflow: 'hidden', background: '#111',
      }}>
        {cat.coverImage && (
          <img src={urlFor(cat.coverImage).width(700).url()} alt={cat.title}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', transition: 'opacity 0.5s ease',
              opacity: hovered && cat.hoverImage ? 0 : 1,
            }} />
        )}
        {cat.hoverImage && (
          <img src={urlFor(cat.hoverImage).width(700).url()} alt={cat.title}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', transition: 'opacity 0.5s ease',
              opacity: hovered ? 1 : 0,
            }} />
        )}
      </div>
    </div>
  )
}

export default function Home() {
  const horizontalRef = useRef(null)
  const trackRef      = useRef(null)
  const ctxRef        = useRef(null)
  const [categories,   setCategories]   = useState([])
  const [isMobile,     setIsMobile]     = useState(() => window.innerWidth <= MOBILE_BREAKPOINT)
  const [videoSrc,     setVideoSrc]     = useState(null)
  const [videoPoster,  setVideoPoster]  = useState(null)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    const handler = (e) => setIsMobile(e.matches)
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

  // ── 비디오 구간 → 컨텐츠 섹션 스냅 ──
  useEffect(() => {
    if (isMobile) return
    let isSnapping = false
    // power4 out: 처음엔 빠르게, 끝에서 아주 부드럽게 안착
    const ease = (t) => 1 - Math.pow(1 - t, 4)

    const onWheel = (e) => {
      if (isSnapping) return
      const vh     = window.innerHeight
      const scroll = lenis.scroll

      if (scroll < vh && e.deltaY > 0) {
        isSnapping = true
        lenis.scrollTo(vh, {
          duration: 1.6,
          easing: ease,
          lock: true,
          onComplete: () => { isSnapping = false },
        })
      } else if (scroll > 0 && scroll <= vh && e.deltaY < 0) {
        isSnapping = true
        lenis.scrollTo(0, {
          duration: 1.6,
          easing: ease,
          lock: true,
          onComplete: () => { isSnapping = false },
        })
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [isMobile])

  // ── 가로 스크롤 GSAP ──
  useEffect(() => {
    if (ctxRef.current) { ctxRef.current.revert(); ctxRef.current = null }
    if (categories.length === 0 || isMobile) return

    const horizontal = horizontalRef.current
    const track      = trackRef.current
    if (!horizontal || !track) return

    ctxRef.current = gsap.context(() => {
      const totalWidth = track.scrollWidth - horizontal.clientWidth
      const cards = Array.from(track.querySelectorAll('.category-card'))

      // 카드 초기 상태: 아래에서 시작
      gsap.set(cards, { y: 60, opacity: 0 })

      // 섹션 진입 시 카드 아래 → 위로 등장 (1회)
      ScrollTrigger.create({
        trigger: horizontal,
        start: 'top 90%',
        once: true,
        onEnter: () => {
          gsap.to(cards, { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: 'power3.out' })
        },
      })

      // 가로 스크롤
      gsap.to(track, {
        x: -totalWidth,
        ease: 'none',
        scrollTrigger: {
          trigger: horizontal,
          start: 'top top',
          end: () => `+=${totalWidth}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })
    })

    return () => { ctxRef.current?.revert(); ctxRef.current = null }
  }, [categories, isMobile])

  return (
    <main>
      {/* ── 배경 비디오: fixed로 깔아두기 ── */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw', height: '100vh',
        zIndex: -1,
        background: '#000',
        overflow: 'hidden',
      }}>
        <video
          autoPlay muted loop playsInline
          poster={videoPoster || undefined}
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
        >
          {videoSrc && <source src={videoSrc} type="video/mp4" />}
        </video>

        {/* 스크롤 힌트 */}
        <div style={{
          position: 'absolute', bottom: '2rem', left: '50%',
          transform: 'translateX(-50%)',
          color: '#fff', fontSize: '0.65rem', letterSpacing: '0.35em', opacity: 0.55,
          userSelect: 'none',
        }}>
          SCROLL
        </div>
      </div>

      {/* ── 100vh 스페이서: 비디오 구간 스크롤 공간 ── */}
      <div style={{ height: '100vh', position: 'relative', zIndex: 1, pointerEvents: 'none' }} />

      {/* ── 데스크탑: 가로 스크롤 섹션 (비디오 위로 올라옴) ── */}
      {!isMobile && (
        <section
          ref={horizontalRef}
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100vw',
            height: '100svh',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            background: '#fff',
          }}
        >
          <div
            ref={trackRef}
            style={{
              display: 'flex',
              gap: '1.25rem',
              paddingLeft: '2rem',
              paddingRight: '2rem',
              paddingTop: '4.5rem',
              alignItems: 'flex-start',
              willChange: 'transform',
            }}
          >
            {categories.map((cat) => (
              <CategoryCard key={cat._id} cat={cat} />
            ))}
          </div>
        </section>
      )}

      {/* ── 모바일: 세로 카테고리 목록 ── */}
      {isMobile && (
        <section style={{ position: 'relative', zIndex: 1, width: '100vw', background: '#fff' }}>
          {categories.map((cat) => (
            <MobileCategoryItem key={cat._id} cat={cat} />
          ))}
        </section>
      )}
    </main>
  )
}