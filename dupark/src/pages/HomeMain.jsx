import { useEffect, useLayoutEffect, useState } from 'react'
import { client } from '../lib/sanity'
import { useRouteEnter } from '../context/RouteEnterContext'
import HomeDesktopHorizontal from './HomeDesktopHorizontal'
import HomeMainMobileGrid from './HomeMainMobileGrid'

const MOBILE_BREAKPOINT = 768

const narrowMediaQuery = () =>
  typeof window !== 'undefined'
    ? window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    : null

const CATEGORY_QUERY = `*[_type == "category"] | order(coalesce(order, 0) desc, _createdAt desc){
  _id, title, slug, coverImage, hoverImage,
  "coverVideoUrl": coverVideo.asset->url,
  "hoverVideoUrl": hoverVideo.asset->url
}`

/** `/main` — PC는 가로 그리드, 모바일은 `/m`과 같은 카테고리 그리드. 리다이렉트 없음. */
export default function HomeMain() {
  const { end: endEnter } = useRouteEnter()
  const [isNarrow, setIsNarrow] = useState(() => narrowMediaQuery()?.matches ?? false)
  const [categories, setCategories] = useState([])

  useEffect(() => {
    endEnter()
  }, [endEnter])

  useLayoutEffect(() => {
    const mq = narrowMediaQuery()
    if (!mq) return
    const onChange = (e) => setIsNarrow(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    client.fetch(CATEGORY_QUERY).then(setCategories)
  }, [])

  useLayoutEffect(() => {
    document.body.classList.add('dupark-home-content')
    return () => document.body.classList.remove('dupark-home-content')
  }, [])

  return isNarrow ? (
    <HomeMainMobileGrid categories={categories} />
  ) : (
    <main id="main-content" tabIndex={-1}>
      <HomeDesktopHorizontal categories={categories} />
    </main>
  )
}
