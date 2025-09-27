<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { ChatRound } from '@/types/chat'

const props = defineProps<{
  rounds: ChatRound[]
  focusedRoundIndex: number
}>()

const emit = defineEmits<{
  (event: 'scroll-up'): void
  (event: 'reach-bottom'): void
}>()

const container = ref<HTMLElement | null>(null)
let previousScrollTop = 0

function handleScroll(event: Event) {
  const el = event.target as HTMLElement | null
  if (!el) return

  const currentScrollTop = el.scrollTop
  if (!event.isTrusted) {
    previousScrollTop = currentScrollTop
    return
  }
  if (currentScrollTop < previousScrollTop) {
    emit('scroll-up')
  } else {
    const distanceToBottom = el.scrollHeight - el.clientHeight - currentScrollTop
    if (distanceToBottom <= 8) {
      emit('reach-bottom')
    }
  }

  previousScrollTop = currentScrollTop
}

function scrollToFocusedRound(index: number) {
  const el = container.value
  if (!el) return
  const roundEls = el.querySelectorAll<HTMLElement>('.round')
  if (index >= 0 && index < roundEls.length) {
    roundEls[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
}

function scrollToBottom() {
  const el = container.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

onMounted(() => {
  const el = container.value
  if (!el) return
  previousScrollTop = el.scrollTop
  el.addEventListener('scroll', handleScroll, { passive: true })
})

onBeforeUnmount(() => {
  const el = container.value
  if (!el) return
  el.removeEventListener('scroll', handleScroll)
})

defineExpose({ scrollToFocusedRound, scrollToBottom })
</script>

<template>
  <div class="content" ref="container">
    <div
      v-for="(round, idx) in props.rounds"
      :key="`${round.id}-${idx}`"
      class="round"
      :class="{ focused: idx === props.focusedRoundIndex }"
    >
      <div class="ask">{{ round.ask }}</div>
      <div class="response" v-html="round.response"></div>
    </div>
  </div>
</template>

<style scoped>
.content {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #303030;
  box-sizing: border-box;
}

.round {
  display: flex;
  flex-direction: column;
}

.ask,
.response {
  --content-padding: 10px;
  padding: var(--content-padding);
  border: 1px solid #303030;
  box-sizing: border-box;
}

.round + .round .ask {
  margin-top: -1px;
}

.ask {
  color: #007bff;
}

.response {
  margin-top: -1px;
}

@media (prefers-color-scheme: dark) {
  .content {
    color: #ddd;
  }
}
</style>
