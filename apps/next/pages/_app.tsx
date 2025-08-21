import type { AppProps } from 'next/app'
import { NextTamaguiProvider } from 'app/provider/NextTamaguiProvider'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NextTamaguiProvider>
      <Component {...pageProps} />
    </NextTamaguiProvider>
  )
}
