import type { AppProps } from 'next/app'
import { NextTamaguiProvider } from 'app/provider/NextTamaguiProvider'
import { appWithTranslation } from 'next-i18next'
import { QueryProvider } from 'app/provider/QueryProvider'

function App({ Component, pageProps }: AppProps) {
  return (
    <NextTamaguiProvider locale={pageProps.locale}>
      <QueryProvider>
        <Component {...pageProps} />
      </QueryProvider>
    </NextTamaguiProvider>
  )
}

export default appWithTranslation(App)
