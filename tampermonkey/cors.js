// ==UserScript==
// @name        Qwen CORS Proxy
// @author      xihale
// @description 使用 GM_xmlhttpRequest 转发 Qwen API 请求，解决跨域限制
// @namespace   xihale.top
// @license     GPL version 3
// @encoding    utf-8
// @match       *://localhost:*/*
// @match       *://q.xihale.top/*
// @grant       GM_xmlhttpRequest
// @connect     chat.qwen.ai
// @run-at      document-start
// @version     1.2.0
// ==/UserScript==

;(function () {
  'use strict'

  const TARGET_ORIGIN = 'https://chat.qwen.ai'
  const API_PREFIX = '/api/'
  const nativeFetch = window.fetch.bind(window)

  function shouldIntercept(url) {
    try {
      const parsed = new URL(url, window.location.href)
      return parsed.origin === window.location.origin && parsed.pathname.startsWith(API_PREFIX)
    } catch (error) {
      console.warn('[QwenProxy] URL 解析失败，使用原生 fetch：', url, error)
      return false
    }
  }

  function rewriteUrl(url) {
    const parsed = new URL(url, window.location.href)
    return TARGET_ORIGIN + parsed.pathname + parsed.search + parsed.hash
  }

  function headersToObject(headers) {
    const obj = {}
    headers.forEach((value, key) => {
      if (['host', 'content-length', 'origin'].includes(key.toLowerCase())) return
      obj[key] = value
    })
    return obj
  }

  function parseResponseHeaders(raw) {
    const headers = new Headers()
    if (!raw) return headers
    raw
      .trim()
      .split(/\r?\n/)
      .forEach((line) => {
        const index = line.indexOf(':')
        if (index === -1) return
        const name = line.slice(0, index).trim()
        const value = line.slice(index + 1).trim()
        if (name) headers.append(name, value)
      })
    return headers
  }

  async function gmFetch(input, init = {}) {
    const request = input instanceof Request ? input : new Request(input, init)

    if (!shouldIntercept(request.url)) {
      return nativeFetch(request)
    }

    const method = (init.method || request.method || 'GET').toUpperCase()
    const headers = new Headers(init.headers || request.headers)
    const body =
      init.body ??
      (method === 'GET' || method === 'HEAD'
        ? undefined
        : await (input instanceof Request ? input.clone().text() : request.clone().text()))

    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        url: rewriteUrl(request.url),
        method,
        headers: headersToObject(headers),
        data: body,
        responseType: 'text',
        onload(response) {
          resolve(
            new Response(response.responseText || '', {
              status: response.status,
              statusText: response.statusText,
              headers: parseResponseHeaders(response.responseHeaders),
            }),
          )
        },
        onerror() {
          reject(new TypeError('[QwenProxy] 请求失败'))
        },
        ontimeout() {
          reject(new TypeError('[QwenProxy] 请求超时'))
        },
        onabort() {
          reject(new DOMException('Aborted', 'AbortError'))
        },
      })
    })
  }

  const proxiedFetch = function (input, init) {
    return gmFetch(input, init)
  }

  window.fetch = proxiedFetch
  globalThis.fetch = proxiedFetch

  if (typeof unsafeWindow !== 'undefined') {
    unsafeWindow.fetch = proxiedFetch
  }

  console.info('[QwenProxy] 简易 Tampermonkey CORS 代理已启用')
})()
