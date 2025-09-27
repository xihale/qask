<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Qwen } from '@/libs/Qwen/index'
import type { RoundOptions } from '@/libs/Qwen/index'

import { models } from '@/libs/Qwen/types/models'
import * as smd from 'streaming-markdown'
import { useVimMode } from '@/composables/useVimMode'
import ChatRounds from '@/components/ChatRounds.vue'
import type { ChatRound } from '@/types/chat'
import { highlightCodeBlocks } from '@/libs/highlight'

const chatbox = ref<HTMLTextAreaElement | null>(null)
const roundList = ref<InstanceType<typeof ChatRounds> | null>(null)
const rounds = ref<ChatRound[]>([])
const focusedRoundIndex = ref<number>(-1)
const autoFollow = ref(true)
const { enterInsertMode, handleVimKey } = useVimMode(chatbox)

let chatboxKeydownHandler: ((event: KeyboardEvent) => Promise<void>) | null = null
let windowKeydownHandler: ((event: KeyboardEvent) => void) | null = null
let lastChatboxElement: HTMLTextAreaElement | null = null
let roundOptionsFromHash: RoundOptions | undefined

function parseHashParams(): { stream?: boolean; query?: string } {
  const hash = window.location.hash
  if (!hash || hash.length <= 1) return {}
  const params = new URLSearchParams(hash.slice(1))
  const streamParam = params.get('stream')
  const qParam = params.get('q')

  let stream: boolean | undefined
  if (streamParam !== null) {
    stream = streamParam === 'true'
  }

  const query = qParam?.trim()

  return {
    stream,
    query: query ? query : undefined,
  }
}

function addRound(ask: string): ChatRound {
  const lastRound = rounds.value[rounds.value.length - 1]
  const nextId = lastRound ? lastRound.id + 1 : 1
  const round: ChatRound = { id: nextId, ask, response: '' }
  rounds.value.push(round)
  focusedRoundIndex.value = rounds.value.length - 1
  autoFollow.value = true
  return rounds.value[rounds.value.length - 1]
}

function moveFocus(offset: number) {
  const nextIndex = focusedRoundIndex.value + offset
  if (nextIndex < 0 || nextIndex >= rounds.value.length) return
  focusedRoundIndex.value = nextIndex
  autoFollow.value = false
  roundList.value?.scrollToFocusedRound(focusedRoundIndex.value)
}

function isRoundFocused(round: ChatRound) {
  if (focusedRoundIndex.value < 0) return false
  return rounds.value[focusedRoundIndex.value]?.id === round.id
}

function shouldAutoFollow(round: ChatRound) {
  return autoFollow.value && isRoundFocused(round)
}

function handleRoundsScrollUp() {
  autoFollow.value = false
}

function handleRoundsReachBottom() {
  autoFollow.value = true
}

const createMarkdownStreamer = (round: ChatRound) => {
  const container = document.createElement('div')
  const renderer = smd.default_renderer(container)
  const parser = smd.parser(renderer)

  return {
    async append(markdown: string) {
      if (!markdown) return
      smd.parser_write(parser, markdown)
      if (markdown.match(/```\n/)) {
        await highlightCodeBlocks(container)
      }
      round.response = container.innerHTML
    },
    async finalize() {
      smd.parser_end(parser)
      await highlightCodeBlocks(container)
      round.response = container.innerHTML
    },
  }
}

// initialize on mount

onMounted(async () => {
  const token = localStorage.getItem('token')
  if (!token || token === 'null') {
    const inputToken = prompt('Please enter your token:')
    localStorage.setItem('token', inputToken || '')
    location.reload()
    return
  }
  Qwen.setToken(token)
  // await Qwen.auth()
  const session = await Qwen.new(models._30b_a3b)
  // const session = Qwen.getTempSession()

  const { stream: streamFromHash, query } = parseHashParams()
  roundOptionsFromHash = streamFromHash !== undefined ? { stream: streamFromHash } : undefined

  if (query && session) {
    const currentRound = addRound(query)
    const stream = session.round(query, roundOptionsFromHash)

    await nextTick()
    roundList.value?.scrollToFocusedRound(focusedRoundIndex.value)

    const streamer = createMarkdownStreamer(currentRound)
    try {
      for await (const chunk of stream) {
        await streamer.append(Qwen.extractContent(chunk))
        await nextTick()
        if (shouldAutoFollow(currentRound)) roundList.value?.scrollToBottom()
      }
    } finally {
      await streamer.finalize()
      await nextTick()
      if (shouldAutoFollow(currentRound)) roundList.value?.scrollToBottom()
    }
  } else await nextTick()

  // 等待 chatbox 渲染完成
  let chatboxElement = chatbox.value
  let retry = 0
  while (!chatboxElement && retry < 5) {
    await nextTick()
    chatboxElement = chatbox.value
    retry++
  }
  if (!chatboxElement) {
    console.error('Chatbox element not found after render')
    return
  }

  lastChatboxElement = chatboxElement

  // 自动进入 insert 模式（chatbox 聚焦）
  enterInsertMode()

  chatboxKeydownHandler = async (event: KeyboardEvent) => {
    handleVimKey(event)
    if (document.activeElement === chatboxElement && event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      const chatboxEl = chatbox.value
      if (!chatboxEl) return
      const userInput = chatboxEl.value.trim()
      if (!userInput) return
      const currentRound = addRound(userInput)
      chatboxEl.value = ''
      const stream = session.round(userInput, roundOptionsFromHash)
      await nextTick()
      roundList.value?.scrollToFocusedRound(focusedRoundIndex.value)

      const streamer = createMarkdownStreamer(currentRound)
      try {
        for await (const chunk of stream) {
          await streamer.append(Qwen.extractContent(chunk))
          await nextTick()
          if (shouldAutoFollow(currentRound)) roundList.value?.scrollToBottom()
        }
      } finally {
        await streamer.finalize()
        await nextTick()
        if (shouldAutoFollow(currentRound)) roundList.value?.scrollToBottom()
      }
    }
  }

  chatboxElement.addEventListener('keydown', chatboxKeydownHandler)

  windowKeydownHandler = (event: KeyboardEvent) => {
    if (document.activeElement === chatboxElement) return

    const normalizedKey = event.key.toLowerCase()
    const keyActionMap: Record<string, () => void> = {
      j: () => moveFocus(1),
      k: () => moveFocus(-1),
    }

    const matchedAction = keyActionMap[normalizedKey]
    if (matchedAction) {
      event.preventDefault()
      matchedAction()
      return
    }

    handleVimKey(event)
  }

  window.addEventListener('keydown', windowKeydownHandler)
})

onBeforeUnmount(() => {
  if (lastChatboxElement && chatboxKeydownHandler) {
    lastChatboxElement.removeEventListener('keydown', chatboxKeydownHandler)
  }
  if (windowKeydownHandler) {
    window.removeEventListener('keydown', windowKeydownHandler)
  }
})
</script>

<template>
  <div class="container">
    <ChatRounds
      ref="roundList"
      :rounds="rounds"
      :focused-round-index="focusedRoundIndex"
      @scroll-up="handleRoundsScrollUp"
      @reach-bottom="handleRoundsReachBottom"
    />
    <textarea class="chatbox" ref="chatbox"></textarea>
  </div>
</template>

<style scoped>
.container {
  margin: auto;
  height: 100vh;
  box-sizing: border-box;
  max-width: 720px;
  width: 100vw;
  display: flex;
  flex-direction: column;

  outline: 1px solid #303030;
}
.chatbox {
  flex: 0.2;
  margin-top: 12px;
  resize: none;
  overflow-y: auto;
  border: none;
  padding: 0px 10px;
  font-size: large;
  scrollbar-width: none;
}

.chatbox:focus {
  outline: none;
}

:global(*::-webkit-scrollbar) {
  width: 6px;
}
:global(*::-webkit-scrollbar-track) {
  background: #f1f1f1;
}
:global(*::-webkit-scrollbar-thumb) {
  background: #888;
}
:global(*::-webkit-scrollbar-thumb:hover) {
  background: #555;
}

@media (prefers-color-scheme: dark) {
  .chatbox {
    background-color: unset;
    color: #ddd;
    scrollbar-color: #888 #2e2e2e;
  }
  /* 深色模式下自定义滚动条轨道与滑块颜色 */
  :global(*::-webkit-scrollbar-track) {
    background: #2e2e2e;
    border-radius: 0;
  }
  :global(*::-webkit-scrollbar-thumb) {
    background: #888;
    border-radius: 0;
  }
  :global(*::-webkit-scrollbar-thumb:hover) {
    background: #666;
  }
}
</style>
