import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { client } from '../lib/sanity'

/* 인트로 영상/포스터 URL 을 앱 전역에 한 번만 fetch 해서 공급.
   이전에는 App.jsx / HomeDesktop.jsx / HomeMobileIntro.jsx 가 각자 동일한 GROQ 를 호출 →
   모바일 네트워크 왕복 지연이 누적됨. 이 Provider 하나로 통일해 3회 → 1회 로 축소. */

const IntroMediaContext = createContext(null)

/* 너무 늦어질 때 로더가 영원히 안 닫히는 걸 막기 위한 상한(기존 App.jsx 상수와 동일 의미) */
const INTRO_URL_FETCH_TIMEOUT_MS = 3000

export function IntroMediaProvider({ children }) {
  /* videoUrl: undefined = fetch 중, null = 영상 없음 또는 실패, string = 재생 가능한 URL */
  const [videoUrl, setVideoUrl] = useState(undefined)
  const [posterUrl, setPosterUrl] = useState(null)

  useEffect(() => {
    let resolved = false
    const resolve = (url, poster) => {
      if (resolved) return
      resolved = true
      setVideoUrl(url ?? null)
      if (poster) setPosterUrl(poster)
    }
    client
      .fetch(`*[_type == "siteSettings"][0]{
        "videoUrl": introVideo.asset->url,
        "posterUrl": introVideoPoster.asset->url
      }`)
      .then((data) => resolve(data?.videoUrl, data?.posterUrl))
      .catch(() => resolve(null, null))
    const timer = window.setTimeout(() => resolve(null, null), INTRO_URL_FETCH_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [])

  const value = useMemo(
    () => ({ videoUrl, posterUrl }),
    [videoUrl, posterUrl]
  )

  return (
    <IntroMediaContext.Provider value={value}>
      {children}
    </IntroMediaContext.Provider>
  )
}

export function useIntroMedia() {
  /* Provider 바깥에서도 안전하게 기본값 반환 — 자체 fetch 로 폴백되지 않도록 null/undefined 고정 */
  return useContext(IntroMediaContext) ?? { videoUrl: undefined, posterUrl: null }
}
