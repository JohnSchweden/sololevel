const { withDangerousMod } = require('@expo/config-plugins')
const fs = require('node:fs')
const path = require('node:path')

/**
 * Custom Expo config plugin to add dark icon support to iOS asset catalog
 */
function withDarkIcon(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosProjectRoot = config.modRequest.platformProjectRoot
      const assetCatalogPath = path.join(
        iosProjectRoot,
        config.modRequest.projectName,
        'Images.xcassets',
        'AppIcon.appiconset'
      )

      const contentsJsonPath = path.join(assetCatalogPath, 'Contents.json')

      // Get dark icon path from config (ios.darkIcon)
      const darkIconRelativePath = config.ios?.darkIcon || config.expo?.ios?.darkIcon
      if (!darkIconRelativePath) {
        // biome-ignore lint/suspicious/noConsole: Build-time plugin, console is acceptable
        console.warn('⚠️  Dark icon not configured in app.json (ios.darkIcon)')
        return config
      }

      // Resolve dark icon path relative to project root
      const projectRoot = config.modRequest.projectRoot
      const darkIconPath = path.resolve(projectRoot, darkIconRelativePath)

      // Check if dark icon exists
      if (!fs.existsSync(darkIconPath)) {
        // biome-ignore lint/suspicious/noConsole: Build-time plugin, console is acceptable
        console.warn('⚠️  Dark icon not found at:', darkIconPath)
        // biome-ignore lint/suspicious/noConsole: Build-time plugin, console is acceptable
        console.warn('   Looking for:', darkIconRelativePath, 'in', projectRoot)
        return config
      }

      // Read existing Contents.json
      let contents
      if (fs.existsSync(contentsJsonPath)) {
        contents = JSON.parse(fs.readFileSync(contentsJsonPath, 'utf8'))
      } else {
        // biome-ignore lint/suspicious/noConsole: Build-time plugin, console is acceptable
        console.warn('⚠️  AppIcon.appiconset/Contents.json not found')
        return config
      }

      // Check if dark icon entry already exists
      const hasDarkIcon = contents.images.some(
        (img) =>
          img.size === '1024x1024' &&
          img.platform === 'ios' &&
          img.appearances &&
          img.appearances.some((app) => app.appearance === 'luminosity' && app.value === 'dark')
      )

      if (!hasDarkIcon) {
        // Copy dark icon to asset catalog
        const darkIconFilename = 'App-Icon-Dark-1024x1024@1x.png'
        const darkIconDest = path.join(assetCatalogPath, darkIconFilename)

        // Ensure directory exists
        if (!fs.existsSync(assetCatalogPath)) {
          fs.mkdirSync(assetCatalogPath, { recursive: true })
        }

        fs.copyFileSync(darkIconPath, darkIconDest)

        // Add dark icon entry with appearances
        contents.images.push({
          filename: darkIconFilename,
          idiom: 'universal',
          platform: 'ios',
          size: '1024x1024',
          appearances: [
            {
              appearance: 'luminosity',
              value: 'dark',
            },
          ],
        })

        // Write updated Contents.json
        fs.writeFileSync(contentsJsonPath, JSON.stringify(contents, null, 2), 'utf8')

        console.log('✅ Dark icon added to AppIcon.appiconset')
      } else {
        console.log('ℹ️  Dark icon already exists in AppIcon.appiconset')
      }

      return config
    },
  ])
}

module.exports = withDarkIcon
