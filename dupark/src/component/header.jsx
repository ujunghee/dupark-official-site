import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { client } from '../lib/sanity'
import gsap from 'gsap'
import './header.css'

export default function Header() {
  const [isOpen, setIsOpen]     = useState(false)
  const [navItems, setNavItems] = useState([])
  const [atTop, setAtTop]       = useState(true)
  const [hidden, setHidden]     = useState(window.location.pathname === '/' && window.innerWidth > 768)
  const lastScrollY             = useRef(0)
  const linkRefs                = useRef([])
  const location                = useLocation()

  const headerLogoRef  = useRef(null)
  const navItemRefs    = useRef([])
  const prevHiddenRef  = useRef(window.location.pathname === '/' && window.innerWidth > 768)
  const hasAnimatedRef = useRef(false)

  /* ── Sanity 카테고리 패칭 ── */
  useEffect(() => {
    client
      .fetch(`*[_type == "category"] | order(order asc) { title, slug }`)
      .then((data) =>
        setNavItems(data.map((cat) => ({ label: cat.title, path: `/${cat.slug}` })))
      )
  }, [])

  const isHome      = location.pathname === '/'
  // /:category 또는 /:category/:id 에서 첫 번째 세그먼트를 활성 카테고리로 사용
  const activeSlug  = !isHome ? location.pathname.split('/')[1] : null

  /* ── 스크롤 핸들러 ── */
  useEffect(() => {
    const onScroll = () => {
      const current     = window.scrollY
      const scrollingUp = current < lastScrollY.current

      setAtTop(current < 10)

      const isMobile    = window.innerWidth <= 768
      const inVideoZone = isHome && !isMobile && current < window.innerHeight - 50

      if (inVideoZone) {
        setHidden(true)
      } else if (current < 10) {
        setHidden(false)
      } else {
        setHidden(scrollingUp)
      }

      lastScrollY.current = current
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHome])

  /* ── 라우트 변경 시 드로어 닫기 ── */
  useEffect(() => {
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

  /* ── 드로어 열릴 때 스크롤 막기 + GSAP 링크 reveal ── */
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''

    if (isOpen && linkRefs.current.length) {
      gsap.fromTo(
        linkRefs.current,
        { yPercent: 110 },
        { yPercent: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out', delay: 0.15 }
      )
    }

    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const transparent = isHome && atTop

  const headerClass = [
    'header',
    transparent ? 'at-top' : '',
    hidden      ? 'hidden'  : '',
  ].filter(Boolean).join(' ')

  const logoSrc = transparent ? '/logo-white.svg' : '/logo-black.svg'

  return (
    <>
      <header className={headerClass}>
        {/* 로고: 클리핑 래퍼 → 내부 img가 위에서 아래로 reveal */}
        <NavLink to="/" className="logo">
          <div className="header-clip">
            <img ref={headerLogoRef} src={logoSrc} alt="DUPARK" className="logo-img" />
          </div>
        </NavLink>

        <nav className="nav">
          {navItems.map((item, i) => (
            <div key={item.path} className="header-clip">
              {/* ref는 실제 움직이는 내부 div에 */}
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
      {!isHome && navItems.length > 0 && (
        <nav className={`mobile-subnav${hidden ? ' hidden' : ''}`}>
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
                className={({ isActive }) => isActive ? 'drawer-link active' : 'drawer-link'}
              >
                {item.label}
              </NavLink>
            </div>
          ))}
        </div>
      </nav>
    </>
  )
}
