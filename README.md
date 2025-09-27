# QAsk

QAsk is a Vue.js-based application designed for interactive Q&A experiences.

## How to use

0. Install tempermonkey script for cors bypassing
   from proj workplace or [greasyfork](https://greasyfork.org/zh-CN/scripts/550823-gm-fetch)
1. Get token(any one is ok) from [Qwen Chat](chat.qwen.ai)
2. configure token
3. (permit cors bypassing &) begin asking & have a good day!

## Features

- User-friendly interface optimized for desktop chatting.
- Real-time question and answer streaming powered by Qwen.
- Responsive layout with auto-follow when new messages arrive.
- Vim-style keyboard shortcuts for fast input and navigation.
- Hash-based deep links that prefill prompts and toggle streaming.
- Streaming Markdown rendering with Shiki-powered code highlighting.

## Enhanced

### vimMode

- **Insert mode** activates automatically when the textarea gains focus so you can type right away.
- Press <kbd>Esc</kbd> to switch to **Normal mode**; the textarea blurs so global shortcuts become available.
- Press <kbd>i</kbd> to jump back into Insert mode without touching the mouse.
- While in Normal mode, use <kbd>j</kbd>/<kbd>k</kbd> to move the focus highlight across previous rounds; the list auto-scrolls to the active item.
- With the textarea focused, press <kbd>Enter</kbd> to send the message and <kbd>Shift</kbd>+<kbd>Enter</kbd> to insert a newline.

### hash query

- Add `q` and `stream` parameters to the URL hash to deep-link into a pre-filled conversation.
- Example: `http://localhost:5173/#q=Hello%20QAsk&stream=false` auto-sends `Hello QAsk` in a fresh session with non-streaming completions.
- `stream` accepts `true` or `false`; omit it to use the default streaming behaviour.
- The hash is parsed on load, making it easy to share reproducible prompts with teammates.

### Token bootstrap

- On first launch the app prompts for your Qwen token and stores it in `localStorage` under the `token` key.
- To rotate credentials, clear the stored token in DevTools and reload the page.
- All API calls reuse that token through a lightweight session helper in `@/libs/Qwen`.

## Tampermonkey proxy

The `tampermonkey/cors.js` userscript now exposes a `window.gm_fetch` helper that replays requests through `GM_xmlhttpRequest` with streaming support. It automatically falls back to the native `fetch` when CORS isn't a problem, while transparently bypassing cross-origin restrictions for any remote endpoint the page tries to access.

## Getting Started

1. **Clone the repository:**

```bash
git clone https://github.com/yourusername/QAsk.git
cd QAsk
```

2. **Install dependencies:**

```bash
npm install
```

3. **Run the development server:**

```bash
npm run dev
```

4. **Authorize API access:**
   - On first load the app prompts for a Qwen token. Paste a valid token to proceed.
   - You can update the token later by clearing the `token` entry in `localStorage`.
   - When developing against the official Qwen endpoints, consider enabling the Tampermonkey proxy to bypass CORS errors.

## Technologies Used

- [Vue.js](https://vuejs.org/)
- [Vite](https://vitejs.dev/)
- [Streaming Markdown](https://github.com/thetarnav/streaming-markdown) for incremental rendering.
- [Shiki](https://shiki.style/) for code highlighting.

## License

This project is licensed under the MIT License.
