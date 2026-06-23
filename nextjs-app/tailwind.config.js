/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cyberBg: '#070510',
        cyberDark: '#0c091c',
        cyberMatte: '#100e21',
        borderGlass: '#2c2456',
        cyberPurple: '#9e00ff',
        cyberBlue: '#00c2ff',
        softText: '#c0bacf',
        starGold: '#ffb800',
        redAlert: '#ff0d5c',
        greenVerified: '#0dff92'
      },
      fontFamily: {
        sans: ['var(--font-outfit)', 'sans-serif'],
        mono: ['var(--font-space-grotesk)', 'monospace']
      }
    },
  },
  plugins: [],
}
