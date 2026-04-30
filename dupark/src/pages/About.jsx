import { useEffect, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { lenis } from '../lib/lenis.js'
import AboutGlobe from '../component/AboutGlobe'
import './About.css'

const ABOUT_BODY_LINES = [
  'DUPARK STUDIO is a set design studio based in Seoul,',
  'working across fashion campaigns, music videos, and editorial projects.',
  'The studio develops and delivers projects that combine art direction,',
  'production design, and prop styling to create refined and contemporary visual experiences.',
]

export default function About() {
  const pageInnerRef = useRef(null)

  useLayoutEffect(() => {
    document.body.classList.add('dupark-about-page')
    return () => {
      document.body.classList.remove('dupark-about-page')
    }
  }, [])

  useEffect(() => {
    const id = requestAnimationFrame(() => lenis.resize())
    return () => cancelAnimationFrame(id)
  }, [])

  useLayoutEffect(() => {
    lenis.scrollTo(0, { immediate: true, force: true })
  }, [])

  useLayoutEffect(() => {
    const root = pageInnerRef.current
    if (!root) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const trackEls = root.querySelectorAll('.about-reveal-track')
    if (!trackEls.length) return

    if (reduce) {
      if (trackEls.length) gsap.set(trackEls, { yPercent: 0 })
      return
    }

    const yOpts = { yPercent: 100 }
    const beat = 0.04
    const durY = 0.8
    const yTo = { yPercent: 0, duration: durY, ease: 'power3.out' }
    const startDelay = 0.8

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: startDelay })
      let t = 0
      trackEls.forEach((el) => {
        tl.fromTo(el, yOpts, yTo, t)
        t += beat
      })
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <main id="main-content" tabIndex={-1} className="about-page">
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="about-entrance-overlay" aria-hidden="true" />,
          document.body
        )}
      <div ref={pageInnerRef} className="about-page-inner">
        <div className="about-globe-column">
          <AboutGlobe />
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
