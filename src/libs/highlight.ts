import { codeToHtml } from 'shiki/bundle/full'

export async function highlightCodeBlocks(root: HTMLElement) {
  const codeBlocks = root.querySelectorAll('pre code')
  if (!codeBlocks.length) return

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  const theme = prefersDark ? 'vitesse-dark' : 'vitesse-light'

  for (const block of codeBlocks) {
    const codeElement = block as HTMLElement
    const pre = codeElement.parentElement as HTMLElement | null
    if (!pre || pre.dataset.highlighted === 'true') continue

    const candidate = codeElement.className
    if (candidate.includes(' ')) continue
    const lang = candidate
    const code = codeElement.textContent ?? ''

    try {
      const highlighted = await codeToHtml(code, {
        lang,
        theme,
      })

      const wrapper = document.createElement('div')
      wrapper.innerHTML = highlighted
      const highlightedPre = wrapper.querySelector('pre')
      if (!highlightedPre) continue

      highlightedPre.dataset.highlighted = 'true'
      pre.replaceWith(highlightedPre)
    } catch (error) {
      console.error('[highlight] failed to render code block', error)
    }
  }
}
