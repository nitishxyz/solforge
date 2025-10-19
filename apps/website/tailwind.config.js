/** @type {import('tailwindcss').Config} */
export default {
	darkMode: "class",
	content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
	theme: {
		extend: {
			colors: {
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				sidebar: {
					DEFAULT: "hsl(var(--sidebar-background))",
					foreground: "hsl(var(--sidebar-foreground))",
					primary: "hsl(var(--sidebar-primary))",
					"primary-foreground": "hsl(var(--sidebar-primary-foreground))",
					accent: "hsl(var(--sidebar-accent))",
					"accent-foreground": "hsl(var(--sidebar-accent-foreground))",
					border: "hsl(var(--sidebar-border))",
					ring: "hsl(var(--sidebar-ring))",
				},
			},
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},
			fontFamily: {
				sans: ["IBM Plex Mono", "monospace"],
				mono: ["IBM Plex Mono", "monospace"],
			},
			typography: {
				DEFAULT: {
					css: {
						maxWidth: "65ch",
						color: "hsl(var(--foreground))",
						"--tw-prose-body": "hsl(var(--foreground))",
						"--tw-prose-headings": "hsl(var(--foreground))",
						"--tw-prose-links": "hsl(var(--primary))",
						"--tw-prose-bold": "hsl(var(--foreground))",
						"--tw-prose-code": "hsl(var(--foreground))",
						"--tw-prose-pre-code": "hsl(var(--foreground))",
						"--tw-prose-pre-bg": "hsl(var(--muted))",
						"--tw-prose-th-borders": "hsl(var(--border))",
						"--tw-prose-td-borders": "hsl(var(--border))",

						// Headings
						h1: {
							fontSize: "2.25rem",
							fontWeight: "800",
							marginTop: "0",
							marginBottom: "1rem",
						},
						h2: {
							fontSize: "1.875rem",
							fontWeight: "700",
							marginTop: "2rem",
							marginBottom: "1rem",
							paddingBottom: "0.5rem",
							borderBottom: "1px solid hsl(var(--border))",
						},
						h3: {
							fontSize: "1.5rem",
							fontWeight: "600",
							marginTop: "1.5rem",
							marginBottom: "0.75rem",
						},
						h4: {
							fontSize: "1.25rem",
							fontWeight: "600",
							marginTop: "1.5rem",
							marginBottom: "0.5rem",
						},

						// Inline code
						"code::before": {
							content: '""',
						},
						"code::after": {
							content: '""',
						},
						":not(pre) > code": {
							backgroundColor: "hsl(var(--muted))",
							padding: "0.2rem 0.4rem",
							borderRadius: "0.25rem",
							fontSize: "0.875em",
							fontWeight: "600",
						},

						// Code blocks
						pre: {
							backgroundColor: "hsl(var(--muted))",
							padding: "1rem 1.5rem",
							borderRadius: "0.5rem",
							border: "1px solid hsl(var(--border))",
							marginTop: "1.5rem",
							marginBottom: "1.5rem",
						},
						"pre code": {
							backgroundColor: "transparent",
							padding: "0",
							fontSize: "0.875em",
						},

						// Tables
						table: {
							width: "100%",
							borderCollapse: "collapse",
							marginTop: "1.5rem",
							marginBottom: "1.5rem",
							fontSize: "0.875em",
						},
						thead: {
							borderBottom: "1px solid hsl(var(--border))",
						},
						th: {
							padding: "0.75rem",
							textAlign: "left",
							fontWeight: "600",
							backgroundColor: "hsl(var(--muted))",
						},
						td: {
							padding: "0.75rem",
							borderBottom: "1px solid hsl(var(--border))",
						},

						// Blockquotes
						blockquote: {
							borderLeft: "4px solid hsl(var(--primary))",
							paddingLeft: "1rem",
							fontStyle: "italic",
							margin: "1.5rem 0",
							color: "hsl(var(--muted-foreground))",
						},

						// Lists
						ul: {
							listStyleType: "disc",
							marginTop: "1rem",
							marginBottom: "1rem",
							paddingLeft: "1.625rem",
						},
						ol: {
							listStyleType: "decimal",
							marginTop: "1rem",
							marginBottom: "1rem",
							paddingLeft: "1.625rem",
						},
						li: {
							marginTop: "0.5rem",
							marginBottom: "0.5rem",
						},

						// Links
						a: {
							color: "hsl(var(--primary))",
							textDecoration: "underline",
							fontWeight: "500",
							"&:hover": {
								opacity: "0.8",
							},
						},

						// Horizontal rules
						hr: {
							border: "0",
							borderTop: "1px solid hsl(var(--border))",
							margin: "2rem 0",
						},

						// Strong
						strong: {
							fontWeight: "600",
							color: "hsl(var(--foreground))",
						},
					},
				},
			},
		},
	},
	plugins: [require("@tailwindcss/typography")],
};
