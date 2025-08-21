// Mock Solito navigation hooks for Storybook
export const useLink = (props: { href: string }) => ({
  href: props.href,
  onPress: () => ,
  accessibilityRole: 'link' as const,
})

export const useRouter = () => ({
  push: (href: string) => ,
  replace: (href: string) => ,
  back: () => ,
})

export const useParams = () => ({ id: 'mock-id' })
