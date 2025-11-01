export function toggleControlsVisibilityOnTap(
  showControls: boolean,
  onControlsVisibilityChange: (visible: boolean, isUserInteraction: boolean) => void
): void {
  onControlsVisibilityChange(!showControls, true)
}
