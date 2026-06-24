/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#ffffff',
        'surface-soft': '#f8f9fa',
        'surface-card': '#f5f5f5',
        'surface-strong': '#e5e7eb',
        'surface-dark': '#101010',
        'surface-dark-elevated': '#1a1a1a',
        hairline: '#e3e5e9',
        'hairline-strong': '#d3d7de',
        'hairline-soft': '#eceef1',
        ink: '#111111',
        body: '#374151',
        muted: '#6b7280',
        'muted-soft': '#898989',
        'on-dark-soft': '#a1a1aa',
        primary: '#111111',
        'primary-active': '#242424',
        'brand-accent': '#3b82f6',
        'badge-orange': '#fb923c',
        'badge-pink': '#ec4899',
        'badge-violet': '#8b5cf6',
        'badge-emerald': '#34d399',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'system-ui', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        md: '8px',
        lg: '12px',
        xl: '16px',
        pill: '9999px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.05)',
        card: '0 4px 12px rgba(0,0,0,0.08)',
      },
      maxWidth: {
        content: '1200px',
      },
    },
  },
  plugins: [],
}
