/**
 * useDebounce — Delays updating a value until after a specified wait period.
 *
 * Useful for search inputs where filtering or fetching should not happen
 * on every keystroke.
 *
 * bd-248
 */

import { useState, useEffect } from 'react'

/**
 * Returns a debounced version of the provided value.
 * The returned value only updates after `delay` ms of inactivity.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
