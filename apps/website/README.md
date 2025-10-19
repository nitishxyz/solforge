# SolForge Website

Documentation and marketing site for SolForge, built with Astro and deployed with SST.

## Development

```bash
cd apps/website
bun install
bun dev
```

This will start the Astro dev server with SST integration at `http://localhost:4321`

## Building

```bash
bun build
```

## Deployment

The site is deployed to AWS using SST. From the root of the project:

```bash
# Install SST globally if needed
bun add -g sst

# Deploy to dev
sst deploy

# Deploy to production
sst deploy --stage production
```

## Stack

- **Astro** - Static site framework
- **Tailwind CSS v4** - Styling (matches SolForge web app theme)
- **SST** - AWS deployment and infrastructure
- **Bun** - Package manager and runtime

## Theme

The site uses the exact same theme and color system as the SolForge web app:
- Font: IBM Plex Mono
- Color system: HSL-based CSS variables
- Supports light and dark mode
