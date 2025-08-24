import { HomeScreen } from 'app/features/home/screen'
import { Stack, Link } from 'expo-router'
import { Button } from '@my/ui'

export default function Screen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Home',
        }}
      />
      <HomeScreen
        linkComponent={
          <Link
            href="/user/nate"
            asChild
          >
            <Button>Link to user</Button>
          </Link>
        }
        demoLinkComponent={
          <Link
            href="/demo"
            asChild
          >
            <Button theme="blue">🧪 Demo & Test</Button>
          </Link>
        }
      />
    </>
  )
}
