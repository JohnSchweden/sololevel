import React from 'react'
import { Platform } from 'react-native'

export function BottomNavigationContainer(props: {
  children: React.ReactNode
  disableBlur?: boolean
}) {
  if (Platform.OS !== 'web') {
    const {
      BottomNavigationContainer: BottomNavigationContainerNative,
    } = require('./BottomNavigationContainer.native')
    return <BottomNavigationContainerNative {...props} />
  }

  // Web implementation
  const {
    BottomNavigationContainer: BottomNavigationContainerWeb,
  } = require('./BottomNavigationContainer.web')
  return <BottomNavigationContainerWeb {...props} />
}
