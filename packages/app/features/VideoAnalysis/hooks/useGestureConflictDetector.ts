//import { log } from '@my/logging'
import { useCallback, useRef, useState } from 'react'
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
  detectConflicts: (activeGestures: string[]) => GestureConflict[]
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
  const [gestureHistory, setGestureHistory] = useState<GestureEvent[]>([])
  const [activeGestures, setActiveGestures] = useState<Set<string>>(new Set())
  const gestureStartTimes = useRef<Map<string, number>>(new Map())
  const gestureConflicts = useRef<GestureConflict[]>([])

  const trackGestureEvent = useCallback(
    (event: Partial<GestureEvent>) => {
      const fullEvent: GestureEvent = {
        id: `${event.gestureType}-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        gestureType: event.gestureType || 'unknown',
        phase: event.phase || 'begin',
        location: event.location || { x: 0, y: 0 },
        translation: event.translation || { x: 0, y: 0 },
        velocity: event.velocity || { x: 0, y: 0 },
        activeGestures: Array.from(activeGestures),
        conflicts: [],
        ...event,
      }

      // Track gesture lifecycle
      if (event.phase === 'begin') {
        gestureStartTimes.current.set(fullEvent.gestureType, fullEvent.timestamp)
        setActiveGestures((prev) => {
          const newSet = new Set(prev)
          newSet.add(fullEvent.gestureType)
          return newSet
        })
      } else if (event.phase === 'finalize') {
        gestureStartTimes.current.delete(fullEvent.gestureType)
        setActiveGestures((prev) => {
          const newSet = new Set(prev)
          newSet.delete(fullEvent.gestureType)
          return newSet
        })
      }

      // Detect conflicts
      const conflicts = detectConflicts(Array.from(activeGestures))
      fullEvent.conflicts = conflicts

      setGestureHistory((prev) => [...prev.slice(-99), fullEvent]) // Keep last 100 events
      gestureConflicts.current = [...gestureConflicts.current, ...conflicts]

      // AI-powered conflict analysis
      // runOnJS(log.debug)('GestureConflictDetector', 'Event tracked', {
      //   event: fullEvent,
      //   activeGestures: Array.from(activeGestures),
      //   conflicts: conflicts.length,
      // })
    },
    [activeGestures]
  )

  const detectConflicts = useCallback((currentActiveGestures: string[]): GestureConflict[] => {
    const conflicts: GestureConflict[] = []
    const timestamp = Date.now()

    for (const gesture of currentActiveGestures) {
      const hierarchy = GESTURE_HIERARCHY.find((h) => h.gestureName === gesture)
      if (!hierarchy) continue

      // Check for blocking conflicts
      for (const blockingGesture of hierarchy.blockingGestures) {
        if (currentActiveGestures.includes(blockingGesture)) {
          conflicts.push({
            conflictingGesture: blockingGesture,
            conflictType: 'blocking',
            resolution: 'priority',
            timestamp,
          })
        }
      }

      // Check for simultaneous conflicts that shouldn't be simultaneous
      for (const otherGesture of currentActiveGestures) {
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

  const getGestureHierarchy = useCallback((): GestureHierarchy[] => {
    return GESTURE_HIERARCHY.map((hierarchy) => ({
      ...hierarchy,
      // Add runtime information
      children: hierarchy.children.filter((child) =>
        gestureHistory.some((event) => event.gestureType === child)
      ),
    }))
  }, [gestureHistory])

  const getPerformanceMetrics = useCallback(() => {
    const recentEvents = gestureHistory.slice(-50) // Last 50 events
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
  }, [gestureHistory])

  const clearHistory = useCallback(() => {
    setGestureHistory([])
    setActiveGestures(new Set())
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
