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
    plugins: [
      // Transform import.meta to avoid syntax errors in web bundles
      // Zustand's devtools middleware uses import.meta.env which causes parse errors
      ({ types: t }) => ({
        visitor: {
          MemberExpression(path) {
            // Transform import.meta.env to process.env
            if (
              path.node.object.type === 'MetaProperty' &&
              path.node.object.meta.name === 'import' &&
              path.node.object.property.name === 'meta'
            ) {
              path.replaceWith(t.memberExpression(t.identifier('process'), t.identifier('env')))
            }
          },
        },
      }),
    ],
  }
}
