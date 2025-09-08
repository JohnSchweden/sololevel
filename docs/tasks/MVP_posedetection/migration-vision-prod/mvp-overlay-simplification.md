# MVP Pose Overlay Simplification

## Current State: Over-Engineered (1,233 lines total)
- **Native Skia**: 408 lines with advanced effects
- **Web WebGL**: 639 lines with custom shaders  
- **Cross-Platform**: 186 lines with complex utilities

## MVP Target: ~200 lines total (83% reduction)

### **Keep for MVP:**
1. **Basic coordinate normalization** ✅
2. **Simple keypoint rendering** ✅
3. **Basic skeleton connections** ✅
4. **Cross-platform structure** ✅

### **Remove for MVP:**
1. **Native Skia effects** (glow, particles, trails)
2. **Web WebGL shaders** (custom vertex/fragment)
3. **Advanced animations** (timing, interpolation)
4. **Performance optimizations** (buffer management)
5. **Complex styling** (confidence-based colors)

## Recommended MVP Approach

### **Option 1: Simplify Existing Components (Recommended)**
Strip down current components to MVP essentials:

```typescript
// MVP Native: ~50 lines
export function PoseOverlayNative({ pose, width, height }) {
  return (
    <View style={{ width, height }}>
      <Canvas>
        {/* Simple keypoints */}
        {pose?.keypoints.map(keypoint => (
          <Circle cx={keypoint.x} cy={keypoint.y} r={4} color="red" />
        ))}
        {/* Simple connections */}
        {POSE_CONNECTIONS.map(connection => (
          <Line p1={from} p2={to} color="blue" strokeWidth={2} />
        ))}
      </Canvas>
    </View>
  )
}

// MVP Web: ~50 lines  
export function PoseOverlayWeb({ pose, width, height }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !pose) return
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height)
    
    // Draw keypoints
    pose.keypoints.forEach(kp => {
      ctx.fillStyle = 'red'
      ctx.beginPath()
      ctx.arc(kp.x, kp.y, 4, 0, 2 * Math.PI)
      ctx.fill()
    })
    
    // Draw connections
    POSE_CONNECTIONS.forEach(conn => {
      const from = pose.keypoints.find(kp => kp.name === conn.from)
      const to = pose.keypoints.find(kp => kp.name === conn.to)
      if (from && to) {
        ctx.strokeStyle = 'blue'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.stroke()
      }
    })
  }, [pose, width, height])
  
  return <canvas ref={canvasRef} width={width} height={height} />
}
```

### **Option 2: Create New MVP Components**
Create separate MVP components alongside existing ones:

```
packages/ui/src/components/CameraRecording/
├── PoseOverlay.tsx              # Keep existing (production)
├── PoseOverlay.native.tsx       # Keep existing (production)
├── PoseOverlay.web.tsx          # Keep existing (production)
├── MVPPoseOverlay.tsx           # New MVP version
├── MVPPoseOverlay.native.tsx    # New MVP native
└── MVPPoseOverlay.web.tsx       # New MVP web
```

## Implementation Time Estimate

### **Option 1: Simplify Existing (1-2 hours)**
- Strip out advanced features
- Keep core structure
- Fix linting errors
- Test basic functionality

### **Option 2: Create New MVP (2-3 hours)**
- Create new simplified components
- Maintain existing production components
- Set up conditional imports
- Test both versions

## Recommendation: **Option 1 - Simplify Existing**

**Why:**
1. **Faster implementation** (1-2 hours vs 2-3 hours)
2. **No code duplication** 
3. **Easier maintenance**
4. **Clear upgrade path** (can add features back later)

**Steps:**
1. Remove Skia effects from native component
2. Remove WebGL shaders from web component  
3. Simplify utility functions
4. Fix linting errors
5. Test basic pose rendering

## Current Linting Issues to Fix

### **Native Component:**
- Missing `@shopify/react-native-skia` dependency
- Missing `confidenceThreshold` in config type
- Missing `filterByConfidence` utility method
- Implicit `any` types in callbacks

### **Web Component:**
- Missing `webgl` config property
- Missing `confidenceThreshold` in config type
- Missing `filterByConfidence` utility method
- Implicit `any` types in callbacks

### **Cross-Platform Utils:**
- Missing `filterByConfidence` method (used by both platforms)
- Missing `confidenceThreshold` in config type

## MVP Success Criteria
- [ ] Renders basic keypoints (red circles)
- [ ] Renders basic skeleton (blue lines)
- [ ] Works on both native and web
- [ ] No linting errors
- [ ] Under 200 lines total
- [ ] 60fps performance on target devices
