import { useEffect, useRef, useLayoutEffect } from 'react'
import gsap from 'gsap'
import './About.css'

const ABOUT_BODY_LINES = [
  'DUPARK STUDIO is a set design studio based in Seoul,',
  'working across fashion campaigns, music videos, and editorial projects.',
  'The studio develops and delivers projects that combine art direction,',
  'production design, and prop styling to create refined and contemporary visual experiences.',
]

const LOGO_PX_MAX = 12

export default function About() {
  const pageInnerRef = useRef(null)
  const aboutMainRef = useRef(null)
  const logoParallaxRef = useRef(null)

  useEffect(() => {
    document.body.classList.add('dupark-about-page')
    return () => {
      document.body.classList.remove('dupark-about-page')
    }
  }, [])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(min-width: 769px)').matches) return
    const el = logoParallaxRef.current
    if (!el) return

    const quickX = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power2.out' })
    const quickY = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power2.out' })

    const onMove = (e) => {
      const w = window.innerWidth
      const h = window.innerHeight
      if (w < 1 || h < 1) return
      const nx = (e.clientX / w - 0.5) * 2
      const ny = (e.clientY / h - 0.5) * 2
      quickX(nx * LOGO_PX_MAX)
      quickY(ny * LOGO_PX_MAX)
    }

    const onLeave = () => {
      quickX(0)
      quickY(0)
    }

    const main = aboutMainRef.current
    window.addEventListener('pointermove', onMove, { passive: true })
    main?.addEventListener('pointerleave', onLeave)

    return () => {
      window.removeEventListener('pointermove', onMove)
      main?.removeEventListener('pointerleave', onLeave)
      gsap.set(el, { x: 0, y: 0, clearProps: 'transform' })
    }
  }, [])


  useLayoutEffect(() => {
    const root = pageInnerRef.current
    if (!root) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const logoEl = root.querySelector('.about-logo-clip .about-logo')
    const trackEls = root.querySelectorAll('.about-reveal-track')
    if (!logoEl && !trackEls.length) return

    if (reduce) {
      if (logoEl) gsap.set(logoEl, { yPercent: 0, clearProps: 'all' })
      if (trackEls.length) gsap.set(trackEls, { yPercent: 0 })
      return
    }

    const yOpts = { yPercent: 100 }
    const beat = 0.04
    const durY = 0.8
    const logoDur = 1
    const yTo = { yPercent: 0, duration: durY, ease: 'power3.out' }
    const startDelay = 0.8

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: startDelay })
      let t = 0

      if (logoEl) {
        tl.fromTo(
          logoEl,
          yOpts,
          { yPercent: 0, duration: logoDur, ease: 'power3.out' },
          t
        )
        t += beat
      }
      trackEls.forEach((el) => {
        tl.fromTo(el, yOpts, yTo, t)
        t += beat
      })
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <main ref={aboutMainRef} className="about-page">
      <div className="about-entrance-overlay" aria-hidden="true" />
      <div ref={pageInnerRef} className="about-page-inner">
        <div className="about-logo-wrap">
          <div className="about-reveal-clip about-logo-clip">
            <div ref={logoParallaxRef} className="about-logo-parallax">
              <img
                src="/logo-white.svg"
                alt="DUPARK"
                className="about-logo"
              />
            </div>
          </div>
        </div>

        <div className="about-content">
          <div className="about-content-reveal">
            <section className="about-section">
              <div className="about-reveal-clip">
                <p className="about-section-title about-reveal-track">ABOUT</p>
              </div>
              <div className="about-body-lines">
                {ABOUT_BODY_LINES.map((line) => (
                  <div key={line} className="about-reveal-clip">
                    <p className="about-section-body about-reveal-track">{line}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="about-section">
              <div className="about-reveal-clip">
                <p className="about-section-title about-reveal-track">LOCATION</p>
              </div>
              <div className="about-reveal-clip">
                <p className="about-section-body about-reveal-track">Seoul, South Korea</p>
              </div>
            </section>

            <section className="about-section">
              <div className="about-reveal-clip">
                <p className="about-section-title about-reveal-track">SERVICES</p>
              </div>
              <ul className="about-list">
                {['Production Design', 'Set Design', 'Prop Styling', 'Spatial Design'].map(
                  (label) => (
                    <li key={label}>
                      <div className="about-reveal-clip">
                        <span className="about-reveal-track about-list__line">{label}</span>
                      </div>
                    </li>
                  )
                )}
              </ul>
            </section>

            <section className="about-section">
              <div className="about-reveal-clip">
                <p className="about-section-title about-reveal-track">CONTACT</p>
              </div>
              <div className="about-reveal-clip">
                <div className="about-reveal-track about-contact-row">
                  <span className="about-contact-label">EMAIL</span>
                  <a className="about-contact-link" href="mailto:info@dupark.studio">info@dupark.studio</a>
                </div>
              </div>
              <div className="about-reveal-clip">
                <div className="about-reveal-track about-contact-row">
                  <span className="about-contact-label">Instagram</span>
                  <a
                    className="about-contact-link"
                    href="https://www.instagram.com/duapark.stuio/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    @duapark.stuio
                  </a>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
