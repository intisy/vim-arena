import { useRef, useCallback, useReducer } from 'react'

export function useKeystrokeTracker() {
  const countRef = useRef(0)
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0)

  const increment = useCallback(() => {
    countRef.current += 1
    forceUpdate()
  }, [])

  const reset = useCallback(() => {
    countRef.current = 0
    forceUpdate()
  }, [])

  return { count: countRef.current, increment, reset }
}
