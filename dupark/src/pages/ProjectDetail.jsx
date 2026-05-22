import { useEffect, useState, useRef, useCallback, useLayoutEffect, startTransition } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useRouteEnter } from '../context/RouteEnterContext'
import { client, imageUrl } from '../lib/sanity'
import { isComingSoonTitle } from '../lib/projectComingSoon'
import { lenis } from '../lib/lenis'
import gsap from 'gsap'
import SanityAutoplayVideo from '../component/SanityAutoplayVideo'
import DetailGalleryLightbox from './DetailGalleryLightbox'
import './ProjectDetail.css'

/** 갤러리 라이트박스: 헤더·메인과 동일 1200px 미만 */
const DETAIL_LIGHTBOX_MAX_PX = 1199
const lightboxNarrowMql = () =>
  typeof window !== 'undefined'
    ? window.matchMedia(`(max-width: ${DETAIL_LIGHTBOX_MAX_PX}px)`)
    : null

const EXIT_DUR_S = 0.5
const EXIT_STAGGER_S = 0.02

/** Sanity galleryColumns — 모바일은 CSS로 2열 고정 */
function clampGalleryCols(raw) {
  const v = Number(raw)
  if (v === 3 || v === 4) return v
  return 2
}

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

function NavThumbMedia({ project, side }) {
  if (project?.coverImage) {
    return (
      <img
        src={imageUrl(project.coverImage, 200, 72)}
        alt={project.title}
        className="detail-nav-thumb-img"
      />
    )
  }
  if (project?.coverVideoUrl) {
    return (
      <SanityAutoplayVideo
        src={project.coverVideoUrl}
        poster={projectFileVideoPosterUrl(project)}
        className="detail-nav-thumb-img"
        ariaLabel={project.title}
        preload="metadata"
        loop
        stopLinkClick={false}
        dataSide={side}
      />
    )
  }
  return null
}

function toEmbedUrl(url) {
  if (!url) return null
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/)
  if (ytMatch) {
    const id = ytMatch[1]
    return `https://www.youtube.com/embed/${id}`
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  return url
}

/** 파일 `<video>`용 포스터: CMS 커버 → 갤러리 첫 장 (모바일에서 흰 화면 완화) */
function projectFileVideoPosterUrl(project) {
  if (!project) return undefined
  if (project.coverImage) return imageUrl(project.coverImage, 1200, 80)
  if (project.images?.[0]) return imageUrl(project.images[0], 1200, 80)
  return undefined
}

/** Sanity metadata.dimensions — CLS·스켈레톤 박스 비율 */
function detailGalleryImageDims(img) {
  const d = img?.dims
  if (!d || typeof d.width !== 'number' || typeof d.height !== 'number') return null
  if (d.width < 1 || d.height < 1) return null
  return { width: d.width, height: d.height }
}

/** 갤러리: 텍스트·스켈레톤은 즉시, 로드 후 이미지 페이드 (레이아웃 높이는 로드 시 Lenis 갱신) */
function DetailGalleryImageCell({
  img,
  projectTitle,
  index,
  onMediaLayout,
  enableLightbox,
  onOpenLightbox,
}) {
  const imgRef = useRef(null)
  const [loaded, setLoaded] = useState(false)
  const dims = detailGalleryImageDims(img)
  const imgSrc = imageUrl(img, 900, 76)

  const markReady = useCallback(() => {
    setLoaded(true)
    onMediaLayout()
  }, [onMediaLayout])

  useLayoutEffect(() => {
    const el = imgRef.current
    if (!el) return
    if (el.complete && el.naturalHeight > 0) markReady()
  }, [markReady, imgSrc])

  return (
    <div
      className={`detail-img-wrap detail-grid-cell${dims ? ' detail-img-wrap--has-dims' : ''}`}
      style={dims ? { aspectRatio: `${dims.width} / ${dims.height}` } : undefined}
    >
      <div
        className={`detail-img-skeleton${loaded ? ' detail-img-skeleton--hidden' : ''}`}
        aria-hidden
      />
      <img
        ref={imgRef}
        src={imgSrc}
        alt={`${projectTitle} ${index + 1}`}
        className={`detail-img${loaded ? ' detail-img--loaded' : ''}`}
        width={dims?.width}
        height={dims?.height}
        sizes="(max-width: 1199px) 50vw, 33vw"
        loading={index < 2 ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={markReady}
        onError={markReady}
      />
      {enableLightbox && onOpenLightbox ? (
        <button
          type="button"
          className="detail-img-zoom-hit"
          aria-label={`${projectTitle} 이미지 ${index + 1} 크게 보기`}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onOpenLightbox(index)
          }}
        />
      ) : null}
    </div>
  )
}

/** 뷰포트 ± 여유만큼 가까워지기 전엔 src 미 attach → ~10MB 영상 여러 개 동시 요청 방지 */
const LAZY_MEDIA_ROOT_MARGIN = '400px 0px'

function useLoadMediaWhenNear(eager) {
  const ref = useRef(null)
  const [lazyLoaded, setLazyLoaded] = useState(false)

  useEffect(() => {
    if (eager) return
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setLazyLoaded(true)
          io.disconnect()
        }
      },
      { root: null, rootMargin: LAZY_MEDIA_ROOT_MARGIN, threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [eager])

  const load = Boolean(eager) || lazyLoaded
  return [ref, load]
}

function DetailLazyFileVideo({ src, eager, onMediaLayout, poster }) {
  const [hostRef, load] = useLoadMediaWhenNear(eager)

  const onVideoReady = useCallback(() => {
    onMediaLayout()
  }, [onMediaLayout])

  return (
    <div ref={hostRef} className="detail-lazy-media-host">
      {load ? (
        <video
          src={src}
          controls
          controlsList="nodownload"
          muted
          playsInline
          /* 모바일 WebKit: metadata만으로는 첫 프레임·포스터가 안 나오는 경우 많음 → lazy 이후엔 auto */
          preload="auto"
          poster={poster || undefined}
          className="detail-video"
          onLoadedData={onVideoReady}
          onCanPlay={onVideoReady}
          onError={onVideoReady}
        />
      ) : null}
    </div>
  )
}

function DetailLazyEmbed({ embedSrc, title, onMediaLayout, eager }) {
  const [hostRef, load] = useLoadMediaWhenNear(eager)

  const onEmbedLoad = useCallback(() => {
    onMediaLayout()
  }, [onMediaLayout])

  return (
    <div ref={hostRef} className="detail-lazy-media-host">
      {load ? (
        <iframe
          src={embedSrc}
          className="detail-video"
          allow="fullscreen; picture-in-picture"
          allowFullScreen
          onLoad={onEmbedLoad}
          title={title}
        />
      ) : null}
    </div>
  )
}

export default function ProjectDetail() {
  const { category, id } = useParams()
  const navigate           = useNavigate()
  const [project, setProject]   = useState(null)
  const [prev, setPrev]         = useState(null)
  const [next, setNext]         = useState(null)
  const [entranceComplete, setEntranceComplete] = useState(false)
  const [galleryLbIndex, setGalleryLbIndex] = useState(null)
  const [lightboxNarrow, setLightboxNarrow] = useState(
    () => lightboxNarrowMql()?.matches ?? false
  )
  const navRef     = useRef(null)
  const detailLayoutRef = useRef(null)
  const detailStageRef = useRef(null)
  const exitNavInProgressRef = useRef(false)
  /* Strict Mode: 언마운트 시뮬 후 ref가 유지되면 false만 남는 경우가 있어, 마운트마다 true로 둔다 */
  const isMountedRef = useRef(true)
  const { end: endEnter } = useRouteEnter()

  /* slug( id )·카테고리가 바뀌면: 헤더/푸터 유지, 본면만 리셋 (전체 리마운트 X) */
  useLayoutEffect(() => {
    /* Lenis와 네이티브 scrollTop을 함께 동기화 — 직전 페이지(Home)에서 lock/snap 잔존 시에도 즉시 풀고 0으로 정렬 */
    lenis.start()
    lenis.scrollTo(0, { immediate: true, force: true })
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    endEnter()
    exitNavInProgressRef.current = false
    const el = detailLayoutRef.current
    if (el) el.style.removeProperty('pointer-events')
    /* flushSync + lifecycle 금지(React 19). 스택 끝에서 리셋 — 마이크로태스크는 페인트 직전에 흡수됨 */
    queueMicrotask(() => {
      setProject(null)
      setPrev(null)
      setNext(null)
      setEntranceComplete(false)
      startTransition(() => setGalleryLbIndex(null))
    })
  }, [id, category, endEnter])

  useEffect(() => {
    const mq = lightboxNarrowMql()
    if (!mq) return
    const onChange = () => {
      setLightboxNarrow(mq.matches)
      if (!mq.matches) startTransition(() => setGalleryLbIndex(null))
    }
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

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
          coverImage,
          "images": images[]{
            ...,
            "dims": asset->metadata.dimensions
          },
          galleryColumns,
          "siblings": *[_type == "project" && category._ref == ^.category._ref] | order(coalesce(order, 0) desc, _createdAt desc){
            title, "slug": slug.current, coverImage,
            "coverVideoUrl": coverVideo.asset->url
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
        setEntranceComplete(true)
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

  const notifyMediaLayout = useCallback(() => {
    lenis.resize()
  }, [])

  /* 본문·그리드: 데이터 도착 후 페이드 인 스태거 (이미지는 셀별 스켈레톤·로컬 페이드) */
  useLayoutEffect(() => {
    if (!entranceComplete || !project) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const root = detailStageRef.current
    if (!root) return
    lenis.resize()
    const textEls = root.querySelectorAll('.detail-reveal-track')
    const cells = root.querySelectorAll('.detail-grid-cell')
    const all = gsap.utils.toArray([...textEls, ...cells])
    if (all.length === 0) return
    gsap.killTweensOf(all)
    gsap.set(all, { autoAlpha: 0 })
    gsap.to(all, {
      autoAlpha: 1,
      duration: 0.8,
      stagger: 0.08,
      ease: 'power2.out',
    })
    return () => {
      gsap.killTweensOf(all)
      gsap.set(all, { autoAlpha: 1 })
    }
  }, [entranceComplete, project])

  /* prev/next 바: 퇴장 GSAP 잔여·다른 경로로 autoAlpha 가 남지 않도록 프로젝트마다 확실히 복구 */
  useLayoutEffect(() => {
    if (!project) return
    const nav = navRef.current
    if (!nav) return
    gsap.killTweensOf(nav)
    gsap.set(nav, { autoAlpha: 1 })
  }, [project, id])

  const goToSibling = useCallback(
    (slug) => {
      if (!slug || exitNavInProgressRef.current) return

      const navigateOnly = () => {
        if (!isMountedRef.current) return
        lenis.scrollTo(0, { immediate: true, force: true })
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
      /* nav(prev/next)는 여기서 페이드아웃하지 않음 — 진입 스태거가 stage 안만 다시 켜서
         nav에 autoAlpha:0 이 영구 남는 버그가 난다 */

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
        autoAlpha: 0,
        duration: EXIT_DUR_S,
        stagger: EXIT_STAGGER_S,
        ease: 'power2.in',
      })
    },
    [navigate, category, entranceComplete]
  )

  /* 스크롤 중에는 iframe(YouTube/Vimeo) 위에서도 휠이 부모로 전달되도록 pointer-events 차단 — 멈추면 다시 활성화 */
  useEffect(() => {
    let timeoutId
    const onScroll = () => {
      document.body.classList.add('dupark-is-scrolling')
      clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        document.body.classList.remove('dupark-is-scrolling')
      }, 180)
    }
    lenis.on('scroll', onScroll)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      lenis.off('scroll', onScroll)
      window.removeEventListener('scroll', onScroll)
      clearTimeout(timeoutId)
      document.body.classList.remove('dupark-is-scrolling')
    }
  }, [])

  useEffect(() => {
    if (prev?.coverImage) {
      const im = new Image()
      im.decoding = 'async'
      im.src = imageUrl(prev.coverImage, 400, 76)
    }
    if (next?.coverImage) {
      const im2 = new Image()
      im2.decoding = 'async'
      im2.src = imageUrl(next.coverImage, 400, 76)
    }
  }, [prev, next, id])

  if (!project) {
    return (
      <main id="main-content" tabIndex={-1} className="detail-page detail-page--awaiting" aria-busy="true">
        <div className="detail-entrance-overlay detail-entrance-overlay--boot" aria-hidden />
      </main>
    )
  }

  const { fileUrls: detailFileUrls, embedUrls: detailEmbedUrls } =
    collectProjectVideos(project)
  const detailGridCols = clampGalleryCols(project.galleryColumns)

  return (
    <main id="main-content" tabIndex={-1} ref={detailLayoutRef} className="detail-layout">
      <div ref={detailStageRef} className="detail-stage">
      {/* ── 왼쪽: sticky 정보 ── */}
      <aside className="detail-info">
        {project.category && (
          <div className="detail-reveal-clip">
            {/* <p className="detail-category detail-reveal-track">
              {project.category} / WORK
            </p> */}
            <p className="detail-category detail-reveal-track">
              WORK
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

      <div className={`detail-grid detail-grid--cols-${detailGridCols}`}>
        {detailFileUrls.map((src, i) => (
          <div
            key={`${project.slug}-vfile-${i}`}
            className="detail-video-wrap detail-grid-cell"
          >
            <DetailLazyFileVideo
              src={src}
              eager={i === 0}
              onMediaLayout={notifyMediaLayout}
              poster={projectFileVideoPosterUrl(project)}
            />
          </div>
        ))}
        {detailEmbedUrls.map((url, i) => (
          <div
            key={`${project.slug}-vembed-${i}`}
            className="detail-video-wrap detail-grid-cell"
          >
            <DetailLazyEmbed
              embedSrc={toEmbedUrl(url)}
              title={`${project.title} 영상 ${i + 1}`}
              onMediaLayout={notifyMediaLayout}
              eager={detailFileUrls.length === 0 && i === 0}
            />
            {/* 클릭 캐처: iframe 위에 깔린 투명 버튼.
                기본 상태에서는 iframe이 휠/터치를 빨아들이지 않도록 pointer-events 차단,
                사용자가 클릭하면 .is-active 부여 → iframe 인터랙션(재생/일시정지) 활성화 */}
            <button
              type="button"
              className="detail-video-clickcatch"
              aria-label="영상 활성화 (클릭하여 재생/조작)"
              onClick={(e) => {
                e.currentTarget.parentElement?.classList.add('is-active')
              }}
            />
          </div>
        ))}
        {project.images?.map((img, i) => {
          const imgAssetRef = img?.asset?._ref
          const cellKey = imgAssetRef
            ? `${project.slug}-img-${img?._key ?? i}-${imgAssetRef}`
            : `${project.slug}-img-${img?._key ?? i}-${imageUrl(img, 900, 76)}`
          return (
          <DetailGalleryImageCell
            key={cellKey}
            img={img}
            projectTitle={project.title}
            index={i}
            onMediaLayout={notifyMediaLayout}
            enableLightbox={lightboxNarrow}
            onOpenLightbox={setGalleryLbIndex}
          />
          )
        })}
      </div>
      </div>

      <div ref={navRef} className="detail-nav-outer">
        <div className="detail-nav">
          {prev ? (
            <Link
              to={`/${category}/${prev.slug}`}
              className="detail-nav-item detail-nav-prev"
              aria-label={`이전 프로젝트: ${prev.title}`}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                e.preventDefault()
                goToSibling(prev.slug)
              }}
            >
              <div className="detail-nav-thumb">
                <NavThumbMedia project={prev} side="prev" />
              </div>
              <div className="detail-nav-text">
                <span className="detail-nav-label">PREV</span>
                <span className="detail-nav-title">{prev.title}</span>
              </div>
            </Link>
          ) : (
            <div className="detail-nav-item detail-nav-prev disabled" aria-disabled="true">
              <div className="detail-nav-thumb" />
              <div className="detail-nav-text">
                <span className="detail-nav-label">PREV</span>
              </div>
            </div>
          )}

          {next ? (
            <Link
              to={`/${category}/${next.slug}`}
              className="detail-nav-item detail-nav-next"
              aria-label={`다음 프로젝트: ${next.title}`}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                e.preventDefault()
                goToSibling(next.slug)
              }}
            >
              <div className="detail-nav-text detail-nav-text--right">
                <span className="detail-nav-label">NEXT</span>
                <span className="detail-nav-title">{next.title}</span>
              </div>
              <div className="detail-nav-thumb">
                <NavThumbMedia project={next} side="next" />
              </div>
            </Link>
          ) : (
            <div className="detail-nav-item detail-nav-next disabled" aria-disabled="true">
              <div className="detail-nav-text detail-nav-text--right">
                <span className="detail-nav-label">NEXT</span>
              </div>
              <div className="detail-nav-thumb" />
            </div>
          )}
        </div>
      </div>

      {lightboxNarrow &&
        galleryLbIndex !== null &&
        project.images?.length > 0 && (
          <DetailGalleryLightbox
            images={project.images}
            projectTitle={project.title}
            index={galleryLbIndex}
            onClose={() => setGalleryLbIndex(null)}
            onIndexChange={setGalleryLbIndex}
          />
        )}
    </main>
  )
}
