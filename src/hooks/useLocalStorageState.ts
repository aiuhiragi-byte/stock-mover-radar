import { useCallback, useState } from 'react'
import { readJson, writeJson } from '../lib/storage'

export function useLocalStorageState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => readJson(key, initialValue))

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next
        writeJson(key, resolved)
        return resolved
      })
    },
    [key],
  )

  return [value, update] as const
}
