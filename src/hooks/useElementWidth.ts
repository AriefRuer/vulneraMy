import { useLayoutEffect, useRef, useState } from 'react'

// Observes an element's width so D3 charts redraw when the window/container
// resizes (responsive requirement). Returns [ref, width].
export function useElementWidth<T extends HTMLElement = HTMLDivElement>(): [
  React.RefObject<T | null>,
  number
] {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  return [ref as React.RefObject<T | null>, width]
}