import { useEffect, useRef, useLayoutEffect, useState, useMemo, useCallback } from 'react'
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

const DEFAULT_LOCATION = 'Seoul, South Korea'

const DEFAULT_SERVICES = [
  'Production Design',
  'Set Design',
  'Prop Styling',
  'Spatial Design',
]

/** 기본 메일 앱에서 수신·작성 화면이 열리도록 mailto: 사용 */
const CONTACT_EMAIL = 'info@dupark.studio'

/** Studio 미입력 시 기존 하드코딩과 동일 */
const FALLBACK_INSTAGRAM = {
  url: 'https://www.instagram.com/duapark.stuio/',
  label: '@duapark.stuio',
}

const ABOUT_PAGE_QUERY = `*[_type == "aboutPage" && _id == "aboutPage"][0]{
  bodyLines,
  location,
  services,
  contactEmail,
  instagramUrl,
  instagramLabel,
  headingAbout,
  headingLocation,
  headingServices,
  headingContact,
  labelEmail,
  labelInstagram
}`

function normalizeLines(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
}

/** Studio에 mailto:까지 붙여 넣거나 공백·제로폭 문자가 섞여도 안전하게 */
function cleanContactEmailInput(raw) {
  if (typeof raw !== 'string') return ''
  let s = raw.trim().replace(/[\u200B-\u200D\uFEFF]/g, '')
  if (/^mailto:/i.test(s)) s = s.replace(/^mailto:/i, '').trim()
  s = s.replace(/\s+/g, '')
  return s
}

function isPlausibleEmail(s) {
  if (!s || typeof s !== 'string') return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(s)
}

/** Windows·일부 클라이언트에서 mailto:user%40host 가 실패하는 경우가 있어 ASCII 주소는 비인코딩 */
function mailtoHrefForAddress(email) {
  const addr = typeof email === 'string' ? email.trim() : ''
  if (!addr) return `mailto:${CONTACT_EMAIL}`
  const asciiOnly = [...addr].every((ch) => ch.charCodeAt(0) < 128)
  if (asciiOnly && isPlausibleEmail(addr)) return `mailto:${addr}`
  return `mailto:${encodeURIComponent(addr)}`
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

function mergeAboutContent(remote) {
  const doc = remote && typeof remote === 'object' ? remote : null

  const bodyFromStudio = normalizeLines(doc?.bodyLines)
  const bodyLines = bodyFromStudio.length > 0 ? bodyFromStudio : ABOUT_BODY_LINES

  const loc = typeof doc?.location === 'string' ? doc.location.trim() : ''
  const location = loc || DEFAULT_LOCATION

  const svcFromStudio = normalizeLines(doc?.services)
  const services = svcFromStudio.length > 0 ? svcFromStudio : DEFAULT_SERVICES

  const emailClean = cleanContactEmailInput(
    typeof doc?.contactEmail === 'string' ? doc.contactEmail : ''
  )
  const contactEmail = isPlausibleEmail(emailClean) ? emailClean : CONTACT_EMAIL

  const igUrl = typeof doc?.instagramUrl === 'string' ? doc.instagramUrl.trim() : ''
  const igLabelRaw = typeof doc?.instagramLabel === 'string' ? doc.instagramLabel.trim() : ''
  const instagram = igUrl
    ? {
        url: igUrl,
        label: igLabelRaw || labelFromInstagramUrl(igUrl) || igUrl,
      }
    : { ...FALLBACK_INSTAGRAM }

  const headingAbout =
    (typeof doc?.headingAbout === 'string' && doc.headingAbout.trim()) || 'ABOUT'
  const headingLocation =
    (typeof doc?.headingLocation === 'string' && doc.headingLocation.trim()) || 'LOCATION'
  const headingServices =
    (typeof doc?.headingServices === 'string' && doc.headingServices.trim()) || 'SERVICES'
  const headingContact =
    (typeof doc?.headingContact === 'string' && doc.headingContact.trim()) || 'CONTACT'
  const labelEmail =
    (typeof doc?.labelEmail === 'string' && doc.labelEmail.trim()) || 'EMAIL'
  const labelInstagram =
    (typeof doc?.labelInstagram === 'string' && doc.labelInstagram.trim()) || 'Instagram'

  return {
    bodyLines,
    location,
    services,
    contactEmail,
    mailtoContact: mailtoHrefForAddress(contactEmail),
    instagram,
    headingAbout,
    headingLocation,
    headingServices,
    headingContact,
    labelEmail,
    labelInstagram,
  }
}

export default function About() {
  const pageInnerRef = useRef(null)
  const [remoteAbout, setRemoteAbout] = useState(undefined)

  const content = useMemo(() => mergeAboutContent(remoteAbout), [remoteAbout])

  const revealKey = useMemo(
    () =>
      [
        content.bodyLines.join('\n'),
        content.location,
        content.services.join('\n'),
        content.contactEmail,
        content.instagram.url,
        content.instagram.label,
        content.headingAbout,
        content.headingLocation,
        content.headingServices,
        content.headingContact,
        content.labelEmail,
        content.labelInstagram,
      ].join('\u0001'),
    [content]
  )

  useLayoutEffect(() => {
    document.body.classList.add('dupark-about-page')
    return () => {
      document.body.classList.remove('dupark-about-page')
    }
  }, [])

  useEffect(() => {
    const id = requestAnimationFrame(() => lenis.resize())
    return () => cancelAnimationFrame(id)
  }, [revealKey])

  useLayoutEffect(() => {
    lenis.scrollTo(0, { immediate: true, force: true })
  }, [])

  useEffect(() => {
    client
      .fetch(ABOUT_PAGE_QUERY)
      .then((doc) => setRemoteAbout(doc ?? null))
      .catch(() => setRemoteAbout(null))
  }, [])

  /** Windows+일부 브라우저에서 <a> 기본 동작만으로 mailto 핸들러가 안 타는 경우 보완 */
  const handleMailtoClick = useCallback(
    (e) => {
      if (e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const href = content.mailtoContact
      if (!href.startsWith('mailto:')) return
      e.preventDefault()
      e.stopPropagation()
      window.location.assign(href)
    },
    [content.mailtoContact]
  )

  useLayoutEffect(() => {
    const root = pageInnerRef.current
    if (!root) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const trackEls = root.querySelectorAll('.about-reveal-track')
    if (!trackEls.length) return

    if (reduce) {
      gsap.set(trackEls, { autoAlpha: 1, yPercent: 0 })
      return
    }

    const fadeDur = 0.75
    const fadeEase = 'power2.out'
    const beat = 0.04
    const startDelay = 0.8

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: startDelay })
      let t = 0
      trackEls.forEach((el) => {
        tl.fromTo(
          el,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: fadeDur, ease: fadeEase },
          t
        )
        t += beat
      })
    }, root)

    return () => ctx.revert()
  }, [revealKey])

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
              className="about-logo-mark about-reveal-track"
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
                <p className="about-section-title about-reveal-track">{content.headingAbout}</p>
              </div>
              <div className="about-body-lines">
                {content.bodyLines.map((line, i) => (
                  <div key={`${i}-${line}`} className="about-reveal-clip">
                    <p className="about-section-body about-reveal-track">{line}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="about-section">
              <div className="about-reveal-clip">
                <p className="about-section-title about-reveal-track">{content.headingLocation}</p>
              </div>
              <div className="about-reveal-clip">
                <p className="about-section-body about-reveal-track">{content.location}</p>
              </div>
            </section>

            <section className="about-section">
              <div className="about-reveal-clip">
                <p className="about-section-title about-reveal-track">{content.headingServices}</p>
              </div>
              <ul className="about-list">
                {content.services.map((label, i) => (
                  <li key={`${i}-${label}`}>
                    <div className="about-reveal-clip">
                      <span className="about-reveal-track about-list__line">{label}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="about-section">
              <div className="about-reveal-clip">
                <p className="about-section-title about-reveal-track">{content.headingContact}</p>
              </div>
              <div className="about-reveal-clip">
                <div className="about-reveal-track about-contact-row">
                  <span className="about-contact-label">{content.labelEmail}</span>
                  <a
                    className="about-contact-link"
                    href={content.mailtoContact}
                    title="설정된 기본 메일 앱에서 열기 (Windows·Mac)"
                    onClick={handleMailtoClick}
                  >
                    {content.contactEmail}
                  </a>
                </div>
              </div>
              <div className="about-reveal-clip">
                <div className="about-reveal-track about-contact-row">
                  <span className="about-contact-label">{content.labelInstagram}</span>
                  <a
                    className="about-contact-link"
                    href={content.instagram.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {content.instagram.label}
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
