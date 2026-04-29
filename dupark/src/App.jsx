import { useState, useCallback, useEffect, useLayoutEffect, useRef, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { lenis } from './lib/lenis'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { RouteEnterProvider } from './context/RouteEnterContext'
import { client, urlFor } from './lib/sanity'
import Header from './component/header'
import Footer from './component/footer'
import Home from './pages/Home'
import HomeMobileGrid from './pages/HomeMobileGrid'
import Category from './pages/Category'
import ProjectDetail from './pages/ProjectDetail'
import Loader from './component/Loader'

/** Sanity siteSettings에서 색상·로고·폰트·메타 fetch → :root CSS 변수 + head 태그 주입 */
const SITE_FONT_FACE_STYLE_ID = 'dupark-site-font-face'
const SITE_CUSTOM_FONT_FAMILY = 'DuparkSiteCustom'
/** 한글 음절·자모 + 한국어에서 자주 쓰는 부호·CJK 기호 일부 */
const UNICODE_RANGE_HANGUL =
  'U+AC00-D7A3, U+3130-318F, U+1100-11FF, U+A960-A97F, U+D7B0-D7FF, U+3000-303F, U+2000-206F, U+FE30-FE4F, U+FF00-FFEF'
/** 라틴(영문)·숫자·흔한 기호 — 한글 파일과 같이 쓸 때 영문 전용 파일에만 적용 */
const UNICODE_RANGE_LATIN =
  'U+0020-007F, U+0080-00FF, U+0100-024F, U+0250-02AF, U+0300-036F'

function fontFormatForCss(url) {
  const path = (url || '').split('?')[0].toLowerCase()
  if (path.endsWith('.woff2')) return "format('woff2')"
  if (path.endsWith('.woff')) return "format('woff')"
  if (path.endsWith('.ttf')) return "format('truetype')"
  if (path.endsWith('.otf')) return "format('opentype')"
  return "format('truetype')"
}

function fontFaceBlocksForUrl(url, unicodeRange) {
  const fmt = fontFormatForCss(url)
  const rangeCss = unicodeRange ? `\n  unicode-range: ${unicodeRange};` : ''
  /* body 가 font-weight:700 이라 정적 TTF 는 400·700 각각 등록해야 매칭되는 경우가 많음 */
  const one = (weight) => `@font-face {
  font-family: '${SITE_CUSTOM_FONT_FAMILY}';
  src: url(${JSON.stringify(url)}) ${fmt};
  font-weight: ${weight};
  font-style: normal;
  font-display: swap;${rangeCss}
}`
  return `${one(400)}\n\n${one(700)}`
}

function useSiteSettings() {
  useEffect(() => {
    client
      .fetch(`*[_type == "siteSettings"][0]{
        accentColor, textColor, bgColor, logoSize, logoSizeMobile,
        "fontKoUrl": coalesce(fontKoreanFile.asset->url, fontRegularFile.asset->url),
        "fontEnUrl": fontEnglishFile.asset->url,
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
        const logoPxDesktop = typeof data.logoSize === 'number' ? data.logoSize : Number(data.logoSize)
        const logoPxMobile = typeof data.logoSizeMobile === 'number' ? data.logoSizeMobile : Number(data.logoSizeMobile)
        if (Number.isFinite(logoPxDesktop) && logoPxDesktop > 0) {
          root.style.setProperty('--dupark-header-logo-height-desktop', `${logoPxDesktop}px`)
        }
        if (Number.isFinite(logoPxMobile) && logoPxMobile > 0) {
          root.style.setProperty('--dupark-header-logo-height-mobile', `${logoPxMobile}px`)
        }

        const prevFace = document.getElementById(SITE_FONT_FACE_STYLE_ID)
        if (prevFace) prevFace.remove()

        const koUrl =
          typeof data.fontKoUrl === 'string' ? data.fontKoUrl.trim() : ''
        const enUrl =
          typeof data.fontEnUrl === 'string' ? data.fontEnUrl.trim() : ''

        const blocks = []
        if (koUrl && enUrl) {
          blocks.push(fontFaceBlocksForUrl(koUrl, UNICODE_RANGE_HANGUL))
          blocks.push(fontFaceBlocksForUrl(enUrl, UNICODE_RANGE_LATIN))
        } else if (koUrl) {
          blocks.push(fontFaceBlocksForUrl(koUrl, null))
        } else if (enUrl) {
          blocks.push(fontFaceBlocksForUrl(enUrl, null))
        }

        if (blocks.length) {
          const style = document.createElement('style')
          style.id = SITE_FONT_FACE_STYLE_ID
          style.textContent = blocks.join('\n\n')
          document.head.appendChild(style)
          root.style.setProperty(
            '--site-font-family',
            `'${SITE_CUSTOM_FONT_FAMILY}', 'ABCDiatype', system-ui, sans-serif`
          )
        } else {
          root.style.removeProperty('--site-font-family')
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

/** Sanity fetch가 너무 늦어지면 로더가 영원히 안 닫히는 걸 막기 위한 안전 타임아웃 */
const INTRO_URL_FETCH_TIMEOUT_MS = 3000

function App() {
  const [loading, setLoading] = useState(() => !sessionStorage.getItem('dupark_loaded'))
  /* undefined = 아직 모름(Sanity fetch 중), null = 영상 없음, string = 다운로드할 URL */
  const [introVideoUrl, setIntroVideoUrl] = useState(undefined)

  /* loaderComplete 시점과 동일 프레임에 플래그 저장 — 비디오 등이 `loaderComplete` 리스너를
     나중에 달았을 때(예: Sanity로 videoSrc가 늦게 도착) 이미 지나간 이벤트에
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

  /* 첫 진입(loader가 떠 있는 동안)에만 인트로 영상 URL을 받아 두고 Loader 가 미리 다운로드 → 본 페이지로 넘어갈 때 끊김 없음 */
  useEffect(() => {
    if (!loading) return
    let resolved = false
    const resolve = (url) => {
      if (resolved) return
      resolved = true
      setIntroVideoUrl(url ?? null)
    }
    client
      .fetch(`*[_type == "siteSettings"][0]{ "videoUrl": introVideo.asset->url }`)
      .then((data) => resolve(data?.videoUrl))
      .catch(() => resolve(null))
    const timer = window.setTimeout(() => resolve(null), INTRO_URL_FETCH_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [loading])

  const handleLoaderComplete = useCallback(() => {
    setLoading(false)
  }, [])

  return (
    <BrowserRouter>
      <ScrollToTop />
      {loading && (
        <Loader onComplete={handleLoaderComplete} waitForUrl={introVideoUrl} />
      )}
      <AppShell />
    </BrowserRouter>
  )
}

export default App
