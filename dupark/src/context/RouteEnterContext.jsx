import { createContext, useContext, useState, useCallback, useMemo } from 'react'

const RouteEnterContext = createContext(null)

export function RouteEnterProvider({ children }) {
  const [active, setActive] = useState(false)
  const start = useCallback(() => setActive(true), [])
  const end = useCallback(() => setActive(false), [])
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
