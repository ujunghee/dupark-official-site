import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { client } from '../lib/sanity'
import './header.css'

export default function Header() {
  const [isOpen, setIsOpen]     = useState(false)
  const [navItems, setNavItems] = useState([])
  const [atTop, setAtTop]       = useState(true)
  const [hidden, setHidden]     = useState(false)
  const lastScrollY             = useRef(0)
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

      if (current < 10) {
        setHidden(false)
      } else {
        setHidden(scrollingUp)
      }

      lastScrollY.current = current
    }

    // 초기값 설정
    onScroll()

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHome])

  /* ── 라우트 변경 시 드로어 닫기 ── */
  useEffect(() => {
    setIsOpen(false)
  }, [location])

  /* ── 드로어 열릴 때 배경 스크롤 막기 ── */
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const transparent = isHome && atTop

  /* ── 헤더 className 조합 ── */
  const headerClass = [
    'header',
    transparent ? 'at-top' : '',
    hidden      ? 'hidden'  : '',
  ].filter(Boolean).join(' ')

  /* ── 투명일 때 흰 로고, 아닐 때 검정 로고 ── */
  const logoSrc = transparent ? '/logo-white.svg' : '/logo-black.svg'

  return (
    <>
      <header className={headerClass}>
        <NavLink to="/" className="logo">
          <img src={logoSrc} alt="DUPARK" className="logo-img" />
        </NavLink>

        {/* 데스크탑 네비 */}
        <nav className="nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* 햄버거 버튼 */}
        <button
          className={`hamburger${isOpen ? ' open' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="메뉴"
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      {/* 오버레이 */}
      <div
        className={`drawer-overlay${isOpen ? ' visible' : ''}`}
        onClick={() => setIsOpen(false)}
      />

      {/* 모바일 드로어 */}
      <nav className={`drawer${isOpen ? ' open' : ''}`}>
        <div className="drawer-logo">
          <img src="/logo-black.svg" alt="DUPARK" className="logo-img" />
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => isActive ? 'drawer-link active' : 'drawer-link'}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
