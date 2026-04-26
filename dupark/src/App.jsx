import { useState, useCallback, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { RouteEnterProvider } from './context/RouteEnterContext'
import Header from './component/header'
import Footer from './component/footer'
import Home from './pages/Home'
import About from './pages/About'
import Category from './pages/Category'
import ProjectDetail from './pages/ProjectDetail'
import Loader from './component/Loader'

function CustomScrollbar() {
  const barRef   = useRef(null)
  const thumbRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    const bar   = barRef.current
    const thumb = thumbRef.current
    if (!bar || !thumb) return

    const update = () => {
      const scrollTop    = window.scrollY
      const docHeight    = document.documentElement.scrollHeight - window.innerHeight
      const scrollRatio  = docHeight > 0 ? scrollTop / docHeight : 0
      const thumbH       = Math.max(40, (window.innerHeight / document.documentElement.scrollHeight) * window.innerHeight)
      const maxTop       = window.innerHeight - thumbH

      thumb.style.height = `${thumbH}px`
      thumb.style.top    = `${scrollRatio * maxTop}px`

      bar.classList.add('active')
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => bar.classList.remove('active'), 1000)
    }

    window.addEventListener('scroll', update, { passive: true })
    return () => {
      window.removeEventListener('scroll', update)
      clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div ref={barRef} className="custom-scrollbar">
      <div ref={thumbRef} className="custom-scrollbar-thumb" />
    </div>
  )
}

function AppShell() {
  return (
    <>
      <CustomScrollbar />
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/:category" element={<Category />} />
        <Route path="/:category/:id" element={<ProjectDetail />} />
      </Routes>
      <Footer />
    </>
  )
}

function App() {
  const [loading, setLoading] = useState(() => !sessionStorage.getItem('dupark_loaded'))

  const handleLoaderComplete = useCallback(() => {
    sessionStorage.setItem('dupark_loaded', '1')
    setLoading(false)
  }, [])

  return (
    <BrowserRouter>
      <RouteEnterProvider>
        {loading && <Loader onComplete={handleLoaderComplete} />}
        <AppShell />
      </RouteEnterProvider>
    </BrowserRouter>
  )
}

export default App
