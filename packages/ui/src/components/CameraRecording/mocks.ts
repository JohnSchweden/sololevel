// Mock for types/modules used in tests

// Mock RecordingState enum
export enum RecordingState {
  IDLE = 'idle',
  RECORDING = 'recording',
  PAUSED = 'paused',
  STOPPED = 'stopped',
}

// Mock useRecordingStateMachine hook with reactive state management
class RecordingStateMachineMock {
  private state = RecordingState.IDLE
  private duration = 0
  private formattedDuration = '00:00'
  private currentStateObject: any = null
  private config: any = null
  private timerId: NodeJS.Timeout | null = null

  constructor() {
    this.createStateObject()
  }

  setConfig(config: any) {
    this.config = config
  }

  private clearTimer() {
    if (this.timerId) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
  }

  private startMaxDurationTimer() {
    this.clearTimer()
    // Use a much shorter timeout for testing (1 second instead of 60)
    const testTimeout = process.env.NODE_ENV === 'test' ? 100 : 60000
    this.timerId = setTimeout(() => {
      this.state = RecordingState.STOPPED
      this.duration =
        Number.parseInt(process.env.EXPO_PUBLIC_MAX_RECORDING_DURATION_SECONDS || '30', 10) * 1000 // Max duration in milliseconds
      this.formattedDuration = '00:30'
      this.updateStateObject()
      // Update the isAtMaxDuration property directly on the state object
      this.currentStateObject.isAtMaxDuration = true
      if (this.config?.onStateChange) {
        this.config.onStateChange(RecordingState.STOPPED, 30000)
      }
      if (this.config?.onMaxDurationReached) {
        this.config.onMaxDurationReached()
      }
    }, testTimeout)
  }

  private createStateObject() {
    this.currentStateObject = {
      recordingState: this.state,
      duration: this.duration,
      isAtMaxDuration: false,
      startRecording: this.startRecording.bind(this),
      pauseRecording: this.pauseRecording.bind(this),
      resumeRecording: this.resumeRecording.bind(this),
      stopRecording: this.stopRecording.bind(this),
      resetRecording: this.resetRecording.bind(this),
      remainingTime:
        Number.parseInt(process.env.EXPO_PUBLIC_MAX_RECORDING_DURATION_SECONDS || '30', 10) * 1000 -
        this.duration,
      formattedDuration: this.formattedDuration,
      canRecord: this.state === RecordingState.IDLE,
      canPause: this.state === RecordingState.RECORDING,
      canResume: this.state === RecordingState.PAUSED,
      canStop: this.state === RecordingState.RECORDING || this.state === RecordingState.PAUSED,
    }
  }

  private updateStateObject() {
    Object.assign(this.currentStateObject, {
      recordingState: this.state,
      duration: this.duration,
      remainingTime:
        Number.parseInt(process.env.EXPO_PUBLIC_MAX_RECORDING_DURATION_SECONDS || '30', 10) * 1000 -
        this.duration,
      formattedDuration: this.formattedDuration,
      canRecord: this.state === RecordingState.IDLE,
      canPause: this.state === RecordingState.RECORDING,
      canResume: this.state === RecordingState.PAUSED,
      canStop: this.state === RecordingState.RECORDING || this.state === RecordingState.PAUSED,
    })
  }

  startRecording = jest.fn(() => {
    this.state = RecordingState.RECORDING
    this.duration = 0
    this.formattedDuration = '00:00'
    this.updateStateObject()
    this.startMaxDurationTimer()
    if (this.config?.onStateChange) {
      this.config.onStateChange(RecordingState.RECORDING, 0)
    }
  })

  pauseRecording = jest.fn(() => {
    this.state = RecordingState.PAUSED
    this.duration = 1000
    this.formattedDuration = '00:01'
    this.clearTimer() // Clear timer when paused
    this.updateStateObject()
    if (this.config?.onStateChange) {
      this.config.onStateChange(RecordingState.PAUSED, 1000)
    }
  })

  resumeRecording = jest.fn(() => {
    this.state = RecordingState.RECORDING
    // Keep the current duration
    this.startMaxDurationTimer() // Restart timer when resumed
    this.updateStateObject()
    if (this.config?.onStateChange) {
      this.config.onStateChange(RecordingState.RECORDING, this.duration)
    }
  })

  stopRecording = jest.fn(() => {
    this.state = RecordingState.STOPPED
    this.duration = 15000
    this.formattedDuration = '00:15'
    this.clearTimer() // Clear timer when stopped
    this.updateStateObject()
    if (this.config?.onStateChange) {
      this.config.onStateChange(RecordingState.STOPPED, 15000)
    }
  })

  resetRecording = jest.fn(() => {
    this.state = RecordingState.IDLE
    this.duration = 0
    this.formattedDuration = '00:00'
    this.clearTimer() // Clear timer when reset
    this.updateStateObject()
    if (this.config?.onStateChange) {
      this.config.onStateChange(RecordingState.IDLE, 0)
    }
  })

  getState() {
    return this.currentStateObject
  }
}

const recordingMachine = new RecordingStateMachineMock()

export const useRecordingStateMachine = jest.fn((config) => {
  // Store the config for callback purposes
  recordingMachine.setConfig(config)
  return recordingMachine.getState()
})

// Reset recording state for tests
export const resetRecordingState = () => {
  recordingMachine.resetRecording()
}

// Mock useCameraControls hook with reactive state management
class CameraControlsMock {
  private cameraType = 'back'
  private zoomLevel = 1
  private flashEnabled = false
  private gridEnabled = false
  private isSwapping = false
  private currentStateObject: any = null

  constructor() {
    this.createStateObject()
  }

  private createStateObject() {
    this.currentStateObject = {
      controls: {
        cameraType: this.cameraType,
        zoomLevel: this.zoomLevel,
        flashEnabled: this.flashEnabled,
        gridEnabled: this.gridEnabled,
        isSwapping: this.isSwapping,
      },
      actions: {
        swapCamera: this.swapCamera.bind(this),
        setZoomLevel: this.setZoomLevel.bind(this),
        toggleFlash: this.toggleFlash.bind(this),
        toggleGrid: this.toggleGrid.bind(this),
        resetSettings: this.resetSettings.bind(this),
      },
      canSwapCamera: true,
    }
  }

  private updateStateObject() {
    Object.assign(this.currentStateObject.controls, {
      cameraType: this.cameraType,
      zoomLevel: this.zoomLevel,
      flashEnabled: this.flashEnabled,
      gridEnabled: this.gridEnabled,
      isSwapping: this.isSwapping,
    })
  }

  swapCamera = jest.fn(() => {
    if (this.isSwapping) {
      return // Prevent multiple swaps
    }

    // Change camera type immediately
    this.cameraType = this.cameraType === 'back' ? 'front' : 'back'
    this.isSwapping = true
    this.updateStateObject()

    // Simulate async swap completion (reset swapping state)
    setTimeout(() => {
      this.isSwapping = false
      this.updateStateObject()
    }, 100)
  })

  setZoomLevel = jest.fn((level: number) => {
    this.zoomLevel = level
    this.updateStateObject()
  })

  toggleFlash = jest.fn(() => {
    this.flashEnabled = !this.flashEnabled
    this.updateStateObject()
  })

  toggleGrid = jest.fn(() => {
    this.gridEnabled = !this.gridEnabled
    this.updateStateObject()
  })

  resetSettings = jest.fn(() => {
    this.cameraType = 'back'
    this.zoomLevel = 1
    this.flashEnabled = false
    this.gridEnabled = false
    this.isSwapping = false
    this.updateStateObject()
  })

  getState() {
    return this.currentStateObject
  }
}

const cameraControls = new CameraControlsMock()

export const useCameraControls = jest.fn(() => {
  return cameraControls.getState()
})

// Reset camera controls state for tests
export const resetCameraControls = () => {
  cameraControls.resetSettings()
}
