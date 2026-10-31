import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const subscribe = React.useCallback((onChange: () => void) => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    mediaQuery.addEventListener("change", onChange)
    return () => mediaQuery.removeEventListener("change", onChange)
  }, [])
  const getSnapshot = React.useCallback(
    () => window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches,
    []
  )

  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}
