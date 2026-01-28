/**
 * Gesture logging utilities
 * Centralized debug instrumentation for gesture controller
 * Used for development/debugging analysis of touch gesture behavior
 */

type VideoMode = 'min' | 'normal' | 'max'

export interface ModeTransitionLogPayload {
  targetMode: VideoMode
  targetScrollPos: number
  fromScrollY: number
}

/**
 * Logs mode transition events to a local debug endpoint
 * Only triggers in development environments where debug server is running
 *
 * @param payload - Transition details: target mode, target position, and source scroll position
 * @internal - For debugging only; silently fails in production or when debug endpoint unavailable
 */
export function logModeTransition(_payload: ModeTransitionLogPayload): void {
  // Debug instrumentation removed
}

export interface MinimizeVideoLogPayload {
  targetScrollPos: number
  snapDuration: number
}

/**
 * Logs video minimize event to a local debug endpoint
 * Triggered when video is programmatically collapsed (e.g., when focusing comment input)
 *
 * @param payload - Minimize details: target scroll position and animation duration
 * @internal - For debugging only; silently fails in production or when debug endpoint unavailable
 */
export function logMinimizeVideo(_payload: MinimizeVideoLogPayload): void {
  // Debug instrumentation removed
}
