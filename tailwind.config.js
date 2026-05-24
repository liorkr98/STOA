/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Manrope', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Lora', 'Georgia', 'serif'],
        display: ['var(--font-serif)', 'Lora', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'Space Grotesk', 'ui-monospace', 'monospace'],
        data: ['var(--font-mono)', 'Space Grotesk', 'ui-monospace', 'monospace'],
      },
  		borderRadius: {
  			/* Tailwind defaults are overridden so existing rounded-xl/2xl/lg on
  			   cards across the codebase collapse to the new 10px card radius
  			   without touching every callsite. Tags/badges should switch from
  			   `rounded-full` to `rounded-tag` (4px).
  			   v2 spec: 10px cards, 6px buttons, 4px tags — nothing higher. */
  			DEFAULT: 'var(--radius)',
  			sm: '6px',
  			md: '8px',
  			lg: 'var(--radius)',
  			xl: 'var(--radius)',
  			'2xl': 'var(--radius)',
  			'3xl': '14px',
  			tag: 'var(--radius-tag)',
  			btn: '6px',
  			card: '10px'
  		},
  		borderWidth: {
  			DEFAULT: '0.5px',
  			'0': '0',
  			'0.5': '0.5px',
  			'1': '1px',
  			'2': '2px',
  		},
  		colors: {
  			/* v2 spec — direct-named brand tokens (handoff: MASTER.md v1.0)
  			   Added alongside the existing HSL-bound tokens so Tailwind
  			   classes like `text-rolex-green`, `bg-deepest-navy`, or
  			   `border-gold` resolve to the exact spec hex values.
  			   Existing classes (e.g. `bg-primary`, `text-foreground`) keep
  			   working via the HSL system below. */
  			'deepest-navy':  '#0A1A3F',
  			'primary-blue': '#1E3A8A',
  			'lighter-blue': '#2E5090',
  			'gold':         '#D4AF37',
  			'gold-light':   '#E8CC6E',
  			'rolex-green':  '#0E6B45',
  			'green-light':  '#1A8C5A',
  			'velvet-red':   '#922B3E',
  			'red-light':    '#B8475C',
  			'n-50':  '#FAFAFA',
  			'n-100': '#F4F2EE',
  			'n-150': '#ECEAE5',
  			'n-200': '#E8E6E1',
  			'n-300': '#C4C2BD',
  			'n-400': '#8A8884',
  			'n-500': '#5C5B58',
  			'n-600': '#2C2B29',

  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
        gain: 'hsl(var(--gain))',
        loss: 'hsl(var(--loss))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
