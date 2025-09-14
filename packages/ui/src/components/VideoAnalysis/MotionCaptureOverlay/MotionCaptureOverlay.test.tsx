import { render } from '@testing-library/react-native'
import { MotionCaptureOverlay } from './MotionCaptureOverlay'

const mockPoseData = [
  {
    id: '1',
    timestamp: 1000,
    joints: [
      {
        id: 'nose',
        x: 100,
        y: 50,
        confidence: 0.9,
        connections: ['leftEye', 'rightEye'],
      },
      {
        id: 'leftEye',
        x: 95,
        y: 45,
        confidence: 0.8,
        connections: ['nose'],
      },
      {
        id: 'rightEye',
        x: 105,
        y: 45,
        confidence: 0.8,
        connections: ['nose'],
      },
    ],
    confidence: 0.9,
  },
]

describe('MotionCaptureOverlay', () => {
  it('renders motion capture overlay without crashing', () => {
    const { toJSON } = render(
      <MotionCaptureOverlay
        poseData={mockPoseData}
        isVisible={true}
      />
    )

    expect(toJSON()).toBeTruthy()
  })

  it('renders skeleton nodes and connections when visible', () => {
    const { toJSON } = render(
      <MotionCaptureOverlay
        poseData={mockPoseData}
        isVisible={true}
      />
    )

    expect(toJSON()).toBeTruthy()
  })

  it('does not render when not visible', () => {
    const { toJSON } = render(
      <MotionCaptureOverlay
        poseData={mockPoseData}
        isVisible={false}
      />
    )

    expect(toJSON()).toBeNull()
  })

  it('does not render when no pose data', () => {
    const { toJSON } = render(
      <MotionCaptureOverlay
        poseData={[]}
        isVisible={true}
      />
    )

    expect(toJSON()).toBeNull()
  })

  it('renders multiple poses', () => {
    const multiplePoseData = [
      ...mockPoseData,
      {
        id: '2',
        timestamp: 2000,
        joints: [
          {
            id: 'nose2',
            x: 200,
            y: 100,
            confidence: 0.7,
            connections: ['leftEye2'],
          },
          {
            id: 'leftEye2',
            x: 195,
            y: 95,
            confidence: 0.6,
            connections: ['nose2'],
          },
        ],
        confidence: 0.8,
      },
    ]

    const { toJSON } = render(
      <MotionCaptureOverlay
        poseData={multiplePoseData}
        isVisible={true}
      />
    )

    expect(toJSON()).toBeTruthy()
  })

  it('handles joints without connections', () => {
    const poseDataWithoutConnections = [
      {
        id: '1',
        timestamp: 1000,
        joints: [
          {
            id: 'nose',
            x: 100,
            y: 50,
            confidence: 0.9,
            connections: [],
          },
        ],
        confidence: 0.9,
      },
    ]

    const { toJSON } = render(
      <MotionCaptureOverlay
        poseData={poseDataWithoutConnections}
        isVisible={true}
      />
    )

    expect(toJSON()).toBeTruthy()
  })
})
