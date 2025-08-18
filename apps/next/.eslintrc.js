module.exports = {
  extends: 'next',
  root: true,
  overrides: [
    {
      // Tamagui auto-generates _document.tsx with styled-jsx, which Next.js flags as problematic
      // This is a known issue with Tamagui's Next.js integration
      files: ['pages/_document.{js,jsx,ts,tsx}'],
      rules: {
        '@next/next/no-styled-jsx-in-document': 'off',
      },
    },
  ],
}
