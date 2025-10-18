import { Redirect } from 'expo-router'

/**
 * Root Index - Redirects to tabs layout
 *
 * This file handles the root route (/) and redirects authenticated users
 * to the main tabs layout. The default tab is 'record' (camera).
 *
 * Authentication is handled by AuthGate in main app layout.
 */
export default function Index() {
  return <Redirect href={'/(tabs)/record' as any} />
}
