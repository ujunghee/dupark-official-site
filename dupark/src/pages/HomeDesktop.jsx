import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { client, urlFor } from '../lib/sanity'
import { lenis } from '../lib/lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './Home.css'

/** 카테고리 카드용 — 이미지 우선, 없으면 영상 폴백 (Home.css `.category-card-img > img` 스타일을 그대로 따름) */
function CardMedia({ image, videoUrl, alt, hidden }) {
  const style = hidden ? { opacity: 0 } : { opacity: 1 }
  if (image) {
    return <img src={urlFor(image).width(700).url()} alt={alt} style={style} />
  }
  if (videoUrl) {
    return (
      <video
        src={videoUrl}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={alt}
        style={style}
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
            alt={cat.title}
            hidden={hovered && hasHover}
          />
        )}
        {hasHover && (
          <CardMedia
            image={cat.hoverImage}
            videoUrl={cat.hoverVideoUrl}
            alt={cat.title}
            hidden={!hovered}
          />
        )}
      </div>
    </Link>
  )
}

/** 데스크톱 전용 홈 (`/` + viewport &gt; 768) */
export default function HomeDesktop() {
  const horizontalRef = useRef(null)
  const trackRef      = useRef(null)
  const ctxRef        = useRef(null)
  const logoRef       = useRef(null)
  const videoRef      = useRef(null)
  const spacerRef     = useRef(null)
  const [categories,   setCategories]   = useState([])
  const [videoSrc,     setVideoSrc]     = useState(null)
  const [videoPoster,  setVideoPoster]  = useState(null)
  const [hideIntro, setHideIntro] = useState(false)

  useEffect(() => {
    client.fetch(
      `*[_type == "category"] | order(coalesce(order, 0) desc, _createdAt desc){
        _id, title, slug, coverImage, hoverImage,
        "coverVideoUrl": coverVideo.asset->url,
        "hoverVideoUrl": hoverVideo.asset->url
      }`
    ).then(setCategories)
  }, [])

  useEffect(() => {
    client
      .fetch(`*[_type == "siteSettings"][0]{ "videoUrl": introVideo.asset->url, "posterUrl": introVideoPoster.asset->url }`)
      .then((data) => {
        if (data?.videoUrl)  setVideoSrc(data.videoUrl)
        if (data?.posterUrl) setVideoPoster(data.posterUrl)
      })
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoSrc) return

    let cancelled = false

    const tryPlay = () => {
      if (cancelled) return
      video.muted = true
      void video.play().catch(() => {})
    }

    const onMediaReady = () => {
      if (cancelled) return
      video.removeEventListener('canplay', onMediaReady)
      video.removeEventListener('loadeddata', onMediaReady)
      tryPlay()
    }

    const armPlayback = () => {
      if (cancelled) return
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        queueMicrotask(tryPlay)
      } else {
        video.addEventListener('canplay', onMediaReady)
        video.addEventListener('loadeddata', onMediaReady)
      }
    }

    const loaderActive = !sessionStorage.getItem('dupark_loaded')
    if (!loaderActive) {
      queueMicrotask(() => armPlayback())
      return () => {
        cancelled = true
        video.removeEventListener('canplay', onMediaReady)
        video.removeEventListener('loadeddata', onMediaReady)
      }
    }

    const onLoaderComplete = () => armPlayback()
    window.addEventListener('loaderComplete', onLoaderComplete, { once: true })
    return () => {
      cancelled = true
      window.removeEventListener('loaderComplete', onLoaderComplete)
      video.removeEventListener('canplay', onMediaReady)
      video.removeEventListener('loadeddata', onMediaReady)
    }
  }, [videoSrc])

  useEffect(() => {
    window.scrollTo(0, 0)
    lenis.scrollTo(0, { immediate: true, force: true })
  }, [])

  useEffect(() => {
    if (!logoRef.current) return
    const tween = gsap.fromTo(
      logoRef.current,
      { yPercent: 100 },
      { yPercent: 0, duration: 2.4, ease: 'power4.out', delay: 0.6 }
    )
    return () => tween.kill()
  }, [])

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
  }, [hideIntro])

  useEffect(() => {
    let isSnapping = false
    const SWIPE_TRIGGER_PX = 24

    const getDownSnapTarget = () => window.innerHeight

    const SNAP_DURATION_DESKTOP = 1.5

    const isReducedMotion = () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const snapTo = (target, { onDone, duration } = {}) => {
      isSnapping = true
      /* 모션 줄이기(prefers-reduced-motion) 켜진 사용자에겐 1.5초 자동 스크롤 → 즉시 이동 */
      if (isReducedMotion()) {
        lenis.scrollTo(target, { immediate: true, force: true, lock: true })
        isSnapping = false
        lenis.start()
        onDone?.()
        return
      }
      lenis.scrollTo(target, {
        duration: duration ?? SNAP_DURATION_DESKTOP,
        easing: 'power3.out',
        lock: true,
        onComplete: () => {
          isSnapping = false
          lenis.start()
          onDone?.()
        },
      })
    }

    const finalizeSnap = () => {
      setHideIntro(true)
    }

    const onWheel = (e) => {
      if (isSnapping) return
      if (hideIntro) return
      const scroll = lenis.scroll
      const downTarget = getDownSnapTarget()
      if (scroll < downTarget && e.deltaY > 0) {
        snapTo(downTarget, { onDone: finalizeSnap })
      }
    }

    /* 키보드/스크린리더 사용자가 스킵 링크로 인트로 통째로 건너뛰기 */
    const onSkipToMain = () => {
      if (hideIntro) return
      snapTo(getDownSnapTarget(), { onDone: finalizeSnap, duration: 0 })
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

      if (scroll < downTarget && diff > 0) {
        snapTo(downTarget, { onDone: finalizeSnap })
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('skipToMain', onSkipToMain)

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('skipToMain', onSkipToMain)
    }
  }, [hideIntro])

  useEffect(() => {
    const onScroll = () => {
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
  }, [categories.length])

  useLayoutEffect(() => {
    if (hideIntro) document.body.classList.add('dupark-home-content')
    else document.body.classList.remove('dupark-home-content')
    return () => document.body.classList.remove('dupark-home-content')
  }, [hideIntro])

  useEffect(() => {
    if (!hideIntro) return
    let isClamping = false
    const clamp = () => {
      if (isClamping) return
      const target = window.innerHeight
      if (lenis.scroll < target - 0.5) {
        isClamping = true
        lenis.scrollTo(target, { immediate: true, force: true, lock: true })
        isClamping = false
      }
    }
    lenis.on('scroll', clamp)
    clamp()
    return () => lenis.off('scroll', clamp)
  }, [hideIntro])

  useLayoutEffect(() => {
    if (!hideIntro) return
    lenis.resize()
    ScrollTrigger.refresh()
  }, [hideIntro])

  useLayoutEffect(() => {
    if (ctxRef.current) { ctxRef.current.revert(); ctxRef.current = null }
    if (categories.length === 0) return

    const horizontal = horizontalRef.current
    const track      = trackRef.current
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
    }
  }, [categories])

  return (
    <main id="main-content" tabIndex={-1}>
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
          muted loop playsInline
          preload="auto"
          poster={videoPoster || undefined}
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
        >
          {videoSrc && <source src={videoSrc} type="video/mp4" />}
        </video>
      </div>

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
          style={{
            display: 'block',
            width: 'auto',
            height: 'clamp(3.25rem, 24vw, 7.5rem)',
            maxWidth: 'min(90vw, 20rem)',
            objectFit: 'contain',
            userSelect: 'none',
          }}
        />
      </div>

      <div
        ref={spacerRef}
        style={{
          height: '100vh',
          position: 'relative',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      <section ref={horizontalRef} className="h-scroll-section">
        <div ref={trackRef} className="h-scroll-track">
          {categories.map((cat) => (
            <CategoryCard key={cat._id} cat={cat} />
          ))}
        </div>
      </section>
    </main>
  )
}
