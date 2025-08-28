import { Button } from '@my/ui'
import { HomeScreen } from 'app/features/home/screen'
import Head from 'next/head'
import Link from 'next/link'

export default function Page() {
  return (
    <>
      <Head>
        <title>Solito Example App</title>
        <meta
          name="description"
          content="Welcome to Tamagui cross-platform example"
        />
      </Head>
      <HomeScreen
        linkComponent={
          <Link
            href="/user/nate"
            passHref
            legacyBehavior
          >
            <Button>Link to user</Button>
          </Link>
        }
        demoLinkComponent={
          <Link
            href="/demo"
            passHref
            legacyBehavior
          >
            <Button theme="blue">🧪 Demo & Test</Button>
          </Link>
        }
      />
    </>
  )
}
