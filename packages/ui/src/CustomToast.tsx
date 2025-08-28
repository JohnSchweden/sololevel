import React from 'react'
import { Platform } from 'react-native'
import { NativeToast as Toast } from './NativeToast'

export const CustomToast = () => {
  if (Platform.OS === 'web') {
    return <Toast />
  }
  return null
}
