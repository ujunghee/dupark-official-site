import { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRouteEnter } from '../context/RouteEnterContext'
import { client, urlFor } from '../lib/sanity'
import { isComingSoonTitle } from '../lib/projectComingSoon'
import gsap from 'gsap'
import './ProjectDetail.css'

/* onLoad 전부를 기다리지 않고 상한으로 진입 — 흰 화면 최소화(나머지는 자연 로드) */
const MEDIA_ENTRANCE_CAP_MS = 750
const ENTRANCE_FADE_S = 0.16
/* 퇴장: 진입(아래→위)과 반대 — 위 block부터 아래로 스태거, 아래로 내려가며 사라짐 */
const EXIT_Y = 40
const EXIT_DUR_S = 0.5
const EXIT_STAGGER_S = 0.05

function collectProjectVideos(p) {
  if (!p) return { fileUrls: [], embedUrls: [] }
  const fileUrls = []
  if (p.videoFileUrl) fileUrls.push(p.videoFileUrl)
  const extraFiles = p.videoFileUrls
  if (Array.isArray(extraFiles)) {
    for (const u of extraFiles) {
      if (u && !fileUrls.includes(u)) fileUrls.push(u)
    }
  }
  const embedUrls = []
  if (p.videoUrl) embedUrls.push(p.videoUrl)
  if (Array.isArray(p.videoUrls)) {
    for (const u of p.videoUrls) {
      if (u && u !== p.videoUrl && !embedUrls.includes(u)) embedUrls.push(u)
    }
  }
  return { fileUrls, embedUrls }
}

function countProjectMedia(p) {
  if (!p) return 0
  const nImg = p.images?.length || 0
  const { fileUrls, embedUrls } = collectProjectVideos(p)
  return nImg + fileUrls.length + embedUrls.length
}

function toEmbedUrl(url) {
  if (!url) return null
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/)
  if (ytMatch) {
    const id = ytMatch[1]
    return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0&playsinline=1`
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1&loop=1&controls=0&title=0&byline=0&portrait=0`
  return url
}

export default function ProjectDetail() {
  const { category, id } = useParams()
  const navigate           = useNavigate()
  const [project, setProject]   = useState(null)
  const [prev, setPrev]         = useState(null)
  const [next, setNext]         = useState(null)
  const [entranceComplete, setEntranceComplete] = useState(false)
  const [mediaAllLoaded, setMediaAllLoaded] = useState(false)
  const navRef     = useRef(null)
  const detailLayoutRef = useRef(null)
  const entranceOverlayRef = useRef(null)
  const mediaDoneRef = useRef(0)
  const expectedMediaRef = useRef(0)
  const detailStageRef = useRef(null)
  const exitNavInProgressRef = useRef(false)
  /* Strict Mode: 언마운트 시뮬 후 ref가 유지되면 false만 남는 경우가 있어, 마운트마다 true로 둔다 */
  const isMountedRef = useRef(true)
  const { end: endEnter } = useRouteEnter()

  /* slug( id )·카테고리가 바뀌면: 헤더/푸터 유지, 본면만 리셋 (전체 리마운트 X) */
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    endEnter()
    exitNavInProgressRef.current = false
    const el = detailLayoutRef.current
    if (el) el.style.removeProperty('pointer-events')
    expectedMediaRef.current = 0
    mediaDoneRef.current = 0
    /* flushSync + lifecycle 금지(React 19). 스택 끝에서 리셋 — 마이크로태스크는 페인트 직전에 흡수됨 */
    queueMicrotask(() => {
      setProject(null)
      setPrev(null)
      setNext(null)
      setEntranceComplete(false)
      setMediaAllLoaded(false)
    })
  }, [id, category, endEnter])

  /* ── 데이터 패칭 (project 비움은 useLayout) ── */
  useEffect(() => {
    let ignore = false
    client
      .fetch(
        `*[_type == "project" && slug.current == $id][0]{
          "slug": slug.current,
          title, client, year, description, videoUrl, videoUrls,
          "videoFileUrl": videoFile.asset->url,
          "videoFileUrls": videoFiles[].asset->url,
          "category": category->title,
          "categorySlug": category->slug,
          coverImage, images,
          "siblings": *[_type == "project" && category._ref == ^.category._ref] | order(order asc, _createdAt desc){
            title, "slug": slug.current, coverImage
          }
        }`,
        { id }
      )
      .then((data) => {
        if (ignore) return
        if (!data) {
          setProject(null)
          return
        }
        if (isComingSoonTitle(data.title)) {
          navigate(`/${category}`, { replace: true })
          return
        }
        setProject(data)
        const siblings = (data.siblings || []).filter(
          (s) => !isComingSoonTitle(s.title)
        )
        const idx = siblings.findIndex((s) => s.slug === id)
        setPrev(idx > 0 ? siblings[idx - 1] : null)
        setNext(idx < siblings.length - 1 ? siblings[idx + 1] : null)
      })
    return () => {
      ignore = true
    }
  }, [id, category, navigate])

  useLayoutEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const bumpMedia = useCallback(() => {
    const exp = expectedMediaRef.current
    /* onLoad가 useLayout(기대 수 확정)보다 먼저 나면 1 >= 0으로 잘못 완료됨 → 본문 깜빡임 */
    if (exp < 1) return
    mediaDoneRef.current += 1
    if (mediaDoneRef.current >= exp) {
      setMediaAllLoaded(true)
    }
  }, [])

  /* paint 전에 기대 수 확정(캐시된 이미지 onLoad 레이스 방지) */
  useLayoutEffect(() => {
    if (!project) {
      expectedMediaRef.current = 0
      return
    }
    const t = countProjectMedia(project)
    expectedMediaRef.current = t
    mediaDoneRef.current = 0
    if (t === 0) {
      queueMicrotask(() => setMediaAllLoaded(true))
    } else {
      queueMicrotask(() => setMediaAllLoaded(false))
    }
  }, [project, id])

  /* onLoad 대기 + 상한(늦는 iframe/이미지로 흰 화면 무한 방지) */
  useEffect(() => {
    if (!project) return
    const n = countProjectMedia(project)
    if (n === 0 || mediaAllLoaded) return
    const tid = window.setTimeout(() => {
      setMediaAllLoaded(true)
    }, MEDIA_ENTRANCE_CAP_MS)
    return () => window.clearTimeout(tid)
  }, [project, id, mediaAllLoaded])

  /* 흰 오버레이 페이드: 미디어 onLoad 완료 또는 CAP 도달 후 */
  useEffect(() => {
    if (!project || !mediaAllLoaded) return
    if (entranceComplete) return

    const total = countProjectMedia(project)
    if (total === 0) {
      queueMicrotask(() => setEntranceComplete(true))
      return
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const el = entranceOverlayRef.current
    if (reduce) {
      if (el) gsap.set(el, { autoAlpha: 0 })
      queueMicrotask(() => setEntranceComplete(true))
      return
    }
    if (!el) {
      queueMicrotask(() => setEntranceComplete(true))
      return
    }
    gsap.killTweensOf(el)
    gsap.fromTo(
      el,
      { autoAlpha: 1 },
      {
        autoAlpha: 0,
        duration: ENTRANCE_FADE_S,
        ease: 'power2.out',
        onComplete: () => setEntranceComplete(true),
      }
    )
  }, [project, mediaAllLoaded, entranceComplete, id])

  /* 본문·그리드: 흰 오버레이 제거 뒤 아래→위 스태거 */
  useLayoutEffect(() => {
    if (!entranceComplete || !project) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const root = detailStageRef.current
    if (!root) return
    const textEls = root.querySelectorAll('.detail-reveal-track')
    const cells = root.querySelectorAll('.detail-grid-cell')
    const all = gsap.utils.toArray([...textEls, ...cells])
    if (all.length === 0) return
    gsap.killTweensOf(all)
    gsap.fromTo(
      all,
      { y: 36, autoAlpha: 0 },
      {
        y: 0,
        autoAlpha: 1,
        duration: 0.8,
        stagger: 0.08,
        ease: 'power3.out',
      }
    )
    return () => {
      gsap.killTweensOf(all)
    }
  }, [entranceComplete, project])

  const goToSibling = useCallback(
    (slug) => {
      if (!slug || exitNavInProgressRef.current) return

      const navigateOnly = () => {
        if (!isMountedRef.current) return
        window.scrollTo(0, 0)
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
        /* 같은 라우트 컴포넌트·detail만 id 변경 — 전역 흰 레이어(startEnter) 없이 URL만 갱신 */
        navigate(`/${category}/${slug}`)
      }

      if (!entranceComplete) {
        navigateOnly()
        return
      }

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        navigateOnly()
        return
      }

      const root = detailStageRef.current
      if (!root) {
        navigateOnly()
        return
      }

      const textEls = root.querySelectorAll('.detail-reveal-track')
      const cells = root.querySelectorAll('.detail-grid-cell')
      const all = gsap.utils.toArray([...textEls, ...cells])
      const navEl = navRef.current
      if (navEl) all.push(navEl)

      if (all.length === 0) {
        navigateOnly()
        return
      }

      exitNavInProgressRef.current = true
      const mainEl = detailLayoutRef.current
      if (mainEl) mainEl.style.pointerEvents = 'none'

      gsap.killTweensOf(all)
      const tl = gsap.timeline({
        onComplete: () => {
          if (!isMountedRef.current) {
            exitNavInProgressRef.current = false
            return
          }
          navigateOnly()
        },
      })
      tl.to(all, {
        y: EXIT_Y,
        autoAlpha: 0,
        duration: EXIT_DUR_S,
        stagger: EXIT_STAGGER_S,
        ease: 'power2.in',
      })
    },
    [navigate, category, entranceComplete]
  )

  useEffect(() => {
    if (prev?.coverImage) {
      const im = new Image()
      im.decoding = 'async'
      im.src = urlFor(prev.coverImage).width(400).url()
    }
    if (next?.coverImage) {
      const im2 = new Image()
      im2.decoding = 'async'
      im2.src = urlFor(next.coverImage).width(400).url()
    }
  }, [prev, next, id])

  if (!project) {
    return (
      <main className="detail-page detail-page--awaiting" aria-busy="true">
        <div className="detail-entrance-overlay detail-entrance-overlay--boot" aria-hidden />
      </main>
    )
  }

  const mediaCount = countProjectMedia(project)
  const showEntranceLayer = mediaCount > 0 && !entranceComplete
  const mainContentVisible = entranceComplete
  const { fileUrls: detailFileUrls, embedUrls: detailEmbedUrls } =
    collectProjectVideos(project)

  return (
    <main ref={detailLayoutRef} className="detail-layout">
      {showEntranceLayer && (
        <div
          ref={entranceOverlayRef}
          className="detail-entrance-overlay"
          aria-hidden
        />
      )}

      {/* aside+그리드만 가림: prev/next는 stage 밖 — 호버·프리뷰가 막히지 않게 */}
      <div
        ref={detailStageRef}
        className={`detail-stage${!mainContentVisible ? ' detail-stage--conceal' : ''}`}
        aria-hidden={!mainContentVisible}
      >
      {/* ── 왼쪽: sticky 정보 ── */}
      <aside className="detail-info">
        {project.category && (
          <div className="detail-reveal-clip">
            <p className="detail-category detail-reveal-track">
              {project.category} / WORK
            </p>
          </div>
        )}
        <div className="detail-reveal-clip">
          <h1 className="detail-title detail-reveal-track">{project.title}</h1>
        </div>
        {project.client && (
          <div className="detail-reveal-clip">
            <p className="detail-client detail-reveal-track">{project.client}</p>
          </div>
        )}
        {project.description && (
          <div className="detail-reveal-clip">
            <p className="detail-desc detail-reveal-track">{project.description}</p>
          </div>
        )}
        {project.year && (
          <div className="detail-year-block">
            <div className="detail-reveal-clip">
              <p className="detail-label detail-reveal-track">YEAR</p>
            </div>
            <div className="detail-reveal-clip">
              <p className="detail-year detail-reveal-track">{project.year}</p>
            </div>
          </div>
        )}
      </aside>

      <div className="detail-grid">
        {detailFileUrls.map((src, i) => (
          <div
            key={`${project.slug}-vfile-${i}`}
            className="detail-video-wrap detail-grid-cell"
          >
            <video
              src={src}
              controls
              playsInline
              className="detail-video"
              onLoadedData={bumpMedia}
              onError={bumpMedia}
            />
          </div>
        ))}
        {detailEmbedUrls.map((url, i) => (
          <div
            key={`${project.slug}-vembed-${i}`}
            className="detail-video-wrap detail-grid-cell"
          >
            <iframe
              src={toEmbedUrl(url)}
              className="detail-video"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              onLoad={bumpMedia}
              title={`${project.title} 영상 ${i + 1}`}
            />
          </div>
        ))}
        {project.images?.map((img, i) => (
          <div key={`${project.slug}-${i}`} className="detail-img-wrap detail-grid-cell">
            <img
              src={urlFor(img).width(900).url()}
              alt={`${project.title} ${i + 1}`}
              className="detail-img"
              onLoad={bumpMedia}
              onError={bumpMedia}
            />
          </div>
        ))}
      </div>
      </div>

      <div ref={navRef} className="detail-nav-outer">
        <div className="detail-nav">
          <div
            className={`detail-nav-item detail-nav-prev${prev ? '' : ' disabled'}`}
            onClick={() => prev && goToSibling(prev.slug)}
          >
            <div className="detail-nav-thumb">
              {prev?.coverImage && (
                <img
                  src={urlFor(prev.coverImage).width(200).url()}
                  alt={prev.title}
                  className="detail-nav-thumb-img"
                />
              )}
            </div>
            <div className="detail-nav-text">
              <span className="detail-nav-label">PREV</span>
              {prev && <span className="detail-nav-title">{prev.title}</span>}
            </div>
          </div>

          <div
            className={`detail-nav-item detail-nav-next${next ? '' : ' disabled'}`}
            onClick={() => next && goToSibling(next.slug)}
          >
            <div className="detail-nav-text detail-nav-text--right">
              <span className="detail-nav-label">NEXT</span>
              {next && <span className="detail-nav-title">{next.title}</span>}
            </div>
            <div className="detail-nav-thumb">
              {next?.coverImage && (
                <img
                  src={urlFor(next.coverImage).width(200).url()}
                  alt={next.title}
                  className="detail-nav-thumb-img"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
