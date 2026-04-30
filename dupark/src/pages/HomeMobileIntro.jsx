import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { client } from '../lib/sanity'
import { DUPARK_M_SPA_OK } from '../lib/mobileGridSession'
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
  const whiteRiseRef  = useRef(null)
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

    let cancelled = false
    let kickTid = 0

    const tryPlay = () => {
      if (cancelled) return
      video.muted = true
      void video.play().catch(() => {})
    }

    /* `<source>` 반영 직후엔 readyState=0 인 채로 play()만 호출하면 거절되고(조용히 catch),
       새로고침·dupark_loaded 있음(로더 없음)일 때 특히 자주 남 */
    const onMediaReady = () => {
      if (cancelled) return
      video.removeEventListener('canplay', onMediaReady)
      video.removeEventListener('loadeddata', onMediaReady)
      tryPlay()
    }

    const armPlayback = () => {
      if (cancelled) return
      if (kickTid) window.clearTimeout(kickTid)
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        queueMicrotask(tryPlay)
      } else {
        video.addEventListener('canplay', onMediaReady)
        video.addEventListener('loadeddata', onMediaReady)
      }
      /* canplay 이 늦거나 iOS 등에서 한 번 더 */
      kickTid = window.setTimeout(() => {
        kickTid = 0
        if (cancelled || video.readyState === 0) return
        if (video.paused) tryPlay()
      }, 400)
    }

    const cleanupMedia = () => {
      cancelled = true
      if (kickTid) window.clearTimeout(kickTid)
      video.removeEventListener('canplay', onMediaReady)
      video.removeEventListener('loadeddata', onMediaReady)
    }

    const loaderActive = !sessionStorage.getItem('dupark_loaded')
    if (!loaderActive) {
      queueMicrotask(() => armPlayback())
      return cleanupMedia
    }

    const onLoaderComplete = () => armPlayback()
    window.addEventListener('loaderComplete', onLoaderComplete, { once: true })
    return () => {
      window.removeEventListener('loaderComplete', onLoaderComplete)
      cleanupMedia()
    }
  }, [videoSrc])

  /* 스크롤 연장: 푸터 숨김 후에도 Lenis·ST에 최소 스크롤 거리 확보 (과도하면 빈 하단만 길어짐)
     Lenis 스크롤이 `/m` 등에서 남은 채로 ST가 먼저 잡히면 scrub 이 scale(3) 근처로 밀려 영상이 통째로 잘려 “안 나온다”처럼 보일 수 있음 → 레이아웃 단계에서 먼저 0 정렬 */
  useLayoutEffect(() => {
    lenis.scrollTo(0, { immediate: true, force: true })
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    document.body.classList.add('dupark-mobile-intro-hero')
    lenis.resize()
    const rafIntro = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => {
      cancelAnimationFrame(rafIntro)
      document.body.classList.remove('dupark-mobile-intro-hero')
      lenis.resize()
      requestAnimationFrame(() => ScrollTrigger.refresh())
    }
  }, [])

  /* ScrollTrigger 스크럽: Lenis 0 정렬 직후 같은 레이아웃 패스에서 붙여야 첫 스크럽 값이 안정적 */
  useLayoutEffect(() => {
    const video = videoRef.current
    const spacer = spacerRef.current
    if (!video || !spacer) return

    gsap.set(video, { scale: 1 })
    const tween = gsap.fromTo(
      video,
      { scale: 1 },
      {
        scale: 3,
        ease: 'none',
        scrollTrigger: {
          scroller: document.documentElement,
          trigger: spacer,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
          invalidateOnRefresh: true,
        },
      }
    )
    const raf = requestAnimationFrame(() => {
      ScrollTrigger.refresh()
    })
    return () => {
      cancelAnimationFrame(raf)
      tween.kill()
      gsap.set(video, { clearProps: 'transform' })
    }
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

  /* bfcache 복원 시 비디오는 pause 된 채로 남는 경우가 많음 */
  useEffect(() => {
    const onPageShow = (e) => {
      if (!e.persisted) return
      lenis.scrollTo(0, { immediate: true, force: true })
      window.scrollTo(0, 0)
      const v = videoRef.current
      if (v) {
        v.muted = true
        void v.play().catch(() => {})
      }
      ScrollTrigger.refresh()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  useEffect(() => {
    let isSnapping = false
    const SWIPE_TRIGGER_PX = 8
    const getDownSnapTarget = () => window.innerHeight
    /* 터치 후 첫 화면→다음 뷰 스냅(영상 줌 구간)만 짧게 — 백지 올라오는 속도는 Home.css 전환 길이 */
    const SNAP_DURATION_MOBILE = 0.55
    /** ease-out quint — 끝 구간이 더 길게 풀림 */
    const snapEaseOut = (t) => 1 - Math.pow(1 - t, 5)

    const isReducedMotion = () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const snapTo = (target, { onDone, duration } = {}) => {
      isSnapping = true
      /* 모션 줄이기 사용자: 즉시 이동 */
      if (isReducedMotion()) {
        lenis.scrollTo(target, { immediate: true, force: true, lock: true })
        isSnapping = false
        lenis.start()
        onDone?.()
        return
      }
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

    const goToMobileGrid = () => {
      try {
        sessionStorage.setItem(DUPARK_M_SPA_OK, '1')
      } catch {
        /* ignore */
      }
      navigate('/m', { replace: true, state: { fromIntro: true } })
    }

    /** Lenis 스냅 끝난 뒤: 흰 백지가 아래→위로 100% 덮음 → 그 다음 `/m` + (그리드 쪽) opacity 페이드 */
    const finalizeSnap = () => {
      const reduce = typeof window !== 'undefined'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduce) {
        goToMobileGrid()
        return
      }
      const el = whiteRiseRef.current
      if (!el) {
        goToMobileGrid()
        return
      }
      const fallbackMs = 1100
      let t
      const onEnd = (e) => {
        if (e.propertyName !== 'transform') return
        window.clearTimeout(t)
        el.removeEventListener('transitionend', onEnd)
        goToMobileGrid()
      }
      t = window.setTimeout(() => {
        el.removeEventListener('transitionend', onEnd)
        goToMobileGrid()
      }, fallbackMs)
      el.addEventListener('transitionend', onEnd)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.classList.add('home-mobile-intro-white-rise--active')
        })
      })
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

    /* 키보드/스크린리더 사용자가 스킵 링크로 인트로 통째로 건너뛰기 → /m 으로 즉시 */
    const onSkipToMain = () => {
      if (isSnapping) return
      snapTo(getDownSnapTarget(), { onDone: finalizeSnap, duration: 0 })
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true, capture: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true, capture: true })
    window.addEventListener('skipToMain', onSkipToMain)

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart, true)
      window.removeEventListener('touchend', onTouchEnd, true)
      window.removeEventListener('skipToMain', onSkipToMain)
    }
  }, [navigate])

  return (
    <main
      id="main-content"
      tabIndex={-1}
      style={{
        /* Lenis/브라우저가 세로 스크롤 가능해야 터치→스냅이 먹음. 예전엔 그리드가 아래에 있어 높이가 났음 */
        touchAction: 'pan-y',
        /* z-index 음수 고정 레이어는 body 배경(--site-bg) 뒤로 깔려 새로고침·브라우저마다 영상만 안 보일 수 있음 */
        position: 'relative',
        zIndex: 0,
        isolation: 'isolate',
      }}
    >
      <div style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw', height: '100vh',
        zIndex: 0,
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
          style={{
            display: 'block',
            width: 'auto',
            height: 'clamp(2rem, 11vw, 3.25rem)',
            maxWidth: 'min(88vw, 17.5rem)',
            objectFit: 'contain',
            userSelect: 'none',
          }}
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
      {/* 스크롤 최소 연장 — 푸터는 body 클래스로 숨김 */}
      <div
        aria-hidden
        style={{
          height: '55vh',
          width: '100%',
          pointerEvents: 'none',
        }}
      />
      {/* 스냅 완료 후: 아래에서 올라오는 흰 백지 → 끝나면 `/m` 전환 (그리드는 opacity 페이드) */}
      <div
        ref={whiteRiseRef}
        className="home-mobile-intro-white-rise"
        aria-hidden
      />
    </main>
  )
}
