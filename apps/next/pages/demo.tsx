import { DemoScreen } from 'app/features/demo/demo-screen'
import Head from 'next/head'

export default function DemoPage() {
  return (
    <>
      <Head>
        <title>Demo & Testing - Sololevel</title>
        <meta
          name="description"
          content="Demo page to test Zustand stores and Supabase integration"
        />
      </Head>
      <DemoScreen />
    </>
  )
}
