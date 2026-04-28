import { useEffect, useLayoutEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { client, urlFor } from '../lib/sanity'
import { lenis } from '../lib/lenis'
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
 * 인트로에서만 `navigate('/m', { state: { fromIntro: true } })` 로 들어올 수 있음.
 * (Performance `navigation.type === 'reload'` 는 `/` 새로고침 후에도 계속 reload 로 남아 오판하므로 사용하지 않음)
 */
export default function HomeMobileGrid() {
  const navigate = useNavigate()
  const location = useLocation()
  const [categories, setCategories] = useState([])

  const fromIntro = location.state?.fromIntro === true

  useLayoutEffect(() => {
    if (fromIntro) {
      document.body.classList.add('dupark-home-content')
      return () => document.body.classList.remove('dupark-home-content')
    }
    navigate('/', { replace: true })
    return undefined
  }, [fromIntro, navigate])

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
    if (!fromIntro) return
    client.fetch(`*[_type == "category"] | order(order asc)`).then(setCategories)
  }, [fromIntro])

  useEffect(() => {
    if (!fromIntro) return
    window.scrollTo(0, 0)
    lenis.scrollTo(0, { immediate: true, force: true })
    lenis.resize()
  }, [fromIntro])

  if (!fromIntro) return null

  return (
    <main>
      <section className="mobile-grid-section">
        {categories.map((cat) => (
          <MobileCategoryItem key={cat._id} cat={cat} />
        ))}
      </section>
    </main>
  )
}
