import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { client } from '../lib/sanity'

const IntroMediaContext = createContext(null)
const INTRO_URL_FETCH_TIMEOUT_MS = 3000

export function IntroMediaProvider({ children }) {
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
  return useContext(IntroMediaContext) ?? { videoUrl: undefined, posterUrl: null }
}
