/**
 * Web WebGL Canvas Pose Overlay Component
 *
 * This component renders pose detection overlays using WebGL for
 * high-performance web rendering with GPU acceleration, smooth animations,
 * and advanced visual effects.
 *
 * @platform web
 */

import {
  DEFAULT_OVERLAY_CONFIG,
  POSE_CONNECTIONS,
  type PoseDetectionResult,
  type PoseKeypoint,
} from '@app/features/CameraRecording/types/pose'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { PoseOverlayUtils } from '../../utils/PoseOverlayUtils'
import type { PoseOverlayProps } from './PoseOverlay'

/**
 * WebGL-specific configuration
 */
interface WebGLOverlayConfig {
  enableWebGL: boolean
  enableAntialiasing: boolean
  enableBloom: boolean
  enableTrails: boolean
  maxTrailLength: number
  bloomIntensity: number
  animationSpeed: number
  particleCount: number
}

/**
 * WebGL shader sources
 */
const VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;
  attribute vec4 a_color;
  attribute float a_size;
  
  uniform vec2 u_resolution;
  uniform float u_time;
  
  varying vec4 v_color;
  varying float v_size;
  
  void main() {
    vec2 position = ((a_position / u_resolution) * 2.0 - 1.0) * vec2(1, -1);
    gl_Position = vec4(position, 0, 1);
    gl_PointSize = a_size;
    v_color = a_color;
    v_size = a_size;
  }
`

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  
  uniform float u_time;
  uniform float u_bloom_intensity;
  
  varying vec4 v_color;
  varying float v_size;
  
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    
    // Create circular keypoint with soft edges
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
    
    // Add bloom effect
    float bloom = exp(-dist * 8.0) * u_bloom_intensity;
    vec3 color = v_color.rgb + vec3(bloom);
    
    gl_FragColor = vec4(color, alpha * v_color.a);
  }
`

const LINE_VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;
  attribute vec4 a_color;
  
  uniform vec2 u_resolution;
  uniform float u_line_width;
  
  varying vec4 v_color;
  
  void main() {
    vec2 position = ((a_position / u_resolution) * 2.0 - 1.0) * vec2(1, -1);
    gl_Position = vec4(position, 0, 1);
    v_color = a_color;
  }
`

const LINE_FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  
  varying vec4 v_color;
  
  void main() {
    gl_FragColor = v_color;
  }
`

/**
 * WebGL program wrapper
 */
class WebGLPoseRenderer {
  private gl: WebGLRenderingContext
  private pointProgram: WebGLProgram | null = null
  private lineProgram: WebGLProgram | null = null
  private pointBuffer: WebGLBuffer | null = null
  private lineBuffer: WebGLBuffer | null = null
  private animationId: number | null = null
  private startTime = Date.now()

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', {
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
    })

    if (!gl) {
      throw new Error('WebGL not supported')
    }

    this.gl = gl
    this.initializeShaders()
    this.initializeBuffers()
  }

  private initializeShaders(): void {
    // Create point shader program
    this.pointProgram = this.createShaderProgram(VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE)

    // Create line shader program
    this.lineProgram = this.createShaderProgram(
      LINE_VERTEX_SHADER_SOURCE,
      LINE_FRAGMENT_SHADER_SOURCE
    )
  }

  private createShaderProgram(vertexSource: string, fragmentSource: string): WebGLProgram | null {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource)
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource)

    if (!vertexShader || !fragmentShader) {
      return null
    }

    const program = this.gl.createProgram()
    if (!program) return null

    this.gl.attachShader(program, vertexShader)
    this.gl.attachShader(program, fragmentShader)
    this.gl.linkProgram(program)

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      // console.error("Shader program linking failed:", this.gl.getProgramInfoLog(program));
      return null
    }

    return program
  }

  private createShader(type: number, source: string): WebGLShader | null {
    const shader = this.gl.createShader(type)
    if (!shader) return null

    this.gl.shaderSource(shader, source)
    this.gl.compileShader(shader)

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      // console.error("Shader compilation failed:", this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader)
      return null
    }

    return shader
  }

  private initializeBuffers(): void {
    this.pointBuffer = this.gl.createBuffer()
    this.lineBuffer = this.gl.createBuffer()
  }

  public render(pose: any, config: any, width: number, height: number): void {
    if (!pose || !this.pointProgram || !this.lineProgram) return

    // Set viewport
    this.gl.viewport(0, 0, width, height)

    // Clear canvas
    this.gl.clearColor(0, 0, 0, 0)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)

    // Enable blending for transparency
    this.gl.enable(this.gl.BLEND)
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

    // Render connections
    this.renderConnections(pose, config, width, height)

    // Render keypoints
    this.renderKeypoints(pose, config, width, height)
  }

  private renderConnections(pose: any, config: any, width: number, height: number): void {
    if (!this.lineProgram || !this.lineBuffer) return

    this.gl.useProgram(this.lineProgram)

    // Get valid connections
    const validConnections = PoseOverlayUtils.getValidConnections(
      pose,
      POSE_CONNECTIONS,
      config.confidenceThreshold || 0.3
    )

    if (validConnections.length === 0) return

    // Prepare line data
    const lineData: number[] = []
    const colorData: number[] = []

    validConnections.forEach((connection) => {
      const fromKeypoint = pose.keypoints.find((kp: any) => kp.name === connection.from)
      const toKeypoint = pose.keypoints.find((kp: any) => kp.name === connection.to)

      if (fromKeypoint && toKeypoint) {
        // Line vertices
        lineData.push(fromKeypoint.x, fromKeypoint.y)
        lineData.push(toKeypoint.x, toKeypoint.y)

        // Line colors (RGBA)
        const color = this.hexToRgba(config.colors.connection)
        colorData.push(...color, ...color)
      }
    })

    if (lineData.length === 0) return

    // Upload line data
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.lineBuffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(lineData), this.gl.DYNAMIC_DRAW)

    // Set up attributes
    const positionLocation = this.gl.getAttribLocation(this.lineProgram, 'a_position')
    this.gl.enableVertexAttribArray(positionLocation)
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0)

    // Set uniforms
    const resolutionLocation = this.gl.getUniformLocation(this.lineProgram, 'u_resolution')
    this.gl.uniform2f(resolutionLocation, width, height)

    const lineWidthLocation = this.gl.getUniformLocation(this.lineProgram, 'u_line_width')
    this.gl.uniform1f(lineWidthLocation, config.connectionWidth || 2)

    // Draw lines
    this.gl.lineWidth(config.connectionWidth || 2)
    this.gl.drawArrays(this.gl.LINES, 0, lineData.length / 2)
  }

  private renderKeypoints(pose: any, config: any, width: number, height: number): void {
    if (!this.pointProgram || !this.pointBuffer) return

    this.gl.useProgram(this.pointProgram)

    // Prepare point data
    const pointData: number[] = []
    const colorData: number[] = []
    const sizeData: number[] = []

    pose.keypoints.forEach((keypoint: any) => {
      if (keypoint.confidence < (config.confidenceThreshold || 0.3)) {
        return
      }

      // Point position
      pointData.push(keypoint.x, keypoint.y)

      // Point color based on confidence
      const color = PoseOverlayUtils.getConfidenceColor(keypoint.confidence, config)
      const rgba = this.hexToRgba(color)
      colorData.push(...rgba)

      // Point size based on confidence
      const size = PoseOverlayUtils.getKeypointRadius(keypoint.confidence, config)
      sizeData.push(size * 2) // Convert radius to diameter
    })

    if (pointData.length === 0) return

    // Create interleaved buffer (position + color + size)
    const vertexData: number[] = []
    for (let i = 0; i < pointData.length / 2; i++) {
      vertexData.push(
        pointData[i * 2], // x
        pointData[i * 2 + 1], // y
        colorData[i * 4], // r
        colorData[i * 4 + 1], // g
        colorData[i * 4 + 2], // b
        colorData[i * 4 + 3], // a
        sizeData[i] // size
      )
    }

    // Upload vertex data
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.pointBuffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertexData), this.gl.DYNAMIC_DRAW)

    // Set up attributes
    const stride = 7 * 4 // 7 floats * 4 bytes per float

    const positionLocation = this.gl.getAttribLocation(this.pointProgram, 'a_position')
    this.gl.enableVertexAttribArray(positionLocation)
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, stride, 0)

    const colorLocation = this.gl.getAttribLocation(this.pointProgram, 'a_color')
    this.gl.enableVertexAttribArray(colorLocation)
    this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, stride, 2 * 4)

    const sizeLocation = this.gl.getAttribLocation(this.pointProgram, 'a_size')
    this.gl.enableVertexAttribArray(sizeLocation)
    this.gl.vertexAttribPointer(sizeLocation, 1, this.gl.FLOAT, false, stride, 6 * 4)

    // Set uniforms
    const resolutionLocation = this.gl.getUniformLocation(this.pointProgram, 'u_resolution')
    this.gl.uniform2f(resolutionLocation, width, height)

    const timeLocation = this.gl.getUniformLocation(this.pointProgram, 'u_time')
    this.gl.uniform1f(timeLocation, (Date.now() - this.startTime) / 1000)

    const bloomLocation = this.gl.getUniformLocation(this.pointProgram, 'u_bloom_intensity')
    this.gl.uniform1f(bloomLocation, config.bloomIntensity || 0.3)

    // Draw points
    this.gl.drawArrays(this.gl.POINTS, 0, pointData.length / 2)
  }

  private hexToRgba(hex: string): number[] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return [1, 1, 1, 1]

    return [
      Number.parseInt(result[1], 16) / 255,
      Number.parseInt(result[2], 16) / 255,
      Number.parseInt(result[3], 16) / 255,
      1,
    ]
  }

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }

    if (this.pointProgram) {
      this.gl.deleteProgram(this.pointProgram)
    }

    if (this.lineProgram) {
      this.gl.deleteProgram(this.lineProgram)
    }

    if (this.pointBuffer) {
      this.gl.deleteBuffer(this.pointBuffer)
    }

    if (this.lineBuffer) {
      this.gl.deleteBuffer(this.lineBuffer)
    }
  }
}

/**
 * Web WebGL pose overlay component
 */
export function PoseOverlayWeb({
  pose,
  config = {},
  width,
  height,
  style,
  onPoseUpdate,
}: PoseOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<WebGLPoseRenderer | null>(null)
  const animationRef = useRef<number | null>(null)

  const overlayConfig = { ...DEFAULT_OVERLAY_CONFIG, ...config }

  // WebGL-specific configuration
  const webglConfig: WebGLOverlayConfig = {
    enableWebGL: true,
    enableAntialiasing: true,
    enableBloom: true,
    enableTrails: false,
    maxTrailLength: 10,
    bloomIntensity: 0.3,
    animationSpeed: 1.0,
    particleCount: 20,
    ...config.webgl,
  }

  // Initialize WebGL renderer
  useEffect(() => {
    if (!canvasRef.current || !webglConfig.enableWebGL) return

    try {
      rendererRef.current = new WebGLPoseRenderer(canvasRef.current)
    } catch (error) {
      // console.warn("WebGL initialization failed, falling back to Canvas 2D:", error);
      // Fallback to Canvas 2D rendering would be implemented here
    }

    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose()
      }
    }
  }, [webglConfig.enableWebGL])

  // Normalize pose coordinates
  const normalizedPose = useMemo(() => {
    if (!pose) return null
    return PoseOverlayUtils.normalizeCoordinates(pose, width, height)
  }, [pose, width, height])

  // Filter pose by confidence
  const filteredPose = useMemo(() => {
    if (!normalizedPose) return null
    return PoseOverlayUtils.filterByConfidence(
      normalizedPose,
      overlayConfig.confidenceThreshold || 0.3
    )
  }, [normalizedPose, overlayConfig.confidenceThreshold])

  // Animation loop
  const animate = useCallback(() => {
    if (!rendererRef.current || !filteredPose || !canvasRef.current) {
      return
    }

    rendererRef.current.render(filteredPose, { ...overlayConfig, ...webglConfig }, width, height)

    animationRef.current = requestAnimationFrame(animate)
  }, [filteredPose, overlayConfig, webglConfig, width, height])

  // Start/stop animation
  useEffect(() => {
    if (filteredPose && rendererRef.current) {
      animate()
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [filteredPose, animate])

  // Handle pose updates
  useEffect(() => {
    if (pose && onPoseUpdate) {
      onPoseUpdate(pose)
    }
  }, [pose, onPoseUpdate])

  // Fallback to Canvas 2D if WebGL is not available or disabled
  const renderCanvas2D = useCallback(() => {
    if (!canvasRef.current || !filteredPose) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw connections
    if (overlayConfig.showConnections) {
      const validConnections = PoseOverlayUtils.getValidConnections(
        filteredPose,
        POSE_CONNECTIONS,
        overlayConfig.confidenceThreshold || 0.3
      )

      ctx.strokeStyle = overlayConfig.colors.connection
      ctx.lineWidth = overlayConfig.connectionWidth
      ctx.lineCap = 'round'

      validConnections.forEach((connection) => {
        const fromKeypoint = filteredPose.keypoints.find(
          (kp: PoseKeypoint) => kp.name === connection.from
        )
        const toKeypoint = filteredPose.keypoints.find(
          (kp: PoseKeypoint) => kp.name === connection.to
        )

        if (fromKeypoint && toKeypoint) {
          ctx.beginPath()
          ctx.moveTo(fromKeypoint.x, fromKeypoint.y)
          ctx.lineTo(toKeypoint.x, toKeypoint.y)
          ctx.stroke()
        }
      })
    }

    // Draw keypoints
    if (overlayConfig.showKeypoints) {
      filteredPose.keypoints.forEach((keypoint: PoseKeypoint) => {
        if (keypoint.confidence < (overlayConfig.confidenceThreshold || 0.3)) {
          return
        }

        const radius = PoseOverlayUtils.getKeypointRadius(keypoint.confidence, overlayConfig)
        const color = PoseOverlayUtils.getConfidenceColor(keypoint.confidence, overlayConfig)

        // Draw keypoint circle
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(keypoint.x, keypoint.y, radius, 0, 2 * Math.PI)
        ctx.fill()

        // Draw keypoint border
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1
        ctx.stroke()
      })
    }

    // Draw confidence info
    if (overlayConfig.showConfidence) {
      const text = `Confidence: ${(filteredPose.confidence * 100).toFixed(1)}%`

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(10, 10, 150, 30)

      ctx.fillStyle = '#ffffff'
      ctx.font = '14px Arial'
      ctx.fillText(text, 15, 30)
    }
  }, [filteredPose, overlayConfig, width, height])

  // Render using Canvas 2D if WebGL is not available
  useEffect(() => {
    if (!webglConfig.enableWebGL || !rendererRef.current) {
      renderCanvas2D()
    }
  }, [webglConfig.enableWebGL, renderCanvas2D])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width,
        height,
        pointerEvents: 'none',
        ...style,
      }}
    />
  )
}

/**
 * WebGL-specific utilities for web pose rendering
 */
export const WebGLPoseUtils = {
  /**
   * Check WebGL support
   */
  hasWebGLSupport: (): boolean => {
    try {
      const canvas = document.createElement('canvas')
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    } catch {
      return false
    }
  },

  /**
   * Get WebGL capabilities
   */
  getWebGLCapabilities: () => {
    if (!WebGLPoseUtils.hasWebGLSupport()) {
      return null
    }

    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl')
    if (!gl) return null

    return {
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      extensions: gl.getSupportedExtensions(),
    }
  },

  /**
   * Create optimized pose data for WebGL rendering
   */
  optimizeForWebGL: (pose: any) => {
    // Remove low-confidence keypoints to reduce vertex count
    const optimizedKeypoints = pose.keypoints.filter((kp: any) => kp.confidence > 0.3)

    return {
      ...pose,
      keypoints: optimizedKeypoints,
    }
  },

  /**
   * Create pose trail data for WebGL
   */
  createTrailData: (
    currentPose: PoseDetectionResult,
    previousPoses: PoseDetectionResult[],
    maxLength: number
  ) => {
    const trailData: PoseKeypoint[][] = []

    currentPose.keypoints.forEach((keypoint: PoseKeypoint, index: number) => {
      const trail = [keypoint]

      for (let i = 0; i < Math.min(maxLength, previousPoses.length); i++) {
        const prevPose = previousPoses[previousPoses.length - 1 - i]
        if (prevPose && prevPose.keypoints[index]) {
          trail.push(prevPose.keypoints[index])
        }
      }

      trailData.push(trail)
    })

    return trailData
  },
}

// Export both the specific implementation and the generic name for compatibility
export { PoseOverlayWeb as PoseOverlay }
// Re-export PoseOverlayUtils from the main file for convenience
export { PoseOverlayUtils }
export default PoseOverlayWeb
