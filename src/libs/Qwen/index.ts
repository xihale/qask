import type { SessionData } from './types'
import { models, type Model } from './types/models'

const apiBase = 'https://chat.qwen.ai/api'
// const apiBase = '/api' // for Vite proxy

export class Qwen {
  static token: string | undefined
  static childrenId: string[] = []

  static setToken(token: string) {
    if (token) Qwen.token = token
  }

  static getTempSession(): Session {
    return new Session('078c6d24-3c49-499a-ab42-7716068ff459', models.coder_30b_a3b_instruct)
  }

  static getHeaders() {
    if (!Qwen.token) throw new Error('No TOKEN provided in env!')
    return {
      accept: '*/*',
      'accept-language': 'zh-CN,zh;q=0.9',
      'content-type': 'application/json',
      authorization: `Bearer ${Qwen.token}`,
    }
  }

  static async auth() {
    const result = await gm_fetch(`${apiBase}/v1/auths/`, {
      headers: Qwen.getHeaders(),
      body: null,
      method: 'GET',
    }).then((res) => res.json())

    Qwen.token = result.token
  }

  static async new(model: Model): Promise<Session> {
    const data = await gm_fetch(`${apiBase}/v2/chats/new`, {
      method: 'POST',
      headers: Qwen.getHeaders(),
      body: JSON.stringify({
        title: 'New Session',
        models: [model],
        chat_mode: 'normal',
        chat_type: 't2t',
        timestamp: Date.now(),
      }),
    }).then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`)
      }
      return res.json() as Promise<SessionData>
    })

    if (!data.success) {
      throw new Error('Failed to create new session')
    }

    return new Session(data.data.id, model)
  }

  static extractContent(chunk: string): string {
    try {
      const data = JSON.parse(chunk.replace(/^data: /, ''))
      Qwen.childrenId.push(data.id)
      if (Object.hasOwn(data, 'data')) {
        // Not Stream
        return data.data.choices[0].message.content || ''
      } else if (!Object.hasOwn(data, 'choices')) {
        // "HandShake"
        return ''
      } // Stream Content
      else return data.choices[0].delta.content
    } catch {
      return ''
    }
  }
}

export interface RoundOptions {
  stream?: boolean
  incremental_output?: boolean
}

const defaultRoundOptions: RoundOptions = {
  stream: true,
  incremental_output: true,
}

export class Session {
  model: Model

  #id: string
  #parentId: string | null = null

  constructor(id: string, model: Model = models._30b_a3b) {
    this.#id = id
    this.model = model
  }

  // 新增：流式聊天，作为 async generator 返回每个 chunk
  async *round(message: string, options?: RoundOptions): AsyncGenerator<string, void, void> {
    if (!this.#id) throw new Error('Session has no id')

    const url = `${apiBase}/v2/chat/completions?chat_id=${this.#id}`

    const body = {
      ...defaultRoundOptions,
      ...options,
      chat_id: this.#id,
      chat_mode: 'normal',
      model: this.model,
      parent_id: this.#parentId,
      messages: [
        {
          fid: crypto.randomUUID(),
          parentId: this.#parentId,
          childrenIds: [],
          role: 'user',
          content: message,
          user_action: 'chat',
          files: [],
          timestamp: Math.floor(Date.now() / 1000),
          models: [this.model],
          chat_type: 't2t',
          feature_config: {
            thinking_enabled: false,
            output_schema: 'phase',
          },
          extra: {
            meta: {
              subChatType: 't2t',
            },
          },
          sub_chat_type: 't2t',
        },
      ],
      timestamp: Math.floor(Date.now() / 1000),
    }

    const res = await gm_fetch(url, {
      method: 'POST',
      headers: Qwen.getHeaders(),
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ': ' + text : ''}`)
    }

    if (!res.body) throw new Error('Response has no body to stream')

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let begin = true

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          const chunks = decoder.decode(value)
          console.log(chunks)
          // network jam
          for (const chunk of chunks.split('\n\n')) {
            yield chunk

            if (chunk.startsWith('data: ')) {
              // extract "response_id": "xxx" in one line
              if (begin) {
                const match = chunk.match(/"response_id":"([^"]+)"/)
                this.#parentId = match![1]
                begin = false
              }
              // Stream mode
              const m = '"status": "'
              const statusIdx = chunk.lastIndexOf(m)
              if (statusIdx !== -1 && chunk.slice(statusIdx + m.length).startsWith('finished')) {
                return
              }
            }
          }
        }
      }
    } finally {
      try {
        reader.cancel().catch(() => {})
      } catch {
        // ignore
      }
    }
  }
}
