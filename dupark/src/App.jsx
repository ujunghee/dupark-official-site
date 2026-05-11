import { useState, useCallback, useEffect, useLayoutEffect, useRef, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { lenis } from './lib/lenis'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { RouteEnterProvider } from './context/RouteEnterContext'
import { IntroMediaProvider, useIntroMedia } from './context/IntroMediaContext'
import Header from './component/header'
import Footer from './component/footer'
import Home from './pages/Home'
import HomeMobileGrid from './pages/HomeMobileGrid'
import Category from './pages/Category'
import ProjectDetail from './pages/ProjectDetail'
import Loader from './component/Loader'

const About = lazy(() => import('./pages/About'))

/** 미디어 위 우클릭·드래그 저장 완화 (devtools 단축키는 막지 않음) */
function useImageDownloadGuard() {
  useEffect(() => {
    const isMediaTarget = (el) => {
      if (!el || !el.closest) return false
      return Boolean(el.closest('img, picture, svg, video, canvas'))
    }

    const onContextMenu = (e) => {
      if (isMediaTarget(e.target)) e.preventDefault()
    }

    const onDragStart = (e) => {
      if (isMediaTarget(e.target)) e.preventDefault()
    }

    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('dragstart', onDragStart)
    return () => {
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('dragstart', onDragStart)
    }
  }, [])
}

/** 라우트·새로고침마다 세로 스크롤 맨 위 — 브라우저 복원 끈 뒤 Lenis·네이티브 동기화 */
function ScrollToTop() {
  const { pathname, key } = useLocation()
  useLayoutEffect(() => {
    lenis.start()
    lenis.scrollTo(0, { immediate: true, force: true })
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    lenis.resize()
    const id = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => cancelAnimationFrame(id)
  }, [pathname, key])
  return null
}

function CustomScrollbar() {
  const barRef   = useRef(null)
  const thumbRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    const bar   = barRef.current
    const thumb = thumbRef.current
    if (!bar || !thumb) return

    const update = () => {
      const scrollTop    = window.scrollY
      const docHeight    = document.documentElement.scrollHeight - window.innerHeight
      const scrollRatio  = docHeight > 0 ? scrollTop / docHeight : 0
      const thumbH       = Math.max(40, (window.innerHeight / document.documentElement.scrollHeight) * window.innerHeight)
      const maxTop       = window.innerHeight - thumbH

      thumb.style.height = `${thumbH}px`
      thumb.style.top    = `${scrollRatio * maxTop}px`

      bar.classList.add('active')
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => bar.classList.remove('active'), 1000)
    }

    window.addEventListener('scroll', update, { passive: true })
    return () => {
      window.removeEventListener('scroll', update)
      clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div ref={barRef} className="custom-scrollbar">
      <div ref={thumbRef} className="custom-scrollbar-thumb" />
    </div>
  )
}

function AppShell() {
  useImageDownloadGuard()
  return (
    <>
      <CustomScrollbar />
      <Header />
      <RouteEnterProvider>
        <Routes>
          {/* 구글·구 Wix 등에서 /home 으로 인덱싱된 링크 — Vercel 301 없을 때도 `/:category` 오매칭 방지 */}
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/HOME" element={<Navigate to="/" replace />} />
          <Route path="/m" element={<HomeMobileGrid />} />
          <Route path="/" element={<Home />} />
          <Route
            path="/about"
            element={(
              <Suspense
                fallback={<div className="about-route-suspense-fallback" aria-hidden />}
              >
                <About />
              </Suspense>
            )}
          />
          <Route path="/:category" element={<Category />} />
          <Route path="/:category/:id" element={<ProjectDetail />} />
        </Routes>
      </RouteEnterProvider>
      <Footer />
    </>
  )
}

/** useIntroMedia 구독용 — 로더만 */
function LoaderManager() {
  const [loading, setLoading] = useState(() => !sessionStorage.getItem('dupark_loaded'))
  const { videoUrl } = useIntroMedia()

  useEffect(() => {
    const onLoaderComplete = () => {
      try {
        sessionStorage.setItem('dupark_loaded', '1')
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('loaderComplete', onLoaderComplete)
    return () => window.removeEventListener('loaderComplete', onLoaderComplete)
  }, [])

  const handleLoaderComplete = useCallback(() => {
    setLoading(false)
  }, [])

  if (!loading) return null
  return <Loader onComplete={handleLoaderComplete} waitForUrl={videoUrl} />
}

function App() {
  return (
    <BrowserRouter>
      <IntroMediaProvider>
        <ScrollToTop />
        <SkipLink />
        <LoaderManager />
        <AppShell />
      </IntroMediaProvider>
    </BrowserRouter>
  )
}

/** 스킵 링크: main 포커스 / 홈은 skipToMain */
function SkipLink() {
  const handleClick = (e) => {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('skipToMain'))
    requestAnimationFrame(() => {
      const main = document.getElementById('main-content') || document.querySelector('main')
      if (!main) return
      if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1')
      main.focus({ preventScroll: false })
    })
  }
  return (
    <a href="#main-content" className="dupark-skip-link" onClick={handleClick}>
      메인으로 바로가기
    </a>
  )
}

export default App
