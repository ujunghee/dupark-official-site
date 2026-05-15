import { useEffect, useLayoutEffect, useState } from 'react'
import { client } from '../lib/sanity'
import { useRouteEnter } from '../context/RouteEnterContext'
import HomeDesktopHorizontal from './HomeDesktopHorizontal'
import HomeMainMobileGrid from './HomeMainMobileGrid'

/** `/main` — 뷰포트 1200px 미만이면 2열 그리드, 그 이상은 가로 스크롤 홈 */
const MAIN_GRID_MAX_PX = 1199

const narrowMediaQuery = () =>
  typeof window !== 'undefined'
    ? window.matchMedia(`(max-width: ${MAIN_GRID_MAX_PX}px)`)
    : null

const CATEGORY_QUERY = `*[_type == "category"] | order(coalesce(order, 0) desc, _createdAt desc){
  _id, title, slug, coverImage, hoverImage,
  "coverVideoUrl": coverVideo.asset->url,
  "hoverVideoUrl": hoverVideo.asset->url
}`

/** `/main` — 넓은 화면은 가로 그리드, 1200px 미만은 `/m`과 같은 2열 카테고리 그리드. 리다이렉트 없음. */
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
