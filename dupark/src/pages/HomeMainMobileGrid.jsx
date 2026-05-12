import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { lenis } from '../lib/lenis'
import { MobileCategoryItem } from './MobileCategoryItem'
import './Home.css'

/** `/main` 모바일 — `/m`과 동일 그리드·애니, 인트로 게이트 없음 */
export default function HomeMainMobileGrid({ categories }) {
  const gridSectionRef = useRef(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    lenis.scrollTo(0, { immediate: true, force: true })
    lenis.resize()
  }, [])

  useLayoutEffect(() => {
    if (categories.length === 0) return
    const section = gridSectionRef.current
    if (!section) return
    const items = gsap.utils.toArray(section.querySelectorAll('.mobile-grid-item'))
    if (!items.length) return

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      gsap.set(items, { clearProps: 'transform,opacity,visibility' })
      return undefined
    }

    gsap.killTweensOf(items)
    gsap.fromTo(
      items,
      { y: 10, autoAlpha: 0 },
      {
        y: 0,
        autoAlpha: 1,
        duration: 0.58,
        stagger: { each: 0.05, from: 'start' },
        ease: 'power3.out',
        onComplete: () => {
          gsap.set(items, { clearProps: 'transform,opacity,visibility' })
        },
      }
    )
    return () => {
      gsap.killTweensOf(items)
    }
  }, [categories])

  return (
    <main id="main-content" tabIndex={-1} className="home-mobile-grid-main">
      <section ref={gridSectionRef} className="mobile-grid-section">
        {categories.map((cat) => (
          <MobileCategoryItem key={cat._id} cat={cat} />
        ))}
      </section>
    </main>
  )
}
