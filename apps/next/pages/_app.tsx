import type { AppProps } from 'next/app'
import { NextTamaguiProvider } from 'app/provider/NextTamaguiProvider'
import { appWithTranslation } from 'next-i18next'

function App({ Component, pageProps }: AppProps) {
  return (
    <NextTamaguiProvider locale={pageProps.locale}>
      <Component {...pageProps} />
    </NextTamaguiProvider>
  )
}

export default appWithTranslation(App)
