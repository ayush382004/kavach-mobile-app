/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  safelist: [
    // TermsModal uses these \u2014 safelist prevents purge in production
    'fixed', 'inset-0', 'z-50', 'flex', 'items-center', 'justify-center',
    'bg-stone-950/50', 'px-4', 'py-6', 'w-full', 'max-w-2xl', 'rounded-3xl',
    'bg-white', 'shadow-2xl', 'border-b', 'border-stone-100', 'px-6', 'py-4',
    'font-display', 'text-xl', 'font-bold', 'text-kavach-dark', 'mt-1',
    'text-sm', 'text-gray-500', 'rounded-full', 'border', 'border-stone-200',
    'px-3', 'py-1', 'text-gray-600', 'hover:bg-stone-50',
    'max-h-[70vh]', 'space-y-4', 'overflow-y-auto', 'py-5', 'leading-7',
    'text-gray-700', 'rounded-2xl', 'border-orange-100', 'bg-orange-50', 'p-4',
    'font-semibold', 'text-xs', 'border-sky-100', 'bg-sky-50',
    'text-green-700', 'text-amber-700', 'border-red-200', 'bg-red-50',
    'text-red-700', 'flex-col', 'gap-3', 'border-t', 'sm:flex-row',
    'sm:justify-end', 'disabled:cursor-not-allowed', 'disabled:opacity-60',
    'mt-2',
  ],
  theme: {
    extend: {
      colors: {
        kavach: {
          orange: '#F97316',
          amber:  '#F59E0B',
          red:    '#EF4444',
          blue:   '#0EA5E9',
          green:  '#22C55E',
          dark:   '#0d0d14',
          warm:   '#131320',
          card:   '#1a1a2e',
          surface: '#131320',
        },
      },
      fontFamily: {
        display: ['"Sora"', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounce 2s infinite',
        'fade-in': 'fadeIn 0.25s ease-out both',
        'slide-up': 'slideUp 0.3s ease-out both',
        'heat-wave': 'heatWave 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0.72 }, to: { opacity: 1 } },
        slideUp: {
          from: { opacity: 0.72, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        heatWave: {
          '0%, 100%': { transform: 'scaleY(1)' },
          '50%': { transform: 'scaleY(1.05)' },
        },
      },
      boxShadow: {
        'kavach': '0 4px 24px rgba(249,115,22,0.15)',
        'kavach-lg': '0 8px 40px rgba(249,115,22,0.2)',
        'card': '0 2px 12px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
