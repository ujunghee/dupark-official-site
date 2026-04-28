import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const RouteEnterContext = createContext(null)

export function RouteEnterProvider({ children }) {
  const [active, setActive] = useState(false)
  const location = useLocation()
  const start = useCallback(() => setActive(true), [])
  const end = useCallback(() => setActive(false), [])

  /* 카드 클릭 후 상세로 가기 전에 `/` 로 빠지면 ProjectDetail 이 안 뜨고 end()가 안 불릴 수 있음.
     useLayoutEffect 로 하면 React 19 + 라우트 커밋 타이밍과 겹치며 자식 `<Routes>` 출력이 비는
     현상이 보고됨 → 페인트 이후 useEffect 로만 내림 */
  useEffect(() => {
    setActive(false)
  }, [location.pathname, location.key])

  const value = useMemo(() => ({ start, end, active }), [start, end, active])
  return (
    <RouteEnterContext.Provider value={value}>
      {active && <div className="route-enter-overlay" aria-hidden />}
      {children}
    </RouteEnterContext.Provider>
  )
}

export function useRouteEnter() {
  return useContext(RouteEnterContext) ?? { start: () => {}, end: () => {} }
}
