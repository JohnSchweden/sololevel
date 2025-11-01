//import { log } from '@my/logging'
import { useCallback, useRef } from 'react'
//import { runOnJS } from 'react-native-reanimated'

export interface GestureEvent {
  id: string
  timestamp: number
  gestureType: string
  phase: 'begin' | 'start' | 'change' | 'end' | 'finalize'
  location: { x: number; y: number }
  translation: { x: number; y: number }
  velocity: { x: number; y: number }
  activeGestures: string[]
  conflicts: GestureConflict[]
}

export interface GestureConflict {
  conflictingGesture: string
  conflictType: 'simultaneous' | 'blocking' | 'priority'
  resolution: 'handoff' | 'cancel' | 'merge' | 'priority'
  timestamp: number
}

export interface GestureHierarchy {
  level: number
  gestureName: string
  parent?: string
  children: string[]
  priority: number
  blockingGestures: string[]
  simultaneousGestures: string[]
}

export interface UseGestureConflictDetectorReturn {
  /** Start tracking a gesture event */
  trackGestureEvent: (event: Partial<GestureEvent>) => void
  /** Detect conflicts between active gestures */
  detectConflicts: (activeGestures?: string[]) => GestureConflict[]
  /** Get current gesture hierarchy */
  getGestureHierarchy: () => GestureHierarchy[]
  /** Get gesture performance metrics */
  getPerformanceMetrics: () => {
    averageResponseTime: number
    conflictRate: number
    gestureSuccessRate: number
  }
  /** Clear gesture history */
  clearHistory: () => void
}

const GESTURE_HIERARCHY: GestureHierarchy[] = [
  {
    level: 0,
    gestureName: 'rootPan',
    children: ['progressBarCombinedGesture', 'persistentProgressBarCombinedGesture'],
    priority: 1,
    blockingGestures: ['feedbackScrollView'],
    simultaneousGestures: [],
  },
  {
    level: 1,
    gestureName: 'progressBarCombinedGesture',
    parent: 'rootPan',
    children: ['mainProgressGesture'],
    priority: 2,
    blockingGestures: ['rootPan'],
    simultaneousGestures: ['persistentProgressBarCombinedGesture'],
  },
  {
    level: 1,
    gestureName: 'persistentProgressBarCombinedGesture',
    parent: 'rootPan',
    children: ['persistentProgressGesture'],
    priority: 2,
    blockingGestures: ['rootPan'],
    simultaneousGestures: ['progressBarCombinedGesture'],
  },
  {
    level: 2,
    gestureName: 'mainProgressGesture',
    parent: 'progressBarCombinedGesture',
    children: [],
    priority: 3,
    blockingGestures: ['rootPan', 'progressBarCombinedGesture'],
    simultaneousGestures: [],
  },
  {
    level: 2,
    gestureName: 'persistentProgressGesture',
    parent: 'persistentProgressBarCombinedGesture',
    children: [],
    priority: 3,
    blockingGestures: ['rootPan', 'persistentProgressBarCombinedGesture'],
    simultaneousGestures: [],
  },
  {
    level: 0,
    gestureName: 'feedbackScrollView',
    children: [],
    priority: 0,
    blockingGestures: [],
    simultaneousGestures: ['rootPan'],
  },
]

export function useGestureConflictDetector(): UseGestureConflictDetectorReturn {
  const gestureHistoryRef = useRef<GestureEvent[]>([])
  const activeGesturesRef = useRef<Set<string>>(new Set())
  const gestureStartTimes = useRef<Map<string, number>>(new Map())
  const gestureConflicts = useRef<GestureConflict[]>([])

  const detectConflicts = useCallback((currentActiveGestures?: string[]): GestureConflict[] => {
    const activeList = currentActiveGestures ?? Array.from(activeGesturesRef.current)
    const activeSet = new Set(activeList)
    const conflicts: GestureConflict[] = []
    const timestamp = Date.now()

    for (const gesture of activeList) {
      const hierarchy = GESTURE_HIERARCHY.find((h) => h.gestureName === gesture)
      if (!hierarchy) continue

      // Check for blocking conflicts
      for (const blockingGesture of hierarchy.blockingGestures) {
        if (activeSet.has(blockingGesture)) {
          conflicts.push({
            conflictingGesture: blockingGesture,
            conflictType: 'blocking',
            resolution: 'priority',
            timestamp,
          })
        }
      }

      // Check for simultaneous conflicts that shouldn't be simultaneous
      for (const otherGesture of activeList) {
        if (otherGesture === gesture) continue

        const otherHierarchy = GESTURE_HIERARCHY.find((h) => h.gestureName === otherGesture)
        if (!otherHierarchy) continue

        // Check if gestures are at same level but not marked as simultaneous
        if (
          hierarchy.level === otherHierarchy.level &&
          !hierarchy.simultaneousGestures.includes(otherGesture)
        ) {
          conflicts.push({
            conflictingGesture: otherGesture,
            conflictType: 'simultaneous',
            resolution: hierarchy.priority > otherHierarchy.priority ? 'priority' : 'handoff',
            timestamp,
          })
        }
      }
    }

    return conflicts
  }, [])

  const trackGestureEvent = useCallback(
    (event: Partial<GestureEvent>) => {
      const now = event.timestamp ?? Date.now()
      const gestureType = event.gestureType ?? 'unknown'
      const activeGestures = activeGesturesRef.current

      if (event.phase === 'begin') {
        gestureStartTimes.current.set(gestureType, now)
        activeGestures.add(gestureType)
      } else if (event.phase === 'finalize') {
        gestureStartTimes.current.delete(gestureType)
        activeGestures.delete(gestureType)
      }

      const activeGesturesSnapshot = Array.from(activeGestures)

      const fullEvent: GestureEvent = {
        id: `${gestureType}-${now}-${Math.random()}`,
        timestamp: now,
        gestureType,
        phase: event.phase ?? 'begin',
        location: event.location ?? { x: 0, y: 0 },
        translation: event.translation ?? { x: 0, y: 0 },
        velocity: event.velocity ?? { x: 0, y: 0 },
        activeGestures: activeGesturesSnapshot,
        conflicts: [],
        ...event,
      }

      fullEvent.activeGestures = activeGesturesSnapshot

      const conflicts = detectConflicts()
      fullEvent.conflicts = conflicts

      const prevHistory = gestureHistoryRef.current
      const nextHistory =
        prevHistory.length >= 100
          ? [...prevHistory.slice(-99), fullEvent]
          : [...prevHistory, fullEvent]

      gestureHistoryRef.current = nextHistory

      if (conflicts.length > 0) {
        gestureConflicts.current = [...gestureConflicts.current, ...conflicts]
      }
    },
    [detectConflicts]
  )

  const getGestureHierarchy = useCallback((): GestureHierarchy[] => {
    const history = gestureHistoryRef.current
    const seenGestures = new Set(history.map((event) => event.gestureType))

    return GESTURE_HIERARCHY.map((hierarchy) => ({
      ...hierarchy,
      children: hierarchy.children.filter((child) => seenGestures.has(child)),
    }))
  }, [])

  const getPerformanceMetrics = useCallback(() => {
    const recentEvents = gestureHistoryRef.current.slice(-50) // Last 50 events
    const responseTimes: number[] = []
    let conflictCount = 0
    let successCount = 0

    for (const event of recentEvents) {
      // Calculate response time
      const startTime = gestureStartTimes.current.get(event.gestureType)
      if (startTime && event.phase === 'end') {
        responseTimes.push(event.timestamp - startTime)
      }

      // Count conflicts
      if (event.conflicts.length > 0) {
        conflictCount++
      }

      // Count successful completions
      if (event.phase === 'finalize' && event.conflicts.length === 0) {
        successCount++
      }
    }

    return {
      averageResponseTime:
        responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0,
      conflictRate: recentEvents.length > 0 ? conflictCount / recentEvents.length : 0,
      gestureSuccessRate: recentEvents.length > 0 ? successCount / recentEvents.length : 0,
    }
  }, [])

  const clearHistory = useCallback(() => {
    gestureHistoryRef.current = []
    activeGesturesRef.current = new Set()
    gestureStartTimes.current.clear()
    gestureConflicts.current = []
  }, [])

  return {
    trackGestureEvent,
    detectConflicts,
    getGestureHierarchy,
    getPerformanceMetrics,
    clearHistory,
  }
}
