/**
 * SignInScreen Props
 * Route file provides navigation callbacks
 */
export interface SignInScreenProps {
  /**
   * Callback when sign in is successful
   * Route file handles navigation with router.replace()
   */
  onSignInSuccess?: () => void

  /**
   * Callback when user is already authenticated
   * Route file handles navigation with router.replace()
   */
  onAlreadyAuthenticated?: () => void
}
