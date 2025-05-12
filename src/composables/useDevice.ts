import type { Ref } from 'vue'

import { useDebounceFn } from '@vueuse/core'
import { onMounted, reactive, ref } from 'vue'

import { useWebsocket } from './useWebsocket'

import { useCatStore } from '@/stores/cat'

type MouseButtonValue = 'Left' | 'Right' | 'Middle'

interface MouseButtonMessage {
  kind: 'MousePress' | 'MouseRelease'
  value: MouseButtonValue
}

interface MouseMoveValue {
  x: number
  y: number
}

interface MouseMoveMessage {
  kind: 'MouseMove'
  value: MouseMoveValue
}

interface KeyboardMessage {
  kind: 'KeyboardPress' | 'KeyboardRelease'
  value: string
}

type DeviceMessage = MouseButtonMessage | MouseMoveMessage | KeyboardMessage

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
  const { onMessage } = useWebsocket()

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

  onMounted(() => {
    onMessage<DeviceMessage>((message) => {
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
    })
  })

  return {
    pressedMouses,
    mousePosition,
    pressedKeys,
  }
}
