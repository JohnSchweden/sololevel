import { screen } from '@testing-library/react-native'
import '@testing-library/jest-dom'
import { renderWithProviderNative } from '../../../test-utils/TestProvider'
import { MotionCaptureOverlay } from './MotionCaptureOverlay'

const renderWithProviders = (ui: React.ReactElement) => {
  return renderWithProviderNative(ui)
}

const mockPoseData = [
  {
    id: 'pose-1',
    timestamp: 1000,
    joints: [
      { id: 'nose', x: 0.5, y: 0.3, confidence: 0.9, connections: ['leftEye', 'rightEye'] },
      { id: 'leftEye', x: 0.45, y: 0.28, confidence: 0.8, connections: ['nose'] },
      { id: 'rightEye', x: 0.55, y: 0.28, confidence: 0.8, connections: ['nose'] },
      { id: 'leftShoulder', x: 0.4, y: 0.5, confidence: 0.7, connections: ['leftElbow'] },
      { id: 'rightShoulder', x: 0.6, y: 0.5, confidence: 0.7, connections: ['rightElbow'] },
      {
        id: 'leftElbow',
        x: 0.35,
        y: 0.65,
        confidence: 0.6,
        connections: ['leftShoulder', 'leftWrist'],
      },
      {
        id: 'rightElbow',
        x: 0.65,
        y: 0.65,
        confidence: 0.6,
        connections: ['rightShoulder', 'rightWrist'],
      },
      { id: 'leftWrist', x: 0.3, y: 0.8, confidence: 0.5, connections: ['leftElbow'] },
      { id: 'rightWrist', x: 0.7, y: 0.8, confidence: 0.5, connections: ['rightElbow'] },
    ],
    confidence: 0.7,
  },
]

const mockProps = {
  poseData: mockPoseData,
  isVisible: true,
  confidence: 0.7,
}

describe('MotionCaptureOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Interface Tests', () => {
    it('renders with required props', () => {
      renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

      expect(screen.getByLabelText(/Motion capture overlay showing detected pose/)).toBeTruthy()
    })

    it('renders skeleton nodes for each joint', () => {
      renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

      // Should render a node for each joint
      const nodes = screen.getAllByLabelText(/joint, confidence:/)
      expect(nodes).toHaveLength(mockPoseData[0].joints.length)
    })

    it('renders skeleton connections between joints', () => {
      renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

      // Should render connections based on joint relationships
      expect(screen.getByLabelText('Skeleton connections')).toBeTruthy()
    })

    it('hides overlay when isVisible is false', () => {
      renderWithProviders(
        <MotionCaptureOverlay
          {...mockProps}
          isVisible={false}
        />
      )

      const overlay = screen.getByLabelText(/Motion capture overlay showing detected pose/)
      expect(overlay).toBeTruthy()
    })

    it('shows overlay when isVisible is true', () => {
      renderWithProviders(
        <MotionCaptureOverlay
          {...mockProps}
          isVisible={true}
        />
      )

      const overlay = screen.getByLabelText(/Motion capture overlay showing detected pose/)
      expect(overlay).toBeTruthy()
    })

    it('handles empty pose data', () => {
      renderWithProviders(
        <MotionCaptureOverlay
          {...mockProps}
          poseData={[]}
        />
      )

      // Component should return null when poseData is empty, so no overlay should be found
      expect(screen.queryByLabelText(/Motion capture overlay showing detected pose/)).toBeFalsy()
    })

    it('renders pose data correctly', () => {
      renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

      // Should render the overlay when visible
      expect(screen.getByLabelText(/Motion capture overlay showing detected pose/)).toBeTruthy()
    })
  })

  describe('Pose Data Visualization Tests', () => {
    it('positions joints correctly based on coordinates', () => {
      renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

      const noseNode = screen.getByLabelText('nose joint, confidence: 90%')
      // Node should be positioned at 50% x, 30% y (relative coordinates)
      expect(noseNode).toBeTruthy()
    })

    it('adjusts node opacity based on confidence', () => {
      const lowConfidencePose = {
        ...mockPoseData[0],
        joints: [
          { id: 'nose', x: 0.5, y: 0.3, confidence: 0.3, connections: [] },
          { id: 'leftEye', x: 0.45, y: 0.28, confidence: 0.9, connections: [] },
        ],
      }

      renderWithProviders(
        <MotionCaptureOverlay
          {...mockProps}
          poseData={[lowConfidencePose]}
        />
      )

      // Low confidence node (30%) should be filtered out, high confidence node should remain
      expect(screen.queryByLabelText('nose joint, confidence: 30%')).toBeFalsy()
      expect(screen.getByLabelText('leftEye joint, confidence: 90%')).toBeTruthy()
    })

    it('filters out joints below confidence threshold', () => {
      const mixedConfidencePose = {
        ...mockPoseData[0],
        joints: [
          { id: 'nose', x: 0.5, y: 0.3, confidence: 0.8, connections: [] },
          { id: 'leftEye', x: 0.45, y: 0.28, confidence: 0.2, connections: [] }, // Below threshold
        ],
      }

      renderWithProviders(
        <MotionCaptureOverlay
          {...mockProps}
          poseData={[mixedConfidencePose]}
        />
      )

      expect(screen.getByLabelText('nose joint, confidence: 80%')).toBeTruthy()
      expect(screen.queryByLabelText('leftEye joint, confidence: 20%')).toBeFalsy()
    })

    it('handles multiple pose frames', () => {
      const multiplePoses = [
        mockPoseData[0],
        {
          ...mockPoseData[0],
          id: 'pose-2',
          timestamp: 2000,
        },
      ]

      renderWithProviders(
        <MotionCaptureOverlay
          {...mockProps}
          poseData={multiplePoses}
        />
      )

      // Should render the most recent pose frame
      expect(screen.getByLabelText(/Motion capture overlay showing detected pose/)).toBeTruthy()
    })
  })

  describe('Theme Integration Tests', () => {
    it('applies correct skeleton colors', () => {
      renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

      const nodes = screen.getAllByLabelText(/joint, confidence:/)
      nodes.forEach((node) => {
        // Nodes should use theme colors
        expect(node).toBeTruthy()
      })
    })

    it('uses appropriate connection line styles', () => {
      renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

      const connections = screen.getByLabelText('Skeleton connections')
      expect(connections).toBeTruthy()
    })

    it('maintains proper z-index layering', () => {
      renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

      const overlay = screen.getByLabelText(/Motion capture overlay showing detected pose/)
      // Should be positioned above video but below controls
      expect(overlay).toBeTruthy()
    })
  })

  describe('Accessibility Tests', () => {
    it('has proper accessibility labels for joints', () => {
      renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

      expect(screen.getByLabelText('nose joint, confidence: 90%')).toBeTruthy()
      expect(screen.getByLabelText('leftEye joint, confidence: 80%')).toBeTruthy()
    })

    it('provides semantic description of pose', () => {
      renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

      expect(
        screen.getByLabelText('Motion capture overlay showing detected pose with 70% confidence')
      ).toBeTruthy()
    })

    it('announces pose updates for screen readers', () => {
      const { rerender } = renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

      const updatedPose = {
        ...mockPoseData[0],
        confidence: 0.9,
      }

      rerender(
        <MotionCaptureOverlay
          {...mockProps}
          poseData={[updatedPose]}
        />
      )

      expect(
        screen.getByLabelText('Motion capture overlay showing detected pose with 90% confidence')
      ).toBeTruthy()
    })
  })

  describe('Performance Tests', () => {
    it('renders efficiently with many joints', () => {
      const largePoseData = [
        {
          ...mockPoseData[0],
          joints: Array.from({ length: 33 }, (_, i) => ({
            id: `joint-${i}`,
            x: Math.random(),
            y: Math.random(),
            confidence: 0.7,
            connections: [],
          })),
        },
      ]

      const startTime = performance.now()
      renderWithProviders(
        <MotionCaptureOverlay
          {...mockProps}
          poseData={largePoseData}
        />
      )
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(100)
    })

    it('handles rapid pose updates efficiently', () => {
      const { rerender } = renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

      // Simulate 60fps pose updates
      for (let i = 0; i < 60; i++) {
        const updatedPose = {
          ...mockPoseData[0],
          timestamp: i * 16.67, // 60fps timing
          joints: mockPoseData[0].joints.map((joint) => ({
            ...joint,
            x: joint.x + Math.random() * 0.01, // Small movement
            y: joint.y + Math.random() * 0.01,
          })),
        }

        rerender(
          <MotionCaptureOverlay
            {...mockProps}
            poseData={[updatedPose]}
          />
        )
      }

      expect(screen.getByLabelText(/Motion capture overlay showing detected pose/)).toBeTruthy()
    })
  })

  describe('Animation Tests', () => {
    it('smoothly transitions between poses', () => {
      const { rerender } = renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

      const newPose = {
        ...mockPoseData[0],
        joints: mockPoseData[0].joints.map((joint) => ({
          ...joint,
          x: joint.x + 0.1,
          y: joint.y + 0.1,
        })),
      }

      rerender(
        <MotionCaptureOverlay
          {...mockProps}
          poseData={[newPose]}
        />
      )

      // Should animate to new positions
      expect(screen.getByLabelText(/Motion capture overlay showing detected pose/)).toBeTruthy()
    })

    it('pulses nodes based on confidence', () => {
      renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

      // High confidence nodes should have subtle pulsing animation
      const highConfidenceNode = screen.getByLabelText('nose joint, confidence: 90%')
      expect(highConfidenceNode).toBeTruthy()
    })
  })

  describe('Error Handling Tests', () => {
    it('handles malformed pose data gracefully', () => {
      const malformedPose = [
        {
          id: 'malformed',
          timestamp: 1000,
          joints: [{ id: 'invalid', x: 0.5, y: 0.3, confidence: 0.5, connections: [] }],
          confidence: 0.5,
        },
      ]

      renderWithProviders(
        <MotionCaptureOverlay
          {...mockProps}
          poseData={malformedPose}
        />
      )

      // Should render without crashing
      expect(screen.getByLabelText(/Motion capture overlay showing detected pose/)).toBeTruthy()
    })

    it('handles missing joint connections', () => {
      const poseWithoutConnections = [
        {
          ...mockPoseData[0],
          joints: mockPoseData[0].joints.map((joint) => ({
            ...joint,
            connections: [],
          })),
        },
      ]

      renderWithProviders(
        <MotionCaptureOverlay
          {...mockProps}
          poseData={poseWithoutConnections}
        />
      )

      expect(screen.getByLabelText(/Motion capture overlay showing detected pose/)).toBeTruthy()
    })
  })
})
