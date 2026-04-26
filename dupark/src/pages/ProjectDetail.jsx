import { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react'
import { flushSync } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { useRouteEnter } from '../context/RouteEnterContext'
import { client, urlFor } from '../lib/sanity'
import gsap from 'gsap'
import './ProjectDetail.css'

/* onLoad 전부를 기다리지 않고 상한으로 진입 — 흰 화면 최소화(나머지는 자연 로드) */
const MEDIA_ENTRANCE_CAP_MS = 750
const ENTRANCE_FADE_S = 0.16

function countProjectMedia(p) {
  if (!p) return 0
  const nImg = p.images?.length || 0
  const nVid = p.videoFileUrl || p.videoUrl ? 1 : 0
  return nImg + nVid
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
  const { start: startEnter, end: endEnter } = useRouteEnter()

  /* id 변경은 App의 key로 리마운트 — 여기서는 mount 시 맨 위 + 전역 흰 레이어 handoff (paint 전) */
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    endEnter()
  }, [endEnter])

  /* ── 데이터 패칭 (project 비움은 useLayout) ── */
  useEffect(() => {
    let ignore = false
    client
      .fetch(
        `*[_type == "project" && slug.current == $id][0]{
          "slug": slug.current,
          title, client, year, description, videoUrl,
          "videoFileUrl": videoFile.asset->url,
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
        setProject(data)
        const siblings = data.siblings || []
        const idx = siblings.findIndex((s) => s.slug === id)
        setPrev(idx > 0 ? siblings[idx - 1] : null)
        setNext(idx < siblings.length - 1 ? siblings[idx + 1] : null)
      })
    return () => {
      ignore = true
    }
  }, [id])

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
      if (!slug) return
      flushSync(() => startEnter())
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      navigate(`/${category}/${slug}`)
    },
    [navigate, category, startEnter]
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
        {(project.videoFileUrl || project.videoUrl) && (
          <div className="detail-video-wrap detail-grid-cell">
            {project.videoFileUrl ? (
              <video
                src={project.videoFileUrl}
                controls
                playsInline
                className="detail-video"
                onLoadedData={bumpMedia}
                onError={bumpMedia}
              />
            ) : (
              <iframe
                src={toEmbedUrl(project.videoUrl)}
                className="detail-video"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                onLoad={bumpMedia}
                title="Project video"
              />
            )}
          </div>
        )}
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
