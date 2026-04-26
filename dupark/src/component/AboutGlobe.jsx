import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import './AboutGlobe.css'

/* public/globe-stipple-ref.svg — 정사영 equirect(스티플) */
const MAP_URL = '/globe-stipple-ref.svg'

const SEOUL = { lat: 40.05, lng: 116.2 }
const GLOBE_R = 1.75

function latLngToVector3(lat, lng, r) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  )
}

/**
 * @param {{ className?: string }} props
 */
export default function AboutGlobe({ className = '' }) {
  const rootRef = useRef(null)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let controls = null
    let group = null
    let scene = null
    let camera = null
    let renderer = null
    let gl = null
    let ro = null
    const toDispose = { meshMat: null, meshGeo: null, groundTex: null, sprites: [] }

    const onResize = () => {
      if (!camera || !renderer) return
      const w = el.clientWidth
      const h = el.clientHeight
      if (w < 1 || h < 1) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    }

    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (controls && !reduce) controls.update()
      if (renderer && scene && camera) renderer.render(scene, camera)
    }

    const buildScene = (globeMap) => {
      scene = new THREE.Scene()
      camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
      renderer.setClearColor(0x000000, 0)
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
      el.appendChild(renderer.domElement)
      gl = renderer.domElement
      gl.classList.add('about-globe__gl')

      group = new THREE.Group()
      scene.add(group)

      const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy())
      globeMap.anisotropy = aniso
      globeMap.colorSpace = THREE.SRGBColorSpace
      globeMap.flipY = true
      globeMap.wrapS = THREE.ClampToEdgeWrapping
      globeMap.wrapT = THREE.ClampToEdgeWrapping
      globeMap.repeat.set(1, 1)
      globeMap.offset.set(0, 0)
      globeMap.generateMipmaps = true
      globeMap.minFilter = THREE.LinearMipmapLinearFilter
      globeMap.magFilter = THREE.LinearFilter
      toDispose.groundTex = globeMap

      const meshGeo = new THREE.SphereGeometry(GLOBE_R, 128, 96)
      toDispose.meshGeo = meshGeo
      const meshMat = new THREE.MeshBasicMaterial({
        map: globeMap,
        transparent: true,
        opacity: 1,
        depthWrite: true,
        side: THREE.FrontSide,
      })
      toDispose.meshMat = meshMat
      group.add(new THREE.Mesh(meshGeo, meshMat))

      const seoul = latLngToVector3(SEOUL.lat, SEOUL.lng, GLOBE_R * 1.06)
      const baseLogo = 0.5
      const sm = new THREE.SpriteMaterial({
        map: null,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        opacity: 0.95,
        rotation: 0,
      })
      const sprite = new THREE.Sprite(sm)
      toDispose.sprites.push({ sprite, mat: sm })

      new THREE.TextureLoader().load('/logo-white.svg', (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        sm.map = tex
        sm.needsUpdate = true
        const img = tex.image
        const iw = img?.width || 1
        const ih = img?.height || 1
        sprite.scale.set(baseLogo, (baseLogo * ih) / iw, 1)
      })
      sprite.position.copy(seoul)
      sprite.renderOrder = 1
      sprite.scale.set(baseLogo, baseLogo * 0.26, 1)
      group.add(sprite)

      group.rotation.set(0, 0, 0)

      const viewFrom = seoul.clone().normalize().multiplyScalar(5.2)
      camera.position.copy(viewFrom)
      camera.position.y += 0.12
      camera.lookAt(0, 0, 0)

      controls = new OrbitControls(camera, gl)
      controls.enableDamping = !reduce
      controls.dampingFactor = 0.06
      controls.minDistance = 2.6
      controls.maxDistance = 8.5
      controls.enablePan = false
      controls.rotateSpeed = reduce ? 0.85 : 0.7
      controls.target.set(0, 0, 0)
      if (reduce) controls.enableZoom = false

      onResize()
      ro = new ResizeObserver(onResize)
      ro.observe(el)
      tick()
    }

    new THREE.TextureLoader().load(MAP_URL, (globeMap) => {
      buildScene(globeMap)
    })

    return () => {
      cancelAnimationFrame(raf)
      if (ro) ro.disconnect()
      if (controls) controls.dispose()
      toDispose.meshGeo?.dispose()
      toDispose.meshMat?.dispose()
      toDispose.groundTex?.dispose()
      toDispose.sprites.forEach(({ mat }) => {
        mat.map?.dispose()
        mat.dispose()
      })
      if (group) {
        while (group.children.length) {
          const ch = group.children[0]
          group.remove(ch)
        }
        group = null
      }
      if (renderer) {
        renderer.dispose()
        if (gl && gl.parentNode === el) el.removeChild(gl)
        renderer = null
        gl = null
      }
    }
  }, [])

  return <div ref={rootRef} className={`about-globe-root ${className}`.trim()} aria-label="DUPARK — globe, drag to rotate" role="img" />
}
