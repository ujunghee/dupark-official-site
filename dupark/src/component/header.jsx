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

  /* ── Sanity 카테고리 패칭 ── */
  useEffect(() => {
    client
      .fetch(`*[_type == "category"] | order(order asc) { title, slug }`)
      .then((data) =>
        setNavItems(data.map((cat) => ({ label: cat.title, path: `/${cat.slug}` })))
      )
  }, [])

  const isHome = location.pathname === '/'

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
  // useEffect(() => { setIsOpen(false) }, [location])

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
        <NavLink to="/" className="logo">
          <img src={logoSrc} alt="DUPARK" className="logo-img" />
        </NavLink>

        <nav className="nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              <span className="nav-link-inner">
                <span>{item.label}</span>
                <span>{item.label}</span>
              </span>
            </NavLink>
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
