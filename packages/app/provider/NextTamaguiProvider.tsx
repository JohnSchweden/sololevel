'use client'

import '@tamagui/core/reset.css'
import '@tamagui/font-inter/css/400.css'
import '@tamagui/font-inter/css/700.css'
import '@tamagui/polyfill-dev'

import { config } from '@my/ui'
import { NextThemeProvider, useRootTheme } from '@tamagui/next-theme'
import { Provider } from '@app/provider'
import { useServerInsertedHTML } from 'next/navigation'
import type { ReactNode } from 'react'
// Import StyleSheet for web compatibility
let StyleSheet: any
try {
  StyleSheet = require('react-native').StyleSheet
} catch {
  // Fallback for environments where react-native is not available
  StyleSheet = {
    getSheet: () => ({ textContent: '', id: 'tamagui-rnw' }),
  }
}

export const NextTamaguiProvider = ({
  children,
  locale,
}: {
  children: ReactNode
  locale?: string
}) => {
  const [theme, setTheme] = useRootTheme()

  useServerInsertedHTML(() => {
    const rnwStyle = StyleSheet.getSheet()
    return (
      <>
        <link
          rel="stylesheet"
          href="/tamagui.css"
        />
        <style
          dangerouslySetInnerHTML={{ __html: rnwStyle.textContent }}
          id={rnwStyle.id}
        />
        <style
          dangerouslySetInnerHTML={{
            // the first time this runs you'll get the full CSS including all themes
            // after that, it will only return CSS generated since the last call
            __html: config.getNewCSS(),
          }}
        />

        <style
          dangerouslySetInnerHTML={{
            __html: config.getCSS({
              exclude: process.env.NODE_ENV === 'production' ? 'design-system' : null,
            }),
          }}
        />

        <script
          dangerouslySetInnerHTML={{
            // avoid flash of animated things on enter:
            __html: `document.documentElement.classList.add('t_unmounted')`,
          }}
        />
      </>
    )
  })

  return (
    <NextThemeProvider
      skipNextHead
      defaultTheme="light"
      onChangeTheme={(next) => {
        setTheme(next as any)
      }}
    >
      <Provider
        disableRootThemeClass
        defaultTheme={theme || 'light'}
        locale={locale}
      >
        {children}
      </Provider>
    </NextThemeProvider>
  )
}
