<script setup lang="ts">
import { ref, onMounted, reactive, nextTick } from 'vue'
import { Qwen } from '@/libs/Qwen/idnex'
import { models } from '@/libs/Qwen/types/models'
import * as smd from 'streaming-markdown'

interface Round {
  id: number
  ask: string
  response: string
}

// references for template elements
const content = ref<HTMLElement | null>(null)
const chatbox = ref<HTMLTextAreaElement | null>(null)
const rounds = reactive<Round[]>([])
// 当前聚焦的 round 索引
const focusedRoundIndex = ref<number>(-1)
// 是否自动跟随 scroll 到最后一条
const autoFollow = ref(true)

// Vim 模拟相关状态和逻辑
const vimMode = reactive({
  insert: true, // 仅 insert/normal 两种模式，后续可扩展
})

/**
 * 进入 insert 模式（chatbox 聚焦）
 */
function enterInsertMode() {
  vimMode.insert = true
  nextTick(() => {
    chatbox.value?.focus()
  })
}

/**
 * 进入 normal 模式（chatbox 失焦）
 */
function enterNormalMode() {
  vimMode.insert = false
  chatbox.value?.blur()
}

type VimMode = 'insert' | 'normal'
type VimKeyMap = Record<string, (event: KeyboardEvent) => void>
const vimKeyHandlers: Record<VimMode, VimKeyMap> = {
  insert: {
    Escape: (event) => {
      event.preventDefault()
      enterNormalMode()
    },
    // 可扩展 insert 模式下更多键位
  },
  normal: {
    i: (event) => {
      event.preventDefault()
      enterInsertMode()
    },
    j: (event) => {
      event.preventDefault()
      // 向下聚焦
      if (focusedRoundIndex.value < rounds.length - 1) {
        focusedRoundIndex.value++
        autoFollow.value = false
        scrollToFocusedRound()
      }
    },
    k: (event) => {
      event.preventDefault()
      // 向上聚焦
      if (focusedRoundIndex.value > 0) {
        focusedRoundIndex.value--
        autoFollow.value = false
        scrollToFocusedRound()
      }
    },
    // 可扩展 normal 模式下更多键位
  },
}

// 保留唯一实现

// 滚动到聚焦的 round
function scrollToFocusedRound() {
  nextTick(() => {
    const contentEl = content.value
    if (!contentEl) return
    const roundEls = contentEl.querySelectorAll('.round')
    const idx = focusedRoundIndex.value
    if (idx >= 0 && idx < roundEls.length) {
      const el = roundEls[idx] as HTMLElement
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  })
}

function handleVimKey(event: KeyboardEvent) {
  const mode: VimMode = vimMode.insert ? 'insert' : 'normal'
  const keyMap = vimKeyHandlers[mode]
  const handler = keyMap[event.key]
  if (typeof handler === 'function') {
    handler(event)
  }
}

const scrollToBottom = () => {
  if (!content.value) return
  content.value.scrollTop = content.value.scrollHeight
}

const createMarkdownStreamer = (round: Round) => {
  const container = document.createElement('div')
  const renderer = smd.default_renderer(container)
  const parser = smd.parser(renderer)

  return {
    append(markdown: string) {
      if (!markdown) return
      smd.parser_write(parser, markdown)
      round.response = container.innerHTML
    },
    finalize() {
      smd.parser_end(parser)
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
  await Qwen.auth()
  const session = await Qwen.new(models._30b_a3b)

  await nextTick()
  // 自动进入 insert 模式（chatbox 聚焦）
  enterInsertMode()

  // 监听 chatbox 键盘事件（Enter、Esc）
  const chatboxElement = chatbox.value
  if (!chatboxElement) {
    console.error('Chatbox element not found')
    return
  }

  chatboxElement.addEventListener('keydown', async (event) => {
    // Vim 键位处理（Esc 退出焦点）
    handleVimKey(event)

    // 仅在 insert 模式下允许发送消息
    if (vimMode.insert && event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      const chatboxEl = chatbox.value
      if (!chatboxEl) return
      const userInput = chatboxEl.value.trim()
      if (!userInput) return
      const stream = session.round(userInput)
      // 新 round 自动聚焦最后一条并自动跟随 scroll
      const nextId = rounds.length > 0 ? rounds[rounds.length - 1].id + 1 : 1
      const currentRound: Round = {
        id: nextId,
        ask: userInput,
        response: '',
      }
      rounds.push(currentRound)
      chatboxEl.value = ''
      focusedRoundIndex.value = rounds.length - 1
      autoFollow.value = true
      await nextTick()
      scrollToFocusedRound()
      const streamer = createMarkdownStreamer(rounds[rounds.length - 1])
      try {
        for await (const chunk of stream) {
          streamer.append(Qwen.extractContent(chunk))
          await nextTick()
          if (autoFollow.value) scrollToBottom()
        }
      } finally {
        streamer.finalize()
        await nextTick()
        if (autoFollow.value) scrollToBottom()
      }
    }
  })

  // normal 模式下监听窗口键盘事件（如 i 进入 insert 模式）
  window.addEventListener('keydown', (event) => {
    if (!vimMode.insert) {
      handleVimKey(event)
    }
  })
})
</script>

<template>
  <div class="container">
    <div class="content" ref="content">
      <div
        v-for="(round, idx) in rounds"
        class="round"
        :key="round.id + '-' + idx"
        :class="{ focused: idx === focusedRoundIndex }"
      >
        <div class="ask">{{ round.ask }}</div>
        <div class="response" v-html="round.response"></div>
      </div>
    </div>
    <textarea class="chatbox" ref="chatbox" :tabindex="vimMode.insert ? 0 : -1"></textarea>
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
.content {
  flex: 1;
  overflow-y: auto;
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

/* Webkit 浏览器自定义滚动条 */
*::-webkit-scrollbar {
  width: 6px;
}
*::-webkit-scrollbar-track {
  background: #f1f1f1;
}
*::-webkit-scrollbar-thumb {
  background: #888;
}
*::-webkit-scrollbar-thumb:hover {
  background: #555;
}

@media (prefers-color-scheme: dark) {
  .content {
    color: #ddd;
  }
  .chatbox {
    background-color: unset;
    color: #ddd;
    scrollbar-color: #888 #2e2e2e;
  }
  /* 深色模式下自定义滚动条轨道与滑块颜色 */
  *::-webkit-scrollbar-track {
    background: #2e2e2e;
    border-radius: 0;
  }
  *::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 0;
  }
  *::-webkit-scrollbar-thumb:hover {
    background: #666;
  }
}

.ask,
.response {
  padding: 10px;
  outline: 1px solid #303030;
}

.ask {
  color: #007bff;
}
</style>
