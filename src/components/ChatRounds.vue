<script setup lang="ts">
import { ref } from 'vue'
import type { ChatRound } from '@/types/chat'

const props = defineProps<{
  rounds: ChatRound[]
  focusedRoundIndex: number
}>()

const container = ref<HTMLElement | null>(null)

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
  outline: 1px solid #303030;
}

.round {
  display: flex;
  flex-direction: column;
}

.round + .round {
  margin-top: -1px;
}

.ask,
.response {
  --content-padding: 10px;
  padding: var(--content-padding);
  outline: 1px solid #303030;
}

.ask {
  color: #007bff;
}

.response {
  margin-top: -1px;
}

.round.focused .ask,
.round.focused .response {
  border-color: #4a9eff;
}

@media (prefers-color-scheme: dark) {
  .content {
    color: #ddd;
  }
}
</style>
