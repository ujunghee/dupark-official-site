import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { client } from '../lib/sanity'
import gsap from 'gsap'
import './header.css'

/** header.css: 모바일 레이아웃은 (max-width:768px) — 768px에서도 `min-width:769` 아님 */
const MQL_DESKTOP = '(min-width: 769px)'
const MQL_NARROW = '(max-width: 768px)'

/** 홈에서 인트로(영상)일 때만 초기·탑에서 헤더 숨김 — 뷰포트 너비 무관(모바일=PC와 동일) */
const getHomeVideoHeroShouldHideHeader = () => {
  if (typeof document === 'undefined' || window.location.pathname !== '/') return false
  return !document.body.classList.contains('dupark-home-content')
}

export default function Header() {
  const [isOpen, setIsOpen]     = useState(false)
  const [navItems, setNavItems] = useState([])
  const [logoSize, setLogoSize] = useState(null)
  const [atTop, setAtTop]       = useState(true)
  const [homePastIntro, setHomePastIntro] = useState(
    () => (typeof document !== 'undefined' && document.body.classList.contains('dupark-home-content'))
  )
  const [hidden, setHidden]     = useState(() => getHomeVideoHeroShouldHideHeader())
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MQL_NARROW).matches
  )
  const lastScrollY             = useRef(0)
  /* 모바일 한정 hysteresis 앵커
     · `lastScrollY` 는 PC 분기(가로 스크롤 시작점 clamp bounce 등)가 의존하는 frame-to-frame 위치라 절대 손대면 안 됨
     · 모바일에서만 누적 임계값(HIDE_THRESHOLD_PX) 도달했을 때 갱신 → iOS 모멘텀 미세 떨림 흡수 */
  const lastToggleY             = useRef(0)
  const linkRefs                = useRef([])
  const location                = useLocation()

  const headerLogoRef  = useRef(null)
  const navItemRefs    = useRef([])
  const prevHiddenRef  = useRef(getHomeVideoHeroShouldHideHeader())
  const hasAnimatedRef = useRef(false)

  /* ── Sanity 카테고리 패칭 ── */
  useEffect(() => {
    client
      .fetch(`*[_type == "category"] | order(order asc) { title, slug }`)
      .then((data) =>
        setNavItems(data.map((cat) => ({ label: cat.title, path: `/${cat.slug}` })))
      )
  }, [])

  /* ── Sanity 사이트 설정 (로고 크기) ── */
  useEffect(() => {
    client
      .fetch(`*[_type == "siteSettings"][0]{ logoSize }`)
      .then((data) => { if (data?.logoSize) setLogoSize(data.logoSize) })
  }, [])

  const isHome      = location.pathname === '/'
  // /:category 또는 /:category/:id 에서 첫 번째 세그먼트를 활성 카테고리로 사용
  const activeSlug  = !isHome ? location.pathname.split('/')[1] : null

  useEffect(() => {
    if (isHome) {
      // eslint-disable-next-line -- DOM body class → React state 동기화(외부 시스템 sync)
      setHomePastIntro(document.body.classList.contains('dupark-home-content'))
    } else {
      setHomePastIntro(false)
    }
  }, [isHome, location.key, location.pathname])

  /* ── 스크롤 핸들러 ── */
  //  · PC 분기는 원본 그대로 — `setHidden(scrollingUp)` + `lastScrollY` 매 프레임 갱신
  //    (홈 가로 스크롤 시작점 clamp bounce 의 0.6px delta 가 헤더를 노출시키는 메커니즘 의존)
  //  · 모바일 분기만 별도 앵커(`lastToggleY`) 와 임계값(HIDE_THRESHOLD_PX) 으로 hysteresis
  //    → iOS 모멘텀/손가락 미세 떨림(1~2px) 은 누적이 임계값 미달이라 토글 안 됨 = 떨림 흡수
  useEffect(() => {
    const HIDE_THRESHOLD_PX = 8

    const onScroll = () => {
      const current     = window.scrollY
      const scrollingUp = current < lastScrollY.current

      setAtTop(current < 10)

      const fromBody = document.body.classList.contains('dupark-home-content')
      if (isHome) {
        setHomePastIntro(fromBody)
      } else {
        setHomePastIntro(false)
      }

      /* 모바일 + 홈 + 컨텐츠 영역(=hideIntro=true 이후) → 헤더 항상 고정 보임
         (iOS 모멘텀 끝 등에서 다운/업 토글로 헤더가 출몰하던 부자연스러움 차단) */
      if (isHome && fromBody && isNarrow) {
        setHidden(false)
        lastScrollY.current = current
        lastToggleY.current = current
        return
      }

      /* 스크롤 ≈0일 때 먼저 판정 (원래 `else if (current < 10) setHidden(false)`).
         예전엔 inVideoZone이 먼저라 스크롤0에서도 inVideoZone이 true면 맨 위 헤더 복원이 안 먹음 */
      if (current < 10) {
        const hideInVideoHeroOnly = isHome && !fromBody
        setHidden(hideInVideoHeroOnly)
        lastToggleY.current = current
      } else {
        const inVideoZone =
          isHome &&
          !fromBody &&
          current < window.innerHeight - 50
        if (inVideoZone) {
          setHidden(true)
          lastToggleY.current = current
        } else if (isNarrow) {
          /* 모바일 일반 영역: 누적 임계값 hysteresis
             · accumDelta 가 임계값 미달 → 토글/앵커 갱신 모두 안 함 → 떨림 흡수
             · 임계값 도달 시점에만 토글 + 앵커 재설정 (다음 누적은 이 지점부터) */
          const accumDelta = current - lastToggleY.current
          if (Math.abs(accumDelta) >= HIDE_THRESHOLD_PX) {
            setHidden(accumDelta < 0) // UP=hide, DOWN=show (원본 방향)
            lastToggleY.current = current
          }
        } else {
          /* PC: 원본 그대로 (한 줄도 변경 X) */
          setHidden(scrollingUp)
        }
      }

      lastScrollY.current = current
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [isHome, isNarrow])

  /* ── 뷰포트를 데스크톱(769+)으로 키우면 모바일 드로어/스크롤 잠금 정리 (resize 대신 matchMedia change) ── */
  useEffect(() => {
    const mq = window.matchMedia(MQL_DESKTOP)
    const onViewport = () => {
      if (mq.matches) setIsOpen(false)
    }
    onViewport()
    mq.addEventListener('change', onViewport)
    return () => mq.removeEventListener('change', onViewport)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia(MQL_NARROW)
    const onNarrow = () => setIsNarrow(mq.matches)
    onNarrow()
    mq.addEventListener('change', onNarrow)
    return () => mq.removeEventListener('change', onNarrow)
  }, [])

  /* 모바일 드로어: 다른 페이지(카테고리 등)로 이동 시 페이드로 닫힘(`.drawer` opacity 전환) */
  useEffect(() => {
    // eslint-disable-next-line -- 라우트 변경 시 드로어 닫는 부수효과(필수)
    setIsOpen(false)
  }, [location.pathname])

  /* ── hidden → visible 전환 시 로고 + nav stagger 등장 (clip reveal) ── */
  useEffect(() => {
    const wasHidden = prevHiddenRef.current
    prevHiddenRef.current = hidden

    if (wasHidden && !hidden && !hasAnimatedRef.current) {
      hasAnimatedRef.current = true

      const els = [
        headerLogoRef.current,
        ...navItemRefs.current.filter(Boolean),
      ].filter(Boolean)

      // overflow:hidden 래퍼 안에서 위→아래 슬라이드 reveal
      gsap.fromTo(
        els,
        { yPercent: -100 },
        { yPercent: 0, duration: 0.55, stagger: 0.07, ease: 'power3.out', clearProps: 'all' }
      )
    }
  }, [hidden])

  /* 드로어: 열릴 때 스크롤 잠금 / 닫힐 때는 opacity(0.35s) 끝난 뒤 잠금 해제 → 페이드가 보이도록 */
  const DRAWER_CLOSE_MS = 350

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      if (linkRefs.current.length) {
        gsap.fromTo(
          linkRefs.current,
          { yPercent: 110 },
          { yPercent: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out', delay: 0.15 }
        )
      }
      return
    }
    const t = window.setTimeout(() => {
      document.body.style.overflow = ''
    }, DRAWER_CLOSE_MS)
    return () => window.clearTimeout(t)
  }, [isOpen])

  /* 콘텐츠(흰 배경)로 넘어간 뒤엔 at-top(영상용 흰 텍스트) 쓰지 않음 */
  const transparent = isHome && atTop && !homePastIntro

  const headerClass = [
    'header',
    transparent ? 'at-top' : '',
    !atTop ? 'header--scrolled' : '',
    hidden      ? 'hidden'  : '',
  ].filter(Boolean).join(' ')

  /* 흰 로고: About 본문·홈 히어로(데스크톱) — 모바일은 헤더가 흰 바 = 검은 로고 */
  const useWhiteHeaderLogo =
    location.pathname === '/about' || (transparent && !isNarrow)
  const logoSrc = useWhiteHeaderLogo ? '/logo-white.svg' : '/logo-black.svg'

  return (
    <>
      <header className={headerClass}>
        {/* 로고: 클리핑 래퍼 → 내부 img가 위에서 아래로 reveal */}
        <NavLink to="/" className="logo">
          <div className="header-clip">
            <img ref={headerLogoRef} src={logoSrc} alt="DUPARK" className="logo-img" style={logoSize ? { height: `${logoSize}px` } : undefined} />
          </div>
        </NavLink>

        <nav className="nav">
          {navItems.map((item, i) => (
            <div key={item.path} className="header-clip">
              <div ref={(el) => { navItemRefs.current[i] = el }}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                >
                  <span className="nav-link-inner">
                    <span>{item.label}</span>
                    <span>{item.label}</span>
                  </span>
                </NavLink>
              </div>
            </div>
          ))}
          <div className="header-clip">
            <div ref={(el) => { navItemRefs.current[navItems.length] = el }}>
              <NavLink
                to="/about"
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                <span className="nav-link-inner">
                  <span>ABOUT</span>
                  <span>ABOUT</span>
                </span>
              </NavLink>
            </div>
          </div>
        </nav>

        <button
          className={`hamburger${isOpen ? ' open' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="메뉴"
        >
          <span /><span /><span />
        </button>
      </header>

      {/* 모바일 카테고리 탭바 (홈 제외) */}
      {!isHome && location.pathname !== '/about' && navItems.length > 0 && (
        <nav className={['mobile-subnav', hidden ? 'hidden' : ''].filter(Boolean).join(' ')}>
          {navItems.map((item) => {
            const slug    = item.path.replace('/', '')
            const isActive = slug === activeSlug
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={isActive ? 'mobile-subnav-link active' : 'mobile-subnav-link'}
              >
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      )}

      {/* 드로어 */}
      <nav className={`drawer${isOpen ? ' open' : ''}`}>
        {/* 상단: 로고 + 닫기 버튼 */}
        <div className="drawer-header">
          <img src="/logo-white.svg" alt="DUPARK" className="logo-img" />
          <button className="drawer-close" onClick={() => setIsOpen(false)} aria-label="닫기">
            <span /><span />
          </button>
        </div>

        {/* 카테고리 메뉴 */}
        <div className="drawer-menu">
          {navItems.map((item, i) => (
            <div key={item.path} className="drawer-link-wrap">
              <NavLink
                ref={(el) => { linkRefs.current[i] = el }}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => isActive ? 'drawer-link active' : 'drawer-link'}
              >
                {item.label}
              </NavLink>
            </div>
          ))}
          <div className="drawer-link-wrap">
            <NavLink
              ref={(el) => { linkRefs.current[navItems.length] = el }}
              to="/about"
              onClick={() => setIsOpen(false)}
              className={({ isActive }) => isActive ? 'drawer-link active' : 'drawer-link'}
            >
              ABOUT
            </NavLink>
          </div>
        </div>
      </nav>
    </>
  )
}
