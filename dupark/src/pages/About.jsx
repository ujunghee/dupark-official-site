import { useEffect, useRef, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { lenis } from '../lib/lenis.js'
import { client } from '../lib/sanity'
import './About.css'

const ABOUT_BODY_LINES = [
  'DUPARK STUDIO is a set design studio based in Seoul,',
  'working across fashion campaigns, music videos, and editorial projects.',
  'The studio develops and delivers projects that combine art direction,',
  'production design, and prop styling to create refined and contemporary visual experiences.',
]

/** 기본 메일 앱에서 수신·작성 화면이 열리도록 mailto: 사용 */
const CONTACT_EMAIL = 'info@dupark.studio'
const MAILTO_CONTACT = `mailto:${CONTACT_EMAIL}`

/** About Instagram — Studio 미입력 시 기존 하드코딩과 동일(마이그레이션) */
const FALLBACK_INSTAGRAM = {
  url: 'https://www.instagram.com/duapark.stuio/',
  label: '@duapark.stuio',
}

function labelFromInstagramUrl(url) {
  if (!url || typeof url !== 'string') return ''
  try {
    const u = new URL(url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`)
    const parts = u.pathname.split('/').filter(Boolean)
    const user = parts[0]
    if (!user || user === 'p' || user === 'reel' || user === 'stories') return ''
    return `@${user}`
  } catch {
    return ''
  }
}

export default function About() {
  const pageInnerRef = useRef(null)
  const [instagram, setInstagram] = useState(() => ({ ...FALLBACK_INSTAGRAM }))

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

  useEffect(() => {
    client
      .fetch(
        `*[_type == "siteSettings"][0]{ aboutInstagramUrl, aboutInstagramHandle }`
      )
      .then((data) => {
        const url =
          typeof data?.aboutInstagramUrl === 'string'
            ? data.aboutInstagramUrl.trim()
            : ''
        const handle =
          typeof data?.aboutInstagramHandle === 'string'
            ? data.aboutInstagramHandle.trim()
            : ''
        if (url) {
          setInstagram({
            url,
            label: handle || labelFromInstagramUrl(url) || url,
          })
        } else {
          setInstagram({ ...FALLBACK_INSTAGRAM })
        }
      })
      .catch(() => setInstagram({ ...FALLBACK_INSTAGRAM }))
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
        <div className="about-logo-column">
          <div className="about-logo-center">
            <img
              src="/logo-white.svg"
              alt="DUPARK"
              className="about-logo-mark"
              width={480}
              height={120}
              decoding="async"
            />
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
                  <a
                    className="about-contact-link"
                    href={MAILTO_CONTACT}
                    title="메일 앱에서 새 메일 작성"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </div>
              </div>
              <div className="about-reveal-clip">
                <div className="about-reveal-track about-contact-row">
                  <span className="about-contact-label">Instagram</span>
                  <a
                    className="about-contact-link"
                    href={instagram.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {instagram.label}
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
