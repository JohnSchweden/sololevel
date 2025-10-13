import React from 'react'

export const BlurView = (props: any) =>
  React.createElement('div', { ...props, 'data-testid': 'blur-view' }, props.children)
