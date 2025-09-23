import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      // UPDATED FOR MOBILE: Custom breakpoints for all device sizes
      screens: {
        'xs': '320px',   // Small phones (iPhone SE)
        'sm': '481px',   // Medium phones (Galaxy S20)
        'md': '769px',   // Large phones/small tablets
        'lg': '1025px',  // Tablets/small laptops
        'xl': '1280px',  // Desktop
        '2xl': '1536px', // Large desktop
        // Custom mobile-specific breakpoints
        'mobile-s': '320px',   // iPhone SE, Galaxy Fold
        'mobile-m': '375px',   // iPhone 12/13
        'mobile-l': '414px',   // iPhone 12 Pro Max
        'foldable': '672px',   // Galaxy Z Fold (unfolded)
        'foldable-l': '840px', // Large foldable devices
      },
      // UPDATED FOR MOBILE: Responsive font sizes using clamp
      fontSize: {
        'mobile-xs': ['clamp(10px, 2.5vw, 12px)', { lineHeight: '1.4' }],
        'mobile-sm': ['clamp(12px, 3vw, 14px)', { lineHeight: '1.4' }],
        'mobile-base': ['clamp(14px, 4vw, 16px)', { lineHeight: '1.5' }],
        'mobile-lg': ['clamp(16px, 4.5vw, 18px)', { lineHeight: '1.6' }],
        'mobile-xl': ['clamp(18px, 5vw, 20px)', { lineHeight: '1.6' }],
        'mobile-2xl': ['clamp(20px, 6vw, 24px)', { lineHeight: '1.7' }],
      },
      // UPDATED FOR MOBILE: Minimum touch target sizes
      minHeight: {
        'touch': '44px',
        'touch-lg': '56px',
      },
      minWidth: {
        'touch': '44px',
        'touch-lg': '56px',
      },
      // UPDATED FOR MOBILE: Spacing for mobile devices
      spacing: {
        'mobile-xs': 'clamp(0.25rem, 1vw, 0.5rem)',
        'mobile-sm': 'clamp(0.5rem, 2vw, 1rem)',
        'mobile-md': 'clamp(1rem, 3vw, 1.5rem)',
        'mobile-lg': 'clamp(1.5rem, 4vw, 2rem)',
      },
      // UPDATED FOR MOBILE: Animation utilities
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounce 1s infinite',
      },
    },
  },
  plugins: [],
};
export default config;