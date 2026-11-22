/**
 * Design Tokens & Shared Component Style Presets
 * 
 * Centralized token system enforcing:
 * - Spacing scale: 4 / 8 / 12 / 16 / 24 / 32px
 * - Radii: 8px (md), 12px (lg), 16px (xl)
 * - Typography: min 12px for secondary text, unified KPI numbers
 * - Status colors: Income (Emerald), Expense (Rose/Red), Warning (Amber)
 * - WCAG AA Contrast compliance on dark backgrounds (#0d1117 and #161b22)
 */

export const tokens = {
  // 1. Spacing Scale: 4 / 8 / 12 / 16 / 24 / 32px
  spacing: {
    xs: '4px',    // gap-1 / p-1
    sm: '8px',    // gap-2 / p-2
    md: '12px',   // gap-3 / p-3
    lg: '16px',   // gap-4 / p-4
    xl: '24px',   // gap-6 / p-6
    '2xl': '32px' // gap-8 / p-8
  },

  // 2. Border Radii
  radii: {
    sm: 'rounded-md',  // 6px
    md: 'rounded-lg',  // 8px
    lg: 'rounded-xl',  // 12px
    xl: 'rounded-2xl', // 16px
    full: 'rounded-full'
  },

  // 3. Status Colors (Income, Expense, Warning, Neutral)
  colors: {
    income: {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      solid: 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400'
    },
    expense: {
      text: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      badge: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      solid: 'bg-rose-500 text-white hover:bg-rose-400'
    },
    warning: {
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      badge: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      solid: 'bg-amber-500 text-neutral-950 hover:bg-amber-400'
    },
    neutral: {
      text: 'text-neutral-300',
      bg: 'bg-[#161b22]',
      border: 'border-[#30363d]',
      badge: 'bg-[#0d1117] border-[#30363d] text-neutral-300',
      solid: 'bg-[#21262d] text-neutral-200 hover:bg-[#30363d]'
    }
  },

  // 4. Typography Scale (Min 12px for secondary text, WCAG AA compliant >= 4.5:1)
  typography: {
    // Large numbers: unified font & size for numbers of same hierarchy
    kpiPrimary: 'text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white tabular-nums',
    kpiSecondary: 'text-xl sm:text-2xl font-bold font-mono tracking-tight text-neutral-100 tabular-nums',
    itemNumber: 'text-sm sm:text-base font-semibold font-mono tracking-tight tabular-nums',
    
    // Text labels
    heading: 'text-base sm:text-lg font-semibold text-white tracking-tight',
    cardTitle: 'text-sm sm:text-base font-semibold text-neutral-100 leading-tight',
    body: 'text-sm text-neutral-200',
    // Secondary text guaranteed >= 12px (text-xs) and WCAG AA contrast (text-neutral-400 / #9ca3af >= 4.5:1)
    secondary: 'text-xs text-neutral-400 leading-relaxed font-normal',
    secondaryMedium: 'text-xs text-neutral-300 leading-relaxed font-medium',
    micro: 'text-xs text-neutral-400 font-mono'
  },

  // 5. Layout & Container Presets
  layout: {
    pageContainer: 'max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8',
    grid3Col: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6',
    grid2Col: 'grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6',
    gridBankCards: 'grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6'
  },

  // 6. Shared Component Presets
  components: {
    // Card
    card: 'bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-sm transition-all',
    cardInner: 'p-4 sm:p-5',
    cardHeader: 'flex items-center justify-between p-4 sm:p-5 border-b border-[#30363d]/60 bg-[#161b22]',

    // Badge
    badgeBase: 'inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md font-medium border',

    // Buttons
    buttonPrimary: 'px-3.5 py-2 text-xs sm:text-sm font-semibold bg-emerald-500 text-neutral-950 rounded-xl hover:bg-emerald-400 transition-colors shadow-sm inline-flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer',
    buttonSecondary: 'px-3.5 py-2 text-xs sm:text-sm font-medium text-neutral-300 bg-[#0d1117] border border-[#30363d] rounded-xl hover:text-white hover:border-neutral-500 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer',
    buttonGhost: 'px-2.5 py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors inline-flex items-center justify-center gap-1 cursor-pointer',
    buttonDanger: 'px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 rounded-xl transition-colors inline-flex items-center justify-center gap-1 cursor-pointer'
  }
} as const;

export default tokens;
