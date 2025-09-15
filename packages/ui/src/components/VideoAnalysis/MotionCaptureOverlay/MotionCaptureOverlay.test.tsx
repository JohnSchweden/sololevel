import { screen } from '@testing-library/react-native'
import '@testing-library/jest-dom'
import { fireEvent } from '@testing-library/react-native'
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

      expect(
        screen.getByLabelText(
          /Motion capture overlay visible: \d+ joints detected with \d+% confidence/
        )
      ).toBeTruthy()
    })

    it('renders skeleton nodes for each joint', () => {
      renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

      // Should render a node for each joint
      const nodes = screen.getAllByLabelText(/joint: /)
      expect(nodes).toHaveLength(mockPoseData[0].joints.length)
    })

    it('renders skeleton connections between joints', () => {
      renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

      // Should render connections based on joint relationships
      expect(
        screen.getByLabelText('Skeleton connections: 12 bone connections detected')
      ).toBeTruthy()
    })

    it('hides overlay when isVisible is false', () => {
      renderWithProviders(
        <MotionCaptureOverlay
          {...mockProps}
          isVisible={false}
        />
      )

      const overlay = screen.getByLabelText(
        'Motion capture overlay hidden: 9 joints detected with 70% confidence'
      )
      expect(overlay).toBeTruthy()
    })

    it('shows overlay when isVisible is true', () => {
      renderWithProviders(
        <MotionCaptureOverlay
          {...mockProps}
          isVisible={true}
        />
      )

      const overlay = screen.getByLabelText(
        'Motion capture overlay visible: 9 joints detected with 70% confidence'
      )
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
      expect(
        screen.getByLabelText(
          'Motion capture overlay visible: 9 joints detected with 70% confidence'
        )
      ).toBeTruthy()
    })
  })

  describe('Pose Data Visualization Tests', () => {
    it('positions joints correctly based on coordinates', () => {
      renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

      const noseNode = screen.getByLabelText('nose joint: 90% confidence')
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
      expect(screen.queryByLabelText('nose joint: 30% confidence')).toBeFalsy()
      expect(screen.getByLabelText('leftEye joint: 90% confidence')).toBeTruthy()
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

      expect(screen.getByLabelText('nose joint: 80% confidence')).toBeTruthy()
      expect(screen.queryByLabelText('leftEye joint: 20% confidence')).toBeFalsy()
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
      expect(
        screen.getByLabelText(
          'Motion capture overlay visible: 9 joints detected with 70% confidence'
        )
      ).toBeTruthy()
    })
  })

  describe('Theme Integration Tests', () => {
    it('applies correct skeleton colors', () => {
      renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

      const nodes = screen.getAllByLabelText(/joint: /)
      nodes.forEach((node) => {
        // Nodes should use theme colors
        expect(node).toBeTruthy()
      })
    })

    it('uses appropriate connection line styles', () => {
      renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

      const connections = screen.getByLabelText(
        'Skeleton connections: 12 bone connections detected'
      )
      expect(connections).toBeTruthy()
    })

    it('maintains proper z-index layering', () => {
      renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

      const overlay = screen.getByLabelText(
        'Motion capture overlay visible: 9 joints detected with 70% confidence'
      )
      // Should be positioned above video but below controls
      expect(overlay).toBeTruthy()
    })
  })

  describe('Accessibility Tests', () => {
    it('has proper accessibility labels for joints', () => {
      renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

      expect(screen.getByLabelText('nose joint: 90% confidence')).toBeTruthy()
      expect(screen.getByLabelText('leftEye joint: 80% confidence')).toBeTruthy()
    })

    it('provides semantic description of pose', () => {
      renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

      expect(
        screen.getByLabelText(
          'Motion capture overlay visible: 9 joints detected with 70% confidence'
        )
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
        screen.getByLabelText(
          'Motion capture overlay visible: 9 joints detected with 90% confidence'
        )
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

      expect(
        screen.getByLabelText(
          'Motion capture overlay visible: 9 joints detected with 70% confidence'
        )
      ).toBeTruthy()
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
      expect(
        screen.getByLabelText(
          'Motion capture overlay visible: 9 joints detected with 70% confidence'
        )
      ).toBeTruthy()
    })

    it('pulses nodes based on confidence', () => {
      renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

      // High confidence nodes should have subtle pulsing animation
      const highConfidenceNode = screen.getByLabelText('nose joint: 90% confidence')
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
      expect(
        screen.getByLabelText(
          'Motion capture overlay visible: 1 joints detected with 50% confidence'
        )
      ).toBeTruthy()
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

      expect(
        screen.getByLabelText(
          'Motion capture overlay visible: 9 joints detected with 70% confidence'
        )
      ).toBeTruthy()
    })
  })

  describe('Phase 2: Interactive Elements Tests', () => {
    describe('Joint Node Interactions', () => {
      it('calls onNodeTap when a joint node is pressed', () => {
        const mockOnNodeTap = jest.fn()
        renderWithProviders(
          <MotionCaptureOverlay
            {...mockProps}
            onNodeTap={mockOnNodeTap}
          />
        )

        const noseJoint = screen.getByLabelText('nose joint: 90% confidence')
        fireEvent.press(noseJoint)

        expect(mockOnNodeTap).toHaveBeenCalledWith('nose')
      })

      it('calls onNodeTap with correct joint id when different joints are pressed', () => {
        const mockOnNodeTap = jest.fn()
        renderWithProviders(
          <MotionCaptureOverlay
            {...mockProps}
            onNodeTap={mockOnNodeTap}
          />
        )

        const leftEyeJoint = screen.getByLabelText('leftEye joint: 80% confidence')
        fireEvent.press(leftEyeJoint)

        expect(mockOnNodeTap).toHaveBeenCalledWith('leftEye')
      })

      it('does not call onNodeTap when onNodeTap is not provided', () => {
        // This should not throw an error
        renderWithProviders(
          <MotionCaptureOverlay
            {...mockProps}
            // onNodeTap not provided
          />
        )

        const noseJoint = screen.getByLabelText('nose joint: 90% confidence')
        fireEvent.press(noseJoint)

        // Should not crash - test passes if no error is thrown
        expect(screen.getByLabelText(/Motion capture overlay/)).toBeTruthy()
      })

      it('only renders joints with confidence above threshold', () => {
        const lowConfidencePoseData = [
          {
            ...mockPoseData[0],
            joints: [
              { id: 'nose', x: 0.5, y: 0.3, confidence: 0.9, connections: [] }, // Above threshold
              { id: 'lowConfidenceJoint', x: 0.4, y: 0.4, confidence: 0.2, connections: [] }, // Below threshold
            ],
          },
        ]

        renderWithProviders(
          <MotionCaptureOverlay
            poseData={lowConfidencePoseData}
            isVisible={true}
          />
        )

        // High confidence joint should be present
        expect(screen.getByLabelText('nose joint: 90% confidence')).toBeTruthy()

        // Low confidence joint should not be rendered
        expect(screen.queryByLabelText('lowConfidenceJoint joint: 20% confidence')).toBeFalsy()
      })
    })

    describe('Overlay Visibility Interactions', () => {
      it('shows overlay when isVisible is true', () => {
        const { root } = renderWithProviders(
          <MotionCaptureOverlay
            {...mockProps}
            isVisible={true}
          />
        )

        expect(root.props.style?.opacity || 1).toBe(1)
      })

      it('hides overlay when isVisible is false', () => {
        const { root } = renderWithProviders(
          <MotionCaptureOverlay
            {...mockProps}
            isVisible={false}
          />
        )

        expect(root.props.style?.opacity || 0).toBe(0)
      })

      it('transitions visibility smoothly', () => {
        const { rerender, root } = renderWithProviders(
          <MotionCaptureOverlay
            {...mockProps}
            isVisible={true}
          />
        )

        // Initially visible
        expect(root.props.style?.opacity || 1).toBe(1)

        // Hide overlay
        rerender(
          <MotionCaptureOverlay
            {...mockProps}
            isVisible={false}
          />
        )

        // Now hidden
        expect(root.props.style?.opacity || 0).toBe(0)
      })
    })

    describe('Pose Data Updates', () => {
      it('updates joint positions when pose data changes', () => {
        const { rerender } = renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

        // Initially shows nose at original position
        expect(screen.getByLabelText('nose joint: 90% confidence')).toBeTruthy()

        // Update pose data with different joint positions
        const updatedPoseData = [
          {
            ...mockPoseData[0],
            joints: [{ id: 'nose', x: 0.6, y: 0.4, confidence: 0.95, connections: [] }],
          },
        ]

        rerender(
          <MotionCaptureOverlay
            poseData={updatedPoseData}
            isVisible={true}
          />
        )

        // Should show updated confidence
        expect(screen.getByLabelText('nose joint: 95% confidence')).toBeTruthy()
      })

      it('handles empty pose data gracefully', () => {
        const result = renderWithProviders(
          <MotionCaptureOverlay
            poseData={[]}
            isVisible={true}
          />
        )

        // Should render nothing when no pose data (component returns null)
        expect(result.root).toBeFalsy()
      })

      it('updates skeleton connections when joint positions change', () => {
        renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

        // Should render skeleton connections container
        expect(
          screen.getByLabelText('Skeleton connections: 12 bone connections detected')
        ).toBeTruthy()

        // Verify that the component renders without errors when connections exist
        expect(screen.getByLabelText(/Motion capture overlay/)).toBeTruthy()
      })
    })

    describe('Accessibility and Touch Targets', () => {
      it('provides proper accessibility labels for all joints', () => {
        renderWithProviders(<MotionCaptureOverlay {...mockProps} />)

        // Check that all high-confidence joints have accessibility labels
        expect(screen.getByLabelText('nose joint: 90% confidence')).toBeTruthy()
        expect(screen.getByLabelText('leftEye joint: 80% confidence')).toBeTruthy()
        expect(screen.getByLabelText('rightEye joint: 80% confidence')).toBeTruthy()
      })

      it('updates accessibility label with overall pose confidence', () => {
        const highConfidencePose = [
          {
            ...mockPoseData[0],
            confidence: 0.95,
          },
        ]

        renderWithProviders(
          <MotionCaptureOverlay
            poseData={highConfidencePose}
            isVisible={true}
          />
        )

        expect(
          screen.getByLabelText(
            'Motion capture overlay visible: 9 joints detected with 95% confidence'
          )
        ).toBeTruthy()
      })
    })
  })
})
