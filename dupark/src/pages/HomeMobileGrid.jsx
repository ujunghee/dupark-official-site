import { useEffect, useLayoutEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { client, urlFor } from '../lib/sanity'
import { lenis } from '../lib/lenis'
import { DUPARK_M_SPA_OK } from '../lib/mobileGridSession'
import './Home.css'

const MOBILE_MAX = 768

function MobileCategoryItem({ cat }) {
  const navigate = useNavigate()
  return (
    <div onClick={() => navigate(`/${cat.slug}`)} style={{ cursor: 'pointer' }}>
      <div className="mobile-cat-label">{cat.title}</div>
      <div className="mobile-cat-img">
        {cat.coverImage
          ? <img src={urlFor(cat.coverImage).width(600).url()} alt={cat.title} />
          : <div style={{ position: 'absolute', inset: 0, background: '#222' }} />
        }
      </div>
    </div>
  )
}

/**
 * 모바일 그리드 전용 (`/m`).
 * `location.state.fromIntro` + 같은 탭에서 방금 세팅된 `sessionStorage` 플래그가 있어야 진입.
 * 전체 새로고침 시 `location.state`가 사라져 `/`(인트로)로 보냄.
 */
export default function HomeMobileGrid() {
  const navigate = useNavigate()
  const location = useLocation()
  const [categories, setCategories] = useState([])

  let spaOk = false
  try {
    spaOk = sessionStorage.getItem(DUPARK_M_SPA_OK) === '1'
  } catch {
    spaOk = false
  }
  const fromIntro = location.state?.fromIntro === true
  const allowed = fromIntro && spaOk

  useLayoutEffect(() => {
    if (!allowed) {
      try {
        sessionStorage.removeItem(DUPARK_M_SPA_OK)
      } catch {
        /* ignore */
      }
      navigate('/', { replace: true })
      return undefined
    }
    document.body.classList.add('dupark-home-content')
    return () => document.body.classList.remove('dupark-home-content')
  }, [allowed, navigate])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.innerWidth > MOBILE_MAX) {
      navigate('/', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MOBILE_MAX + 1}px)`)
    const onWide = () => {
      if (mq.matches) navigate('/', { replace: true })
    }
    mq.addEventListener('change', onWide)
    return () => mq.removeEventListener('change', onWide)
  }, [navigate])

  useEffect(() => {
    if (!allowed) return
    client.fetch(`*[_type == "category"] | order(order asc)`).then(setCategories)
  }, [allowed])

  useEffect(() => {
    if (!allowed) return
    window.scrollTo(0, 0)
    lenis.scrollTo(0, { immediate: true, force: true })
    lenis.resize()
  }, [allowed])

  if (!allowed) return null

  return (
    <main className="home-mobile-grid-main">
      <section className="mobile-grid-section">
        {categories.map((cat) => (
          <MobileCategoryItem key={cat._id} cat={cat} />
        ))}
      </section>
    </main>
  )
}
