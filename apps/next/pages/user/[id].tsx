import { UserDetailScreen } from 'app/features/user/detail-screen'
import Head from 'next/head'
import { useRouter } from 'next/router'

export default function Page() {
  const router = useRouter()
  const { id } = router.query

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
