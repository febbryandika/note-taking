import { useEffect, useRef } from 'react'

export const isMac =
  typeof navigator !== 'undefined' && /Mac|iP(hone|od|ad)/.test(navigator.platform)

type Combo = {
  key: string
  mod?: boolean
  shift?: boolean
}

type Options = {
  allowInInputs?: boolean
  enabled?: boolean
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return false
}

export function useKeyboardShortcut(
  combo: Combo,
  handler: (e: KeyboardEvent) => void,
  options: Options = {},
) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler
  const { allowInInputs = false, enabled = true } = options

  useEffect(() => {
    if (!enabled) return
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== combo.key.toLowerCase()) return
      const modActive = isMac ? e.metaKey : e.ctrlKey
      if ((combo.mod ?? false) !== modActive) return
      if ((combo.shift ?? false) !== e.shiftKey) return
      if (!allowInInputs && isEditableTarget(e.target)) return
      handlerRef.current(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [combo.key, combo.mod, combo.shift, allowInInputs, enabled])
}
