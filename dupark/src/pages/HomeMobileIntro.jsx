import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { client } from '../lib/sanity'
import { lenis } from '../lib/lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './Home.css'

/**
 * 모바일 전용 인트로만 (`/` + ≤768).
 * 터치/휠 스냅으로 한 뷰포트 아래로 내린 뒤 `/m` 으로 replace 이동 — 그리드·클램프·hideIntro 는 `/m` 페이지에서만 처리.
 */
export default function HomeMobileIntro() {
  const navigate      = useNavigate()
  const logoRef       = useRef(null)
  const videoRef      = useRef(null)
  const spacerRef     = useRef(null)
  const [videoSrc,    setVideoSrc]    = useState(null)
  const [videoPoster, setVideoPoster] = useState(null)

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

    const tryPlay = () => {
      const p = video.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    }

    const loaderActive = !sessionStorage.getItem('dupark_loaded')
    if (!loaderActive) {
      tryPlay()
      return
    }

    const onLoaderComplete = () => tryPlay()
    window.addEventListener('loaderComplete', onLoaderComplete, { once: true })
    return () => window.removeEventListener('loaderComplete', onLoaderComplete)
  }, [videoSrc])

  useEffect(() => {
    window.scrollTo(0, 0)
    lenis.scrollTo(0, { immediate: true, force: true })
  }, [])

  /* 스크롤 연장 레이아웃 반영 후 Lenis·ST 최대 스크롤 갱신 */
  useLayoutEffect(() => {
    lenis.resize()
    ScrollTrigger.refresh()
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
  }, [])

  useEffect(() => {
    let isSnapping = false
    const SWIPE_TRIGGER_PX = 8
    const getDownSnapTarget = () => window.innerHeight
    /* 스냅: 조금 길게 + ease-out 끝을 부드럽게 (power3.out 은 후반 감속이 딱 끊기는 느낌) */
    const SNAP_DURATION_MOBILE = 1.42
    /** ease-out quint — 끝 구간이 더 길게 풀림 */
    const snapEaseOut = (t) => 1 - Math.pow(1 - t, 5)

    const snapTo = (target, { onDone, duration } = {}) => {
      isSnapping = true
      lenis.scrollTo(target, {
        duration: duration ?? SNAP_DURATION_MOBILE,
        easing: snapEaseOut,
        lock: true,
        onComplete: () => {
          isSnapping = false
          lenis.start()
          onDone?.()
        },
      })
    }

    const finalizeSnap = () => {
      /* 인트로에서만 허용 — HomeMobileGrid 가 state 없으면 `/` 로 되돌림 */
      navigate('/m', { replace: true, state: { fromIntro: true } })
    }

    const onWheel = (e) => {
      if (isSnapping) return
      const scroll = lenis.scroll
      const downTarget = getDownSnapTarget()
      if (scroll < downTarget && e.deltaY > 0) {
        snapTo(downTarget, { onDone: finalizeSnap })
      }
    }

    let touchStartY = 0
    const onTouchStart = (e) => { touchStartY = e.touches[0].clientY }
    const onTouchEnd = (e) => {
      if (isSnapping) return
      const scroll = lenis.scroll
      const diff   = touchStartY - e.changedTouches[0].clientY

      if (Math.abs(diff) < SWIPE_TRIGGER_PX) return

      const downTarget = getDownSnapTarget()
      if (scroll < downTarget && diff > 0) {
        snapTo(downTarget, { onDone: finalizeSnap })
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true, capture: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true, capture: true })

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart, true)
      window.removeEventListener('touchend', onTouchEnd, true)
    }
  }, [navigate])

  return (
    <main
      style={{
        /* Lenis/브라우저가 세로 스크롤 가능해야 터치→스냅이 먹음. 예전엔 그리드가 아래에 있어 높이가 났음 */
        touchAction: 'pan-y',
      }}
    >
      <div style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw', height: '100vh',
        zIndex: -1,
        background: '#000',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        <video
          ref={videoRef}
          muted loop playsInline
          preload="auto"
          poster={videoPoster || undefined}
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85, pointerEvents: 'none' }}
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
        pointerEvents: 'none',
      }}>
        <img
          ref={logoRef}
          src="/logo-white.svg"
          alt="DUPARK"
          style={{ height: '3.5rem', width: 'clamp(4.5rem, 15vw, 8vw)', display: 'block', userSelect: 'none' }}
        />
      </div>

      <div
        ref={spacerRef}
        style={{
          height: '100svh',
          position: 'relative',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
      {/* 스크롤 가능 높이 확보 — 없으면 scrollHeight≈뷰포트라 터치 스크롤·Lenis 스냅이 안 도는 경우가 많음 */}
      <div
        aria-hidden
        style={{
          height: '85vh',
          width: '100%',
          pointerEvents: 'none',
        }}
      />
    </main>
  )
}
