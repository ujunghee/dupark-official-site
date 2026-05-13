import { useEffect, useRef, useLayoutEffect, useState, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { lenis } from '../lib/lenis.js'
import { useIntroMedia } from '../context/IntroMediaContext'
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

/** 인트로 영상: 768px 이하 비표시 — 769px 이상만 */
const ABOUT_INTRO_VIDEO_MIN_MQ = '(min-width: 769px)'

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

/** 각 .about-reveal-track 페이드 스태거 — 부모 클립에 --about-reveal-i (0,1,2,…) */
function AboutRevealColumn({ content, onMailtoClick }) {
  let i = 0
  const clipProps = () => ({ style: { '--about-reveal-i': String(i++) } })

  return (
    <div className="about-content-reveal">
      <section className="about-section">
        <div className="about-reveal-clip" {...clipProps()}>
          <p className="about-section-title about-reveal-track">{content.headingAbout}</p>
        </div>
        <div className="about-body-lines">
          {content.bodyLines.map((line, idx) => (
            <div key={`${idx}-${line}`} className="about-reveal-clip" {...clipProps()}>
              <p className="about-section-body about-reveal-track">{line}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="about-section">
        <div className="about-reveal-clip" {...clipProps()}>
          <p className="about-section-title about-reveal-track">{content.headingLocation}</p>
        </div>
        <div className="about-reveal-clip" {...clipProps()}>
          <p className="about-section-body about-reveal-track">{content.location}</p>
        </div>
      </section>

      <section className="about-section">
        <div className="about-reveal-clip" {...clipProps()}>
          <p className="about-section-title about-reveal-track">{content.headingServices}</p>
        </div>
        <ul className="about-list">
          {content.services.map((label, idx) => (
            <li key={`${idx}-${label}`}>
              <div className="about-reveal-clip" {...clipProps()}>
                <span className="about-reveal-track about-list__line">{label}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="about-section">
        <div className="about-reveal-clip" {...clipProps()}>
          <p className="about-section-title about-reveal-track">{content.headingContact}</p>
        </div>
        <div className="about-reveal-clip" {...clipProps()}>
          <div className="about-reveal-track about-contact-row">
            <span className="about-contact-label">{content.labelEmail}</span>
            <a
              className="about-contact-link"
              href={content.mailtoContact}
              title="설정된 기본 메일 앱에서 열기 (Windows·Mac)"
              onClick={onMailtoClick}
            >
              {content.contactEmail}
            </a>
          </div>
        </div>
        <div className="about-reveal-clip" {...clipProps()}>
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
  )
}

export default function About() {
  const slidesWrapperRef = useRef(null)
  const pageInnerRef = useRef(null)
  const introVideoWrapRef = useRef(null)
  const introVideoRef = useRef(null)
  const { videoUrl: videoSrc, posterUrl: videoPoster } = useIntroMedia()
  const [remoteAbout, setRemoteAbout] = useState(undefined)
  const [introVideoInView, setIntroVideoInView] = useState(false)
  const [introVideoViewportOk, setIntroVideoViewportOk] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(ABOUT_INTRO_VIDEO_MIN_MQ).matches
  )

  const hasVideoSrc = typeof videoSrc === 'string' && Boolean(videoSrc.trim())
  const showIntroVideo = hasVideoSrc && introVideoViewportOk

  useLayoutEffect(() => {
    const mq = window.matchMedia(ABOUT_INTRO_VIDEO_MIN_MQ)
    const sync = () => setIntroVideoViewportOk(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

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

  useEffect(() => {
    const video = introVideoRef.current
    if (!video || !showIntroVideo) return
    try {
      video.load()
    } catch {
      /* ignore */
    }
  }, [videoSrc, videoPoster, showIntroVideo])

  useEffect(() => {
    if (!showIntroVideo) return
    queueMicrotask(() => {
      lenis.resize()
      ScrollTrigger.refresh()
    })
  }, [showIntroVideo])

  useEffect(() => {
    if (!showIntroVideo) return
    const el = introVideoWrapRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        setIntroVideoInView(entries.some((e) => e.isIntersecting))
      },
      { root: null, rootMargin: '80px 0px', threshold: 0.08 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [showIntroVideo])

  useEffect(() => {
    const v = introVideoRef.current
    if (!v || !showIntroVideo) return
    if (introVideoInView) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      v.muted = true
      void v.play().catch(() => {})
    } else {
      v.pause()
    }
    queueMicrotask(() => lenis.resize())
  }, [introVideoInView, showIntroVideo])

  /**
   * CodePen Slides Pinning - Overscroll Solution 동일:
   * https://codepen.io/GreenSock/pen/bGRdvMy
   * 마지막 .section 은 제외, pinSpacing:false + pin, 긴 inner 는 fakeScrollRatio·marginBottom·yPercent
   */
  useLayoutEffect(() => {
    const wrap = slidesWrapperRef.current
    if (!wrap) return undefined

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const compact = window.matchMedia('(max-width: 768px)').matches
    if (reduce || compact) {
      queueMicrotask(() => {
        lenis.resize()
        ScrollTrigger.refresh()
      })
      return undefined
    }

    const panels = gsap.utils.toArray(wrap.querySelectorAll(':scope > .section'))
    const panelsToAnimate = panels.slice(0, -1)

    const clearMargins = () => {
      panelsToAnimate.forEach((p) => {
        p.style.marginBottom = ''
      })
    }

    clearMargins()

    const ctx = gsap.context(() => {
      panelsToAnimate.forEach((panel) => {
        const innerpanel = panel.querySelector('.section-inner')
        if (!innerpanel) return

        const panelHeight = innerpanel.offsetHeight
        const windowHeight = window.innerHeight
        const difference = panelHeight - windowHeight
        const fakeScrollRatio =
          difference > 0 ? difference / (difference + windowHeight) : 0

        if (fakeScrollRatio) {
          panel.style.marginBottom = `${panelHeight * fakeScrollRatio}px`
        }
        
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: panel,
            start: 'bottom bottom',
            end: () => {
              const ph = innerpanel.offsetHeight
              const wh = window.innerHeight
              const diff = ph - wh
              const ratio = diff > 0 ? diff / (diff + wh) : 0
              return ratio ? `+=${ph}` : 'bottom top'
            },
            pinSpacing: false,
            pin: true,
            scrub: true,
          },
        })

        if (fakeScrollRatio) {
          tl.to(innerpanel, {
            yPercent: -100,
            y: window.innerHeight,
            duration: 1 / (1 - fakeScrollRatio) - 1,
            ease: 'none',
          })
        }

        const blur = 6
        tl.fromTo(
          panel,
          {
            scale: 1,
            opacity: 1,
            filter: 'blur(0px)',
            WebkitFilter: 'blur(0px)',
          },
          {
            scale: 0.7,
            opacity: 0.5,
            filter: `blur(${blur}px)`,
            WebkitFilter: `blur(${blur}px)`,
            duration: 0.9,
            ease: 'none',
          }
        ).to(panel, { opacity: 0, duration: 0.1, ease: 'none' })
      })
    }, wrap)

    const onResize = () => {
      lenis.resize()
      ScrollTrigger.refresh()
    }
    window.addEventListener('resize', onResize)

    queueMicrotask(() => {
      lenis.resize()
      ScrollTrigger.refresh()
    })

    return () => {
      window.removeEventListener('resize', onResize)
      clearMargins()
      ctx.revert()
      lenis.resize()
      ScrollTrigger.refresh()
    }
  }, [showIntroVideo, revealKey])

  useLayoutEffect(() => {
    document.body.classList.add('dupark-about-page')
    return () => {
      document.body.classList.remove('dupark-about-page')
    }
  }, [])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      lenis.resize()
      ScrollTrigger.refresh()
    })
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

  return (
    <>
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="about-entrance-overlay" aria-hidden="true" />,
          document.body
        )}
      <div ref={slidesWrapperRef} className="slides-wrapper slides-wrapper--about">
        <main id="main-content" tabIndex={-1} className="about-page section section-01">
          <div className="section-content">
            <div className="section-inner">
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
          <AboutRevealColumn content={content} onMailtoClick={handleMailtoClick} />
        </div>
              </div>
            </div>
          </div>
        </main>

        {showIntroVideo ? (
          <section
            ref={introVideoWrapRef}
            className="about-intro-video-wrap section section-02"
            aria-label="인트로 영상"
          >
            <div className="section-content">
              <div className="section-inner">
                <video
                  ref={introVideoRef}
                  className="about-intro-video"
                  src={videoSrc}
                  poster={videoPoster || undefined}
                  muted
                  playsInline
                  autoPlay
                  loop
                  preload="auto"
                />
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </>
  )
}
