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
  /* 모바일: 그리드가 상단에 붙을 때 / 데스크톱: 가로섹션이 상단에 붙을 때 — 인트로 영상·로고·100vh 제거 */
  const [hideIntro, setHideIntro] = useState(false)

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
    lenis.scrollTo(0, { immediate: true, force: true })
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

  // ── 비디오 스크롤 줌 (모바일+컨텐츠전환 시 스페이서 0 → ST 비활성) ──
  useEffect(() => {
    if (!videoRef.current || !spacerRef.current) return
    if (hideIntro) return
    const tween = gsap.fromTo(
      videoRef.current,
      { scale: 1 },
      {
        scale: 3,
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
  }, [isMobile, hideIntro])

  // ── 비디오 구간 → 컨텐츠 섹션 스냅 ──
  useEffect(() => {
    let isSnapping = false
    // 모바일은 작은 입력에도 즉시 스냅, 데스크톱은 약간 큰 임계값으로 안정성 확보
    const SWIPE_TRIGGER_PX = isMobile ? 8 : 24

    // 다운 스냅 타깃 계산
    //  · 모바일: .mobile-grid-section.offsetTop (passive touch로 lenis.scroll이 늦어도 정확)
    //  · PC: 스페이서가 항상 100vh이므로 window.innerHeight 사용
    //        (가로 섹션은 GSAP pin-spacer로 래핑돼 offsetTop이 0이 될 수 있어 신뢰 X
    //         → 잘못된 타깃으로 스냅이 거의 안 움직여 컨텐츠가 100% 안 차는 버그 방지)
    const getDownSnapTarget = () => {
      if (isMobile) {
        const mobileEl = document.querySelector('.mobile-grid-section')
        if (mobileEl) return mobileEl.offsetTop
      } else {
        return window.innerHeight
      }
      if (spacerRef.current) {
        return spacerRef.current.offsetTop + spacerRef.current.offsetHeight
      }
      return window.innerHeight
    }

    // 모바일/PC 각각 다른 duration 적용 (값만 바꾸면 됨)
    // PC는 휠 한 번에 컨텐츠가 "한 번에" 올라오도록 짧게 — 점진 줌 인상을 주지 않음
    const SNAP_DURATION_MOBILE = 1.0
    const SNAP_DURATION_DESKTOP = 1.8

    const snapTo = (target, { onDone, duration } = {}) => {
      isSnapping = true
      lenis.scrollTo(target, {
        duration: duration ?? (isMobile ? SNAP_DURATION_MOBILE : SNAP_DURATION_DESKTOP),
        easing: 'power3.out',
        lock: true,
        onComplete: () => {
          isSnapping = false
          lenis.start()
          onDone?.()
        },
      })
    }

    const onWheel = (e) => {
      if (isSnapping) return
      if (hideIntro) return
      const scroll = lenis.scroll
      const downTarget = getDownSnapTarget()
      // 다운 스냅 — 비디오 → 컨텐츠 한 번에 올라옴 (PC + Mobile 공통, 단방향)
      if (scroll < downTarget && e.deltaY > 0) {
        snapTo(downTarget, { onDone: () => setHideIntro(true) })
      }
    }

    let touchStartY = 0
    const onTouchStart = (e) => { touchStartY = e.touches[0].clientY }
    const onTouchEnd = (e) => {
      if (isSnapping) return
      if (hideIntro) return
      const scroll = lenis.scroll
      const diff   = touchStartY - e.changedTouches[0].clientY

      if (Math.abs(diff) < SWIPE_TRIGGER_PX) return

      const downTarget = getDownSnapTarget()

      // 다운 스냅 — 비디오 → 컨텐츠 (공통, 단방향)
      if (scroll < downTarget && diff > 0) {
        snapTo(downTarget, { onDone: () => setHideIntro(true) })
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [isMobile, hideIntro])

  // ── 인트로 제거 트리거 (PC/모바일 공통: 단방향) ──
  //  · 모바일: 그리드 상단이 뷰 상단에 닿으면 한 번만 true (그 후 클램프로 영상 영역 복귀 차단)
  //  · 데스크톱: 가로 섹션 상단 도달 시 한 번만 true (그 후 클램프로 영상 영역 복귀 차단)
  useEffect(() => {
    const onScroll = () => {
      if (isMobile) {
        const mobileSection = document.querySelector('.mobile-grid-section')
        if (!mobileSection) return
        if (mobileSection.getBoundingClientRect().top <= 0) {
          setHideIntro((prev) => prev || true)
        }
        return
      }

      // PC: 한 번 true가 되면 유지 (가로 스크롤로 들어간 뒤엔 영상 영역으로 복귀 X)
      const scrollY = lenis.scroll ?? window.scrollY
      if (scrollY >= window.innerHeight - 1) {
        setHideIntro((prev) => prev || true)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    lenis.on('scroll', onScroll)
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      lenis.off('scroll', onScroll)
    }
  }, [isMobile, categories.length])

  // Header: 인트로(영상) 끝난 뒤엔 scroll 0이어도 "영상 풀브리딩"으로 보지 않게 함
  useLayoutEffect(() => {
    if (hideIntro) document.body.classList.add('dupark-home-content')
    else document.body.classList.remove('dupark-home-content')
    return () => document.body.classList.remove('dupark-home-content')
  }, [hideIntro])

  // PC/모바일 공통: hideIntro=true 이후 스크롤이 인트로 영역으로 못 돌아가게 클램프
  //  · PC: 가로 스크롤 맨 앞에서 위로 올려도 영상 다시 노출/백지 방지 — 즉시 클램프
  //  · 모바일: 터치 모멘텀으로 위로 살짝 넘어갔을 때 짧은 스냅백으로 부드럽게 복귀 (툭 끊기는 느낌 제거)
  useEffect(() => {
    if (!hideIntro) return
    let isClamping = false
    const clamp = () => {
      if (isClamping) return
      const target = isMobile
        ? document.querySelector('.mobile-grid-section')?.offsetTop ?? window.innerHeight
        : window.innerHeight
      if (lenis.scroll < target - 0.5) {
        if (isMobile) {
          isClamping = true
          lenis.scrollTo(target, {
            duration: 0.55,
            easing: (t) => 1 - Math.pow(1 - t, 3),
            force: true,
            lock: true,
            onComplete: () => {
              isClamping = false
            },
          })
        } else {
          lenis.scrollTo(target, { immediate: true, force: true, lock: true })
        }
      }
    }
    lenis.on('scroll', clamp)
    clamp()
    return () => lenis.off('scroll', clamp)
  }, [isMobile, hideIntro])

  // 모바일/데스크톱 공통: hideIntro 변화 시 Lenis 한도 갱신
  // (스페이서를 더 이상 축소하지 않으므로 강제 scrollTo 없이 resize만 수행 — "툭" 점프 방지)
  useLayoutEffect(() => {
    if (!hideIntro) return
    lenis.resize()
    ScrollTrigger.refresh()
  }, [hideIntro, isMobile])

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
        display: hideIntro ? 'none' : 'block',
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
        display: hideIntro ? 'none' : 'block',
      }}>
        <img
          ref={logoRef}
          src="/logo-white.svg"
          alt="DUPARK"
          style={{ height: '3.5rem', width: 'auto', display: 'block', userSelect: 'none' }}
        />
      </div>

      {/* ── 인트로 스페이서 ── */}
      {/* 모바일은 svh(URL바 고려), PC는 vh. 레이아웃 점프 방지 위해 양쪽 모두 항상 유지 */}
      <div
        ref={spacerRef}
        style={{
          height: isMobile ? '100svh' : '100vh',
          position: 'relative',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

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
