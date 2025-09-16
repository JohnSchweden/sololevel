export interface BottomNavigationProps {
  activeTab: 'coach' | 'record' | 'insights'
  onTabChange: (tab: 'coach' | 'record' | 'insights') => void
  disabled?: boolean
}

export interface NavigationTabProps {
  label: string
  isActive: boolean
  onPress: () => void
  disabled?: boolean
}
