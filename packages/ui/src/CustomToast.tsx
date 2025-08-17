import { Platform } from 'react-native'
import { NativeToast as Toast } from './NativeToast'

const isExpo = Platform.OS !== 'web'

export const CustomToast = () => {
  if (isExpo) {
    return null
  }
  return <Toast />
}
