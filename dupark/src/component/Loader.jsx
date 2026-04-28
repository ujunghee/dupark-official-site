import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import './Loader.css'

export default function Loader({ onComplete }) {
  const wrapRef = useRef(null)
  const [num, setNum] = useState(0)

  useEffect(() => {
    const counter = { val: 0 }

    gsap.to(counter, {
      val: 100,
      duration: 1,
      ease: 'power1.inOut',
      onUpdate: () => setNum(Math.floor(counter.val)),
    })

    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('loaderComplete'))
      gsap.to(wrapRef.current, {
        opacity: 0,
        duration: 0.45,
        ease: 'power2.inOut',
        onComplete,
      })
    }, 1150)

    return () => {
      clearTimeout(timer)
      gsap.killTweensOf(counter)
    }
  }, [onComplete])

  return (
    <div ref={wrapRef} className="loader">
      <span className="loader-num">{num}%</span>
    </div>
  )
}
