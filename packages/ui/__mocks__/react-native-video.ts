import React from 'react'

const Video = React.forwardRef((props: any, ref: any) => {
  return React.createElement('Video', { ...props, ref, testID: 'video-player' })
})

export default Video
