import { reactive, nextTick } from 'vue'
import type { Ref } from 'vue'

export type VimMode = 'insert' | 'normal'
export interface UseVimMode {
  vimMode: { insert: boolean }
  enterInsertMode: () => void
  enterNormalMode: () => void
  handleVimKey: (event: KeyboardEvent) => void
}

export function useVimMode(chatbox: Ref<HTMLTextAreaElement | null>): UseVimMode {
  const vimMode = reactive({ insert: true })

  function enterInsertMode() {
    vimMode.insert = true
    nextTick(() => {
      chatbox.value?.focus()
    })
  }

  function enterNormalMode() {
    vimMode.insert = false
    chatbox.value?.blur()
  }

  const vimKeyHandlers: Record<VimMode, Record<string, (event: KeyboardEvent) => void>> = {
    insert: {
      Escape: (event) => {
        event.preventDefault()
        enterNormalMode()
      },
    },
    normal: {
      i: (event) => {
        event.preventDefault()
        enterInsertMode()
      },
    },
  }

  function handleVimKey(event: KeyboardEvent) {
    const mode: VimMode = vimMode.insert ? 'insert' : 'normal'
    const keyMap = vimKeyHandlers[mode]
    const handler = keyMap[event.key]
    if (typeof handler === 'function') {
      handler(event)
    }
  }

  return { vimMode, enterInsertMode, enterNormalMode, handleVimKey }
}
