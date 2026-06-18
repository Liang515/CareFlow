/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        monitor: {
          bg: '#f8fafc',       // Fresh Slate 50 background
          card: '#ffffff',     // Clean White Card
          border: '#e2e8f0',   // Soft Slate 200 border
          text: '#0f172a',     // Slate 900 text
          dim: '#64748b',      // Slate 500 dim text
          green: '#10b981',    // Emerald 500 (Heart Rate)
          cyan: '#06b6d4',     // Cyan 500 (SpO2 / Urine)
          yellow: '#f59e0b',   // Amber 500 (Respiratory Rate)
          red: '#ef4444',      // Red 500 (Blood Pressure / Alerts)
          purple: '#8b5cf6',   // Violet 500 (Medication)
          orange: '#f97316',   // Orange 500 (Care Requests)
          indigo: '#6366f1',   // Indigo 500 (Sleep Status)
        }
      },
      fontFamily: {
        telemetry: ['"Share Tech Mono"', 'Courier New', 'Courier', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
