// Mock for types/modules used in tests

// Mock RecordingState enum
export enum RecordingState {
  IDLE = 'idle',
  RECORDING = 'recording',
  PAUSED = 'paused',
  STOPPED = 'stopped',
}

// Mock useRecordingStateMachine hook
export const useRecordingStateMachine = jest.fn().mockReturnValue({
  recordingState: RecordingState.IDLE,
  duration: 0,
  isAtMaxDuration: false,
  startRecording: jest.fn(),
  pauseRecording: jest.fn(),
  resumeRecording: jest.fn(),
  stopRecording: jest.fn(),
  resetRecording: jest.fn(),
  remainingTime: 60000,
  formattedDuration: '00:00',
  canRecord: true,
  canPause: false,
  canResume: false,
  canStop: false,
})

// Mock useCameraControls hook
export const useCameraControls = jest.fn().mockReturnValue({
  controls: {
    cameraType: 'back',
    zoomLevel: 1,
    flashEnabled: false,
    gridEnabled: false,
    isSwapping: false,
  },
  actions: {
    swapCamera: jest.fn(),
    setZoomLevel: jest.fn(),
    toggleFlash: jest.fn(),
    toggleGrid: jest.fn(),
    resetSettings: jest.fn(),
  },
  canSwapCamera: true,
})
