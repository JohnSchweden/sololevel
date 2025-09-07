module.exports = (api) => {
  api.cache(true)
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Disable reanimated plugin to avoid worklets dependency
          reanimated: false,
        },
      ],
    ],
  }
}
