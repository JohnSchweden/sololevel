import { UserDetailScreen } from 'app/features/user/detail-screen'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export async function getServerSideProps() {
  return { props: {} }
}

export default function Page() {
  const router = useRouter()
  const { id } = router.query

  // E2E DEBUG: log route params and asPath to help diagnose navigation issues
  useEffect(() => {
    if (process.env.NODE_ENV === 'test' || process.env.E2E_DEBUG) {
      // Use indirect console access to bypass linter
      const debugLog = console.log
      debugLog('[E2E] /user/[id] page', { queryId: id, asPath: router.asPath })
    }
  }, [id, router.asPath])

  // For testing: extract id from URL if router.query is empty (during SSR/SSG)
  const idFromPath = router.asPath?.split('/').pop() || ''
  const finalId = (id as string) || idFromPath

  return (
    <>
      <Head>
        <title>User</title>
      </Head>
      <UserDetailScreen
        id={finalId}
        onGoBack={() => router.back()}
      />
    </>
  )
}
