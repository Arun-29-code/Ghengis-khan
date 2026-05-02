// Auto-logout after a period of user inactivity.
//
// Watches for mouse, keyboard, scroll, and touch events anywhere on the page.
// Each event resets a countdown. If the countdown hits zero with no activity,
// the supplied `onTimeout` callback fires — typically a sign-out action.
//
// Resets are throttled to once per second so a moving mouse doesn't recreate
// the underlying timer hundreds of times.

'use client'

import { useEffect, useRef } from 'react'

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const
const THROTTLE_MS = 1000

export function useIdleTimeout(timeoutMs: number, onTimeout: () => void) {
  const onTimeoutRef = useRef(onTimeout)
  useEffect(() => {
    onTimeoutRef.current = onTimeout
  })

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null
    let lastReset = 0

    const start = () => {
      timerId = setTimeout(() => onTimeoutRef.current(), timeoutMs)
    }

    const reset = () => {
      const now = Date.now()
      if (now - lastReset < THROTTLE_MS) return
      lastReset = now
      if (timerId) clearTimeout(timerId)
      start()
    }

    start()
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, reset, { passive: true })
    }

    return () => {
      if (timerId) clearTimeout(timerId)
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, reset)
      }
    }
  }, [timeoutMs])
}
