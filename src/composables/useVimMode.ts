import { nextTick } from 'vue'
import type { Ref } from 'vue'

export type VimMode = 'insert' | 'normal'
export interface UseVimMode {
  enterInsertMode: () => void
  enterNormalMode: () => void
  handleVimKey: (event: KeyboardEvent) => void
}

export function useVimMode(chatbox: Ref<HTMLTextAreaElement | null>): UseVimMode {
  function enterInsertMode() {
    nextTick(() => {
      chatbox.value?.focus()
    })
  }

  function enterNormalMode() {
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
    const chatboxElement = chatbox.value
    const mode: VimMode = document.activeElement === chatboxElement ? 'insert' : 'normal'
    const keyMap = vimKeyHandlers[mode]
    const handler = keyMap[event.key]
    if (typeof handler === 'function') {
      handler(event)
    }
  }

  return { enterInsertMode, enterNormalMode, handleVimKey }
}
