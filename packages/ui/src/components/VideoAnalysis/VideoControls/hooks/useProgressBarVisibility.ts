import { useLayoutEffect, useState } from 'react'
import {
  type SharedValue,
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated'

export interface UseProgressBarVisibilityReturn {
  shouldRenderNormal: boolean
  shouldRenderPersistent: boolean
}

const NORMAL_MODE_THRESHOLD = 0.03
const PERSISTENT_MODE_THRESHOLD = 0.45

const clampProgress = (value: number): number => {
  'worklet'
  if (!Number.isFinite(value)) {
    return 0
  }

  if (value < 0) {
    return 0
  }

  if (value > 1) {
    return 1
  }

  return value
}

const shouldShowNormalBar = (progress: number): boolean => {
  'worklet'
  return progress <= NORMAL_MODE_THRESHOLD
}

const shouldShowPersistentBar = (progress: number): boolean => {
  'worklet'
  return progress >= PERSISTENT_MODE_THRESHOLD
}

const scheduleUpdate = (update: () => void) => {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(update)
    return
  }

  setTimeout(update, 0)
}

export function useProgressBarVisibility(
  collapseProgressShared: SharedValue<number>
): UseProgressBarVisibilityReturn {
  const [shouldRenderNormal, setShouldRenderNormal] = useState(() => shouldShowNormalBar(0))
  const [shouldRenderPersistent, setShouldRenderPersistent] = useState(() =>
    shouldShowPersistentBar(0)
  )

  const canUseDerivedValue =
    typeof useDerivedValue === 'function' &&
    (typeof process === 'undefined' || process.env.NODE_ENV !== 'test')

  const updateNormal = (next: boolean) => {
    scheduleUpdate(() => {
      setShouldRenderNormal((prev) => (prev === next ? prev : next))
    })
  }

  const updatePersistent = (next: boolean) => {
    scheduleUpdate(() => {
      setShouldRenderPersistent((prev) => (prev === next ? prev : next))
    })
  }

  const normalVisibility = useSharedValue(shouldShowNormalBar(0))
  const persistentVisibility = useSharedValue(shouldShowPersistentBar(0))

  useLayoutEffect(() => {
    const progress = clampProgress(collapseProgressShared.value)

    const normal = shouldShowNormalBar(progress)
    const persistent = shouldShowPersistentBar(progress)

    if (normalVisibility.value !== normal) {
      normalVisibility.value = normal
    }

    if (persistentVisibility.value !== persistent) {
      persistentVisibility.value = persistent
    }

    setShouldRenderNormal(normal)
    setShouldRenderPersistent(persistent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapseProgressShared])

  if (canUseDerivedValue) {
    useDerivedValue(() => {
      'worklet'
      const progress = clampProgress(collapseProgressShared.value)
      const next = shouldShowNormalBar(progress)
      if (normalVisibility.value !== next) {
        normalVisibility.value = next
      }
      return next
    }, [collapseProgressShared])

    useDerivedValue(() => {
      'worklet'
      const progress = clampProgress(collapseProgressShared.value)
      const next = shouldShowPersistentBar(progress)
      if (persistentVisibility.value !== next) {
        persistentVisibility.value = next
      }
      return next
    }, [collapseProgressShared])
  } else {
    useAnimatedReaction(
      () => collapseProgressShared.value,
      (nextValue) => {
        const progress = clampProgress(nextValue)
        const nextNormal = shouldShowNormalBar(progress)
        const nextPersistent = shouldShowPersistentBar(progress)

        if (normalVisibility.value !== nextNormal) {
          normalVisibility.value = nextNormal
        }

        if (persistentVisibility.value !== nextPersistent) {
          persistentVisibility.value = nextPersistent
        }
      },
      [collapseProgressShared]
    )
  }

  useAnimatedReaction(
    () => normalVisibility.value,
    (next, previous) => {
      if (next !== previous) {
        runOnJS(updateNormal)(next)
      }
    },
    [normalVisibility]
  )

  useAnimatedReaction(
    () => persistentVisibility.value,
    (next, previous) => {
      if (next !== previous) {
        runOnJS(updatePersistent)(next)
      }
    },
    [persistentVisibility]
  )

  const result: UseProgressBarVisibilityReturn = {
    shouldRenderNormal,
    shouldRenderPersistent,
  }

  if (!canUseDerivedValue) {
    ;(
      result as UseProgressBarVisibilityReturn & {
        __applyProgressForTests?: (progress: number) => void
      }
    ).__applyProgressForTests = (progress: number) => {
      const clamped = clampProgress(progress)
      const nextNormal = shouldShowNormalBar(clamped)
      const nextPersistent = shouldShowPersistentBar(clamped)

      normalVisibility.value = nextNormal
      persistentVisibility.value = nextPersistent

      updateNormal(nextNormal)
      updatePersistent(nextPersistent)
    }
  }

  return result
}
