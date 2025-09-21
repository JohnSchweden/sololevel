import { type Joint } from '../types/ai-analyze-video.ts'

export function mockJoints(): Joint[] {
  return [
    { id: 'nose', x: 0.5, y: 0.3, confidence: 0.9, connections: ['left_eye', 'right_eye'] },
    { id: 'left_eye', x: 0.45, y: 0.28, confidence: 0.85, connections: ['nose'] },
    { id: 'right_eye', x: 0.55, y: 0.28, confidence: 0.85, connections: ['nose'] },
  ]
}
