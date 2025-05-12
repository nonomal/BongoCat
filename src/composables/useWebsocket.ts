import WebSocket from '@tauri-apps/plugin-websocket'

import { useWebsocketStore } from '@/stores/websocket'

export interface WebsocketMessage {
  kind: string
  value?: any
}

export function useWebsocket() {
  const websocketStore = useWebsocketStore()

  const connect = async () => {
    if (websocketStore.websocket) return

    const url = 'ws://127.0.0.1:9527'

    websocketStore.websocket = await WebSocket.connect(url)
  }

  const send = async (message: WebsocketMessage) => {
    return websocketStore.websocket?.send(JSON.stringify(message))
  }

  const onMessage = <T = WebsocketMessage>(callback: (message: T) => void) => {
    websocketStore.websocket?.addListener((message) => {
      callback(JSON.parse(message.data as string))
    })
  }

  return {
    connect,
    send,
    onMessage,
  }
}
