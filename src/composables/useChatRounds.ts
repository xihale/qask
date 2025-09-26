import { ref, reactive, nextTick } from 'vue'

export interface Round {
  id: number
  ask: string
  response: string
}

export function useChatRounds() {
  const rounds = reactive<Round[]>([])
  const focusedRoundIndex = ref<number>(-1)
  const autoFollow = ref(true)

  function scrollToFocusedRound(content: HTMLElement | null) {
    nextTick(() => {
      if (!content) return
      const roundEls = content.querySelectorAll('.round')
      const idx = focusedRoundIndex.value
      if (idx >= 0 && idx < roundEls.length) {
        const el = roundEls[idx] as HTMLElement
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    })
  }

  function scrollToBottom(content: HTMLElement | null) {
    if (!content) return
    content.scrollTop = content.scrollHeight
  }

  function addRound(ask: string): Round {
    const nextId = rounds.length > 0 ? rounds[rounds.length - 1].id + 1 : 1
    const round: Round = { id: nextId, ask, response: '' }
    rounds.push(round)
    focusedRoundIndex.value = rounds.length - 1
    autoFollow.value = true
    return round
  }

  return {
    rounds,
    focusedRoundIndex,
    autoFollow,
    scrollToFocusedRound,
    scrollToBottom,
    addRound,
  }
}
