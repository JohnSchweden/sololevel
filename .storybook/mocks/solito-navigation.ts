// Mock Solito navigation hooks for Storybook
export const useLink = (props: { href: string }) => ({
  href: props.href,
  onPress: () => console.log('Link pressed:', props.href),
  accessibilityRole: 'link' as const,
})

export const useRouter = () => ({
  push: (href: string) => console.log('Router push:', href),
  replace: (href: string) => console.log('Router replace:', href),
  back: () => console.log('Router back'),
})

export const useParams = () => ({ id: 'mock-id' })
