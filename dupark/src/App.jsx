import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { RouteEnterProvider } from './context/RouteEnterContext'
import { client, urlFor } from './lib/sanity'
import Header from './component/header'
import Footer from './component/footer'
import Home from './pages/Home'
import HomeMobileGrid from './pages/HomeMobileGrid'
import Category from './pages/Category'
import ProjectDetail from './pages/ProjectDetail'
import Loader from './component/Loader'

/** Sanity siteSettings에서 색상·로고 높이·메타 fetch → :root CSS 변수 + head 태그 주입 */
function useSiteSettings() {
  useEffect(() => {
    client
      .fetch(`*[_type == "siteSettings"][0]{
        accentColor, textColor, bgColor, logoSize,
        favicon{ asset->{ url } },
        ogImage, ogTitle, ogDescription
      }`)
      .then((data) => {
        if (!data) return

        // CSS 변수
        const root = document.documentElement
        if (data.accentColor) root.style.setProperty('--site-accent', data.accentColor)
        if (data.textColor)   root.style.setProperty('--site-text',   data.textColor)
        if (data.bgColor)     root.style.setProperty('--site-bg',     data.bgColor)
        const logoPx = typeof data.logoSize === 'number' ? data.logoSize : Number(data.logoSize)
        if (Number.isFinite(logoPx) && logoPx > 0) {
          root.style.setProperty('--dupark-header-logo-height', `${logoPx}px`)
        }

        // 파비콘
        if (data.favicon?.asset?.url) {
          let link = document.querySelector("link[rel~='icon']")
          if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link) }
          link.href = data.favicon.asset.url
        }

        // OG 메타 태그
        const setMeta = (property, content) => {
          if (!content) return
          let el = document.querySelector(`meta[property="${property}"]`)
          if (!el) { el = document.createElement('meta'); el.setAttribute('property', property); document.head.appendChild(el) }
          el.setAttribute('content', content)
        }
        if (data.ogTitle) document.title = data.ogTitle
        setMeta('og:title',       data.ogTitle)
        setMeta('og:description', data.ogDescription)
        if (data.ogImage) setMeta('og:image', urlFor(data.ogImage).width(1200).url())
      })
  }, [])
}

const About = lazy(() => import('./pages/About'))

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
  useSiteSettings()
  return (
    <>
      <CustomScrollbar />
      <Header />
      <RouteEnterProvider>
        <Routes>
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

function App() {
  const [loading, setLoading] = useState(() => !sessionStorage.getItem('dupark_loaded'))

  /* loaderComplete 시점과 동일 프레임에 플래그 저장 — 비디오 등이 `loaderComplete` 리스너를
     나중에 달았을 때(예: Sanity로 videoSrc가 1.8s~2.5s 사이에 도착) 이미 지나간 이벤트에
     묶이지 않도록. 페이드 onComplete는 UI만 닫음 */
  useEffect(() => {
    const onLoaderComplete = () => {
      try {
        sessionStorage.setItem('dupark_loaded', '1')
      } catch {
        /* private mode 등 */
      }
    }
    window.addEventListener('loaderComplete', onLoaderComplete)
    return () => window.removeEventListener('loaderComplete', onLoaderComplete)
  }, [])

  const handleLoaderComplete = useCallback(() => {
    setLoading(false)
  }, [])

  return (
    <BrowserRouter>
      {loading && <Loader onComplete={handleLoaderComplete} />}
      <AppShell />
    </BrowserRouter>
  )
}

export default App
