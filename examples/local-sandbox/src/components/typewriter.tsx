import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

interface TypewriterProps {
  text: string
  className?: string
  speed?: number
  /** Delay before typing starts once in view. */
  startDelay?: number
  caret?: boolean
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

export function Typewriter({
  text,
  className,
  speed = 28,
  startDelay = 300,
  caret = true,
}: TypewriterProps) {
  // Lazy init: if the user prefers reduced motion, show the full text at once.
  const [displayed, setDisplayed] = useState(() => (prefersReducedMotion() ? text.length : 0))
  const [started, setStarted] = useState(() => prefersReducedMotion())
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (started) return
    const el = ref.current
    if (!el) return

    let pendingTimer: number | null = null
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          pendingTimer = window.setTimeout(() => setStarted(true), startDelay)
        }
      },
      { threshold: 0.4 },
    )
    obs.observe(el)
    return () => {
      obs.disconnect()
      if (pendingTimer !== null) window.clearTimeout(pendingTimer)
    }
  }, [started, startDelay])

  useEffect(() => {
    if (!started || displayed >= text.length) return
    const timer = setTimeout(() => {
      setDisplayed((n) => (n < text.length ? n + 1 : n))
    }, speed)
    return () => clearTimeout(timer)
  }, [started, displayed, speed, text])

  return (
    <span ref={ref} className={cn('inline-block', className)}>
      <span className="whitespace-pre-wrap">{text.slice(0, displayed)}</span>
      {caret && displayed < text.length && (
        <span className="inline-block h-[1em] w-[0.08em] translate-y-[0.15em] bg-primary-600 animate-blink" aria-hidden />
      )}
    </span>
  )
}
