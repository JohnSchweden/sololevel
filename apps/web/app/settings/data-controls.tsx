import { DataControlsScreen } from '@my/app/features/DataControls'
import { log } from '@my/logging'
import { AuthGate } from '../../components/AuthGate'

/**
 * Data Controls Settings Route - Web App
 *
 * Data controls settings screen for managing data sharing, export, and deletion.
 *
 * Route: /settings/data-controls
 * Auth: Protected (requires authentication)
 */
export default function DataControlsRoute() {
  const handleDataExport = (): void => {
    log.info('DataControlsRoute', 'Navigate to Data Export')
    // P1: Implement data export flow
    // const router = useRouter()
    // router.push('/settings/data-controls/export')
  }

  const handleClearAllData = (): void => {
    log.info('DataControlsRoute', 'Clear All Data requested')
    // P1: Show confirmation dialog then trigger deletion
    // showConfirmationDialog({ ... })
  }

  return (
    <AuthGate>
      <DataControlsScreen
        onDataExport={handleDataExport}
        onClearAllData={handleClearAllData}
      />
    </AuthGate>
  )
}
