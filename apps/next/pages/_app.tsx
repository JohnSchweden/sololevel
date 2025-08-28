import { NextTamaguiProvider } from 'app/provider/NextTamaguiProvider'
import { appWithTranslation } from 'next-i18next'
import type { AppProps } from 'next/app'

function App({ Component, pageProps }: AppProps) {
  return (
    <NextTamaguiProvider locale={pageProps.locale}>
      <Component {...pageProps} />
    </NextTamaguiProvider>
  )
}

export default appWithTranslation(App)
