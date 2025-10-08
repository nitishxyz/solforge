# Solforge Monorepo - Quick Start Guide

This is a condensed guide for the monorepo refactor. See [MONOREPO_REFACTOR_PLAN.md](./MONOREPO_REFACTOR_PLAN.md) for full details.

---

## What's Changing

### Before (Current)
```
solforge/
├── src/
│   ├── cli/          # CLI code
│   ├── gui/          # Basic GUI
│   ├── commands/
│   └── ...
├── package.json
└── index.ts
```

### After (Target)
```
solforge/
├── apps/
│   ├── cli/          # Main CLI (embeds web UI)
│   └── web/          # New AGI-style web UI
├── packages/
│   └── install/      # Installer CLI
├── scripts/
│   └── build-web.ts  # Build & embed web UI
└── package.json      # Workspace root
```

---

## Quick Commands

### Setup Workspace
```bash
# Root package.json
{
  "workspaces": ["apps/*", "packages/*"]
}

# Install all dependencies
bun install
```

### Development
```bash
# Run CLI in dev mode
cd apps/cli && bun run dev

# Run web UI in dev mode
cd apps/web && bun run dev

# Build everything
bun run build:all
```

### Build
```bash
# Build web UI (automatically done in prebuild)
bun run build:web

# Build CLI (includes web UI)
cd apps/cli && bun run build

# Build installer
cd packages/install && bun run build
```

---

## File Structure

### apps/cli/ (Main CLI)

**Key Files:**
- `index.ts` - Main entry point
- `src/commands/` - CLI command implementations
- `src/web-server.ts` - Web UI server
- `src/web-assets.ts` - AUTO-GENERATED (embedded assets)
- `src/web-dist/` - Built web UI (gitignored)

**package.json:**
```json
{
  "scripts": {
    "dev": "bun run index.ts",
    "prebuild": "bun run ../../scripts/build-web.ts",
    "build": "bun run prebuild && bun build --compile --minify ./index.ts --outfile dist/solforge"
  }
}
```

### apps/web/ (Web UI)

**Key Files:**
- `src/App.tsx` - Main React app
- `src/lib/config.ts` - API URL configuration
- `src/lib/api.ts` - API client
- `src/components/` - React components
- `index.css` - AGI design system CSS
- `tailwind.config.js` - Tailwind config
- `vite.config.ts` - Vite config

**package.json:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build"
  }
}
```

### packages/install/ (Installer)

**Key Files:**
- `index.ts` - Installer CLI
- `src/download.ts` - Binary download logic

**Usage:**
```bash
bunx solforge
# or
npx solforge
```

---

## Web UI Embedding Flow

### Build Time

```
1. bun run build (in apps/cli)
   ↓
2. Runs prebuild hook → scripts/build-web.ts
   ↓
3. Builds web UI (Vite)
   apps/web/dist/ created
   ↓
4. Copies to apps/cli/src/web-dist/
   ↓
5. Converts all files to base64
   ↓
6. Generates apps/cli/src/web-assets.ts
   (includes embedded assets)
   ↓
7. Compiles CLI binary
   (includes web-assets.ts with base64 data)
```

### Runtime

```
1. CLI starts API server (port 9100)
   ↓
2. CLI starts web server (port 9101)
   ↓
3. Web server maps URLs to assets
   ↓
4. Try filesystem first (dev mode)
   ├─ Found → serve from disk
   └─ Not found → decode base64 (production)
   ↓
5. Inject API URL into HTML
   <script>window.SOLFORGE_API_URL = 'http://localhost:9100';</script>
   ↓
6. Browser loads web UI
   ↓
7. Web app reads window.SOLFORGE_API_URL
```

---

## Design System

### Color Tokens (AGI Style)

```css
:root {
  --background: 220 25% 95%;      /* Light bluish-gray */
  --foreground: 220 10% 15%;      /* Dark text */
  --card: 220 25% 98%;            /* Card background */
  --primary: 222.2 47.4% 11.2%;   /* Nearly black */
  --border: 220 15% 89%;          /* Subtle borders */
  /* ... more tokens */
}

.dark {
  --background: 240 10% 8%;       /* Very dark */
  --foreground: 0 0% 98%;         /* White text */
  /* ... dark mode tokens */
}
```

### Typography

- **Font**: IBM Plex Mono (monospace everywhere)
- **Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

### Component Pattern

```tsx
// apps/web/src/components/ui/Button.tsx
export function Button({ variant = 'primary', ...props }) {
  return (
    <button
      className={`
        px-4 py-2 rounded-lg font-medium
        transition-colors
        ${variant === 'primary' 
          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        }
      `}
      {...props}
    />
  );
}
```

---

## API Integration

### Frontend (apps/web/src/lib/config.ts)

```typescript
function getApiBaseUrl(): string {
  // Dev: Use env var
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Production: Read injected value
  if (window.SOLFORGE_API_URL) {
    return window.SOLFORGE_API_URL;
  }
  
  return 'http://localhost:9100';
}

export const API_BASE_URL = getApiBaseUrl();
```

### Backend (apps/cli/src/web-server.ts)

```typescript
// Inject API URL at runtime
if (pathname.endsWith('.html')) {
  let html = await file.text();
  const scriptTag = `<script>window.SOLFORGE_API_URL = 'http://localhost:${apiPort}';</script>`;
  html = html.replace('</head>', `${scriptTag}</head>`);
  return new Response(html);
}
```

---

## Migration Checklist

### Phase 1: Setup (Day 1)
- [ ] Create `apps/` and `packages/` directories
- [ ] Update root `package.json` with workspaces
- [ ] Create `apps/cli/package.json`
- [ ] Create `apps/web/package.json`
- [ ] Create `packages/install/package.json`

### Phase 2: Move CLI (Day 2-3)
- [ ] Move `src/` contents to `apps/cli/src/`
- [ ] Update imports in CLI code
- [ ] Create `apps/cli/index.ts`
- [ ] Test CLI builds

### Phase 3: Build Web UI (Day 4-7)
- [ ] Set up Vite + React in `apps/web/`
- [ ] Implement design system CSS
- [ ] Build layout components
- [ ] Build UI primitives
- [ ] Build feature components
- [ ] Test web UI dev mode

### Phase 4: Web Embedding (Day 8-10)
- [ ] Create `scripts/build-web.ts`
- [ ] Create `apps/cli/src/web-server.ts`
- [ ] Add prebuild hook to `apps/cli/package.json`
- [ ] Test dev mode (filesystem)
- [ ] Test production mode (embedded)

### Phase 5: Installer (Day 11-12)
- [ ] Create `packages/install/index.ts`
- [ ] Implement download logic
- [ ] Test installation flow
- [ ] Publish to npm

### Phase 6: Cleanup (Day 13-14)
- [ ] Remove `src/gui/`
- [ ] Update all docs
- [ ] Test all platforms
- [ ] Final review

---

## Key Scripts

### scripts/build-web.ts (Simplified)

```typescript
#!/usr/bin/env bun
import { $ } from 'bun';

// 1. Build web UI
await $`bun run build`.cwd('apps/web');

// 2. Copy to CLI
await $`cp -r apps/web/dist apps/cli/src/web-dist`;

// 3. Convert to base64 and generate web-assets.ts
const files = scanDirectory('apps/cli/src/web-dist');
const assets = new Map();

for (const file of files) {
  const buffer = await Bun.file(file).arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  assets.set(file, base64);
}

// 4. Write TypeScript file
await Bun.write(
  'apps/cli/src/web-assets.ts',
  generateWebAssetsCode(assets)
);
```

### apps/cli/src/web-server.ts (Simplified)

```typescript
import { getEmbeddedAsset } from './web-assets';

export function createWebServer(port: number, apiPort: number) {
  return Bun.serve({
    port,
    async fetch(req) {
      const path = new URL(req.url).pathname;
      
      // Try filesystem first
      const file = Bun.file(`./src/web-dist${path}`);
      if (await file.exists()) {
        return new Response(file);
      }
      
      // Fallback to embedded
      const embedded = getEmbeddedAsset(path);
      if (embedded) {
        return new Response(embedded);
      }
      
      return new Response('Not Found', { status: 404 });
    }
  });
}
```

---

## Troubleshooting

### Build Fails

**Issue**: `web-assets.ts` not found

**Solution**: Run prebuild manually
```bash
cd apps/cli
bun run ../../scripts/build-web.ts
```

### Web UI Not Loading

**Issue**: Assets return 404

**Solution**: Check asset paths in `web-assets.ts`
```typescript
// Enable debug mode
console.log('Asset map:', assetMap);
```

### API Not Connecting

**Issue**: Web UI can't reach API

**Solution**: Check injected URL
```html
<!-- In browser devtools, check: -->
<script>window.SOLFORGE_API_URL = 'http://localhost:9100';</script>
```

---

## Resources

- **Full Plan**: [MONOREPO_REFACTOR_PLAN.md](./MONOREPO_REFACTOR_PLAN.md)
- **AGI Design System**: [AGI_WEB_UI_GUIDE.md](./AGI_WEB_UI_GUIDE.md)
- **Web Embedding**: [webapp-embedding-guide.md](./webapp-embedding-guide.md)
- **Bun Workspaces**: https://bun.sh/docs/install/workspaces

---

## Next Steps

1. **Review this plan**
2. **Create initial structure** (Phase 1)
3. **Move CLI code** (Phase 2)
4. **Build web UI** (Phase 3)
5. **Integrate everything** (Phases 4-6)

**Ready to start? Begin with Phase 1!** 🚀
