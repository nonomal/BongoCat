import type { Ref } from 'vue'

import { Channel, invoke } from '@tauri-apps/api/core'
import { useDebounceFn } from '@vueuse/core'
import { reactive, ref } from 'vue'

import { INVOKE_KEY } from '@/constants'
import { useCatStore } from '@/stores/cat'

type MouseButtonValue = 'Left' | 'Right' | 'Middle'

interface MouseButtonEvent {
  kind: 'MousePress' | 'MouseRelease'
  value: MouseButtonValue
}

interface MouseMoveValue {
  x: number
  y: number
}

interface MouseMoveEvent {
  kind: 'MouseMove'
  value: MouseMoveValue
}

interface KeyboardEvent {
  kind: 'KeyboardPress' | 'KeyboardRelease'
  value: string
}

type DeviceEvent = MouseButtonEvent | MouseMoveEvent | KeyboardEvent

function getSupportKeys() {
  const files = import.meta.glob('../assets/images/keys/*.png', { eager: true })

  return Object.keys(files).map((path) => {
    return path.split('/').pop()?.replace('.png', '')
  })
}

const supportKeys = getSupportKeys()

export function useDevice() {
  const pressedMouses = ref<MouseButtonValue[]>([])
  const mousePosition = reactive<MouseMoveValue>({ x: 0, y: 0 })
  const pressedKeys = ref<string[]>([])
  const catStore = useCatStore()

  const startListening = () => {
    const channel = new Channel<DeviceEvent>()

    channel.onmessage = (message) => {
      const { kind, value } = message

      if (value === 'CapsLock') {
        handlePress(pressedKeys, 'CapsLock')

        return debounceCapsLockRelease()
      }

      switch (kind) {
        case 'MousePress':
          return handlePress(pressedMouses, value)
        case 'MouseRelease':
          return handleRelease(pressedMouses, value)
        case 'MouseMove':
          return Object.assign(mousePosition, value)
        case 'KeyboardPress':
          return handlePress(pressedKeys, normalizeKeyValue(value))
        case 'KeyboardRelease':
          return handleRelease(pressedKeys, normalizeKeyValue(value))
      }
    }

    invoke(INVOKE_KEY.START_DEVICE_LISTENING, { channel })
  }

  const debounceCapsLockRelease = useDebounceFn(() => {
    handleRelease(pressedKeys, 'CapsLock')
  }, 100)

  const handlePress = <T>(array: Ref<T[]>, value?: T) => {
    if (!value) return

    array.value = [...new Set([...array.value, value])]
  }

  const handleRelease = <T>(array: Ref<T[]>, value?: T) => {
    if (!value) return

    array.value = array.value.filter(item => item !== value)
  }

  const normalizeKeyValue = (key: string) => {
    key = key.replace(/^(Meta).*/, '$1').replace(/F(\d+)/, 'Fn')

    const isInvalidArrowKey = key.endsWith('Arrow') && catStore.mode !== 'keyboard'
    const isUnsupportedKey = !supportKeys.includes(key)

    if (isInvalidArrowKey || isUnsupportedKey) return

    return key
  }

  return {
    pressedMouses,
    mousePosition,
    pressedKeys,
    startListening,
  }
}
