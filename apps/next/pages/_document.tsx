import { config } from '@my/ui'
import NextDocument, {
  type DocumentContext,
  type DocumentInitialProps,
  Head,
  Html,
  Main,
  NextScript,
} from 'next/document'
import React, { Children } from 'react'
import { AppRegistry } from 'react-native'

export default class Document extends NextDocument {
  static async getInitialProps(ctx: DocumentContext): Promise<DocumentInitialProps> {
    AppRegistry.registerComponent('Main', () => Main)
    const page = await ctx.renderPage()

    // @ts-expect-error react-native-web types don't declare getApplication correctly here
    const { getStyleElement } = AppRegistry.getApplication('Main')

    /**
     * Note: be sure to keep tamagui styles after react-native-web styles like it is here!
     * So Tamagui styles can override the react-native-web styles.
     */
    const styles = [
      React.cloneElement(getStyleElement(), { key: 'react-native-web-styles' }),
      <style
        key="tamagui-config-css"
        dangerouslySetInnerHTML={{
          __html: config.getCSS({
            exclude: process.env.NODE_ENV === 'development' ? null : 'design-system',
          }),
        }}
      />,
      <style
        key="global-font-css"
        dangerouslySetInnerHTML={{
          __html: `html { font-family: 'Inter'; }`,
        }}
      />,
    ]

    return { ...page, styles: Children.toArray(styles) }
  }

  render() {
    return (
      <Html>
        <Head>
          <meta
            httpEquiv="X-UA-Compatible"
            content="IE=edge"
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}
