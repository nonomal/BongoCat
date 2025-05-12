import type WebSocket from '@tauri-apps/plugin-websocket'

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useWebsocketStore = defineStore('websocket', () => {
  const websocket = ref<WebSocket | null>(null)

  return {
    websocket,
  }
}, { tauri: { saveOnChange: false } })
