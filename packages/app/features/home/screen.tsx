import {
  Anchor,
  Button,
  H1,
  Paragraph,
  Separator,
  Sheet,
  SwitchThemeButton,
  useToastController,
  XStack,
  YStack,
} from '@my/ui'
import { ChevronDown, ChevronUp, Camera, Video } from '@tamagui/lucide-icons'
import { useState } from 'react'
import { Platform } from 'react-native'
import { ErrorBoundary } from '../../components/ErrorBoundary'
import Link from 'next/link'

export function HomeScreen({
  linkComponent,
  demoLinkComponent,
  cameraRecordingLinkComponent,
  enhancedCameraRecordingLinkComponent,
}: {
  linkComponent?: React.ReactNode
  demoLinkComponent?: React.ReactNode
  cameraRecordingLinkComponent?: React.ReactNode
  enhancedCameraRecordingLinkComponent?: React.ReactNode
}) {
  return (
    <ErrorBoundary>
      <HomeScreenContent
        linkComponent={linkComponent}
        demoLinkComponent={demoLinkComponent}
        cameraRecordingLinkComponent={cameraRecordingLinkComponent}
        enhancedCameraRecordingLinkComponent={enhancedCameraRecordingLinkComponent}
      />
    </ErrorBoundary>
  )
}

function HomeScreenContent({
  linkComponent,
  demoLinkComponent,
  cameraRecordingLinkComponent,
  enhancedCameraRecordingLinkComponent,
}: {
  linkComponent?: React.ReactNode
  demoLinkComponent?: React.ReactNode
  cameraRecordingLinkComponent?: React.ReactNode
  enhancedCameraRecordingLinkComponent?: React.ReactNode
}) {
  return (
    <YStack
      testID="home-screen"
      flex={1}
      justify="center"
      items="center"
      gap="$8"
      p="$4"
      bg="$background"
    >
      <XStack
        position="absolute"
        width="100%"
        t="$6"
        gap="$6"
        justify="center"
        flexWrap="wrap"
        $sm={{ position: 'relative', t: 0 }}
      >
        {Platform.OS === 'web' && (
          <>
            <SwitchThemeButton />
          </>
        )}
      </XStack>

      <YStack gap="$4">
        <H1
          text="center"
          color="$color12"
        >
          Welcome to Tamagui
        </H1>
        <Paragraph
          color="$color10"
          text="center"
        >
          Here's a basic starter to show navigating from one screen to another.
        </Paragraph>
        <Separator />
        <Paragraph text="center">
          This screen uses the same code on Next.js and React Native.
        </Paragraph>
        <Separator />
      </YStack>

      <XStack
        gap="$4"
        flexWrap="wrap"
        justifyContent="center"
      >
        {linkComponent || <Button>Link to user</Button>}
        {demoLinkComponent}
      </XStack>

      <YStack
        gap="$4"
        mt="$4"
      >
        <Paragraph
          color="$color10"
          text="center"
        >
          Camera Recording Screens
        </Paragraph>
        <XStack
          gap="$4"
          flexWrap="wrap"
          justifyContent="center"
        >
          {cameraRecordingLinkComponent || (
            <Button
              icon={Camera}
              size="$5"
            >
              Basic Camera
            </Button>
          )}
          {enhancedCameraRecordingLinkComponent || (
            <Link
              href="/enhanced-camera"
              passHref
              legacyBehavior
            >
              <Button
                icon={Video}
                size="$5"
              >
                Enhanced Camera
              </Button>
            </Link>
          )}
        </XStack>
      </YStack>

      <SheetDemo />
    </YStack>
  )
}

function SheetDemo() {
  const toast = useToastController()

  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState(0)

  // Handle sheet state changes
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
  }

  return (
    <>
      <Button
        size="$6"
        icon={open ? ChevronDown : ChevronUp}
        circular
        onPress={() => setOpen((x) => !x)}
      />
      <Sheet
        modal
        animation="medium"
        open={open}
        onOpenChange={handleOpenChange}
        snapPoints={[80]}
        position={position}
        onPositionChange={setPosition}
        dismissOnSnapToBottom
      >
        <Sheet.Overlay
          bg="$shadow4"
          animation="lazy"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />
        <Sheet.Handle bg="$color8" />
        <Sheet.Frame
          items="center"
          justify="center"
          gap="$10"
          bg="$color2"
        >
          <XStack gap="$2">
            <Paragraph text="center">Made by</Paragraph>
            <Anchor
              key="twitter"
              color="$blue10"
              href="https://twitter.com/natebirdman"
              target="_blank"
            >
              @natebirdman,
            </Anchor>
            <Anchor
              key="github"
              color="$blue10"
              href="https://github.com/tamagui/tamagui"
              target="_blank"
              rel="noreferrer"
            >
              give it a ⭐️
            </Anchor>
          </XStack>

          <Button
            size="$6"
            circular
            icon={ChevronDown}
            onPress={() => {
              setOpen(false)
              toast.show('Sheet closed!', {
                message: 'Just showing how toast works...',
              })
            }}
          />
        </Sheet.Frame>
      </Sheet>
    </>
  )
}
