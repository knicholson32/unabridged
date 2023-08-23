/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontSize: {
        'xxs': ['0.6rem', {
          lineHeight: '1rem'
        }]
      },
      blur: {
        '4xl': '128px',
      },
      gridTemplateColumns: {
        '30': 'repeat(30, minmax(0, 1fr))',
      },
      colors: {
        'unabridged-logo-bg': '#1A1A1A',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
      animation: {
        'marquee-infinite': 'marquee 10s linear infinite',
      },
      transitionProperty: {
        'width': 'width',
        'padding': 'padding',
        'width-padding': 'width, padding'
      },
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio')
  ],
}