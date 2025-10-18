import { PersonalisationScreen } from '@my/app/features/Personalisation'

/**
 * Personalisation Settings Route (Web)
 *
 * Renders the PersonalisationScreen with authentication protection.
 *
 * Route: /settings/personalisation
 * Auth: Protected (requires authentication)
 */
export default function PersonalisationRoute() {
  return <PersonalisationScreen />
}
