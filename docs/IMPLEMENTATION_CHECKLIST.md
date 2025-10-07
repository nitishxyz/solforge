# Solforge Monorepo - Implementation Checklist

A practical, step-by-step checklist for implementing the monorepo refactor.

---

## Overview

This checklist breaks down the monorepo refactor into actionable tasks. Check off items as you complete them.

**Estimated Time**: 2-4 weeks  
**Team Size**: 1-2 developers

---

## Phase 1: Foundation Setup (Days 1-2)

### Directory Structure
- [ ] Create `apps/` directory in project root
- [ ] Create `packages/` directory in project root
- [ ] Create `apps/cli/` directory
- [ ] Create `apps/web/` directory
- [ ] Create `packages/install/` directory

### Root Configuration
- [ ] Update root `package.json`:
  - [ ] Add `"workspaces": ["apps/*", "packages/*"]`
  - [ ] Add `"private": true`
  - [ ] Add workspace scripts (build, dev, lint, clean)
- [ ] Create/update root `tsconfig.json`
- [ ] Update `.gitignore`:
  - [ ] Add `apps/*/dist`
  - [ ] Add `apps/cli/src/web-dist/`
  - [ ] Add `apps/cli/src/web-assets.ts`
  - [ ] Add `packages/*/dist`
  - [ ] Add `apps/*/node_modules`
  - [ ] Add `packages/*/node_modules`

### Verification
- [ ] Run `bun install` from root
- [ ] Verify workspaces are recognized
- [ ] No errors in terminal

---

## Phase 2: CLI Migration (Days 3-5)

### Package Setup
- [ ] Create `apps/cli/package.json`:
  - [ ] Set name: `"solforge-cli"`
  - [ ] Add dependencies (copy from root package.json)
  - [ ] Add dev scripts (dev, build, prebuild)
  - [ ] Add bin entry: `"solforge": "./dist/solforge"`
- [ ] Create `apps/cli/tsconfig.json`:
  - [ ] Extend root tsconfig
  - [ ] Set correct paths

### Code Migration
- [ ] Move `src/cli/` → `apps/cli/src/commands/`
- [ ] Move `src/commands/` → `apps/cli/src/commands/`
- [ ] Move `src/config/` → `apps/cli/src/config/`
- [ ] Move `src/db/` → `apps/cli/src/db/`
- [ ] Move `src/rpc/` → `apps/cli/src/rpc/`
- [ ] Move `src/services/` → `apps/cli/src/services/`
- [ ] Move `src/types/` → `apps/cli/src/types/`
- [ ] Move `src/utils/` → `apps/cli/src/utils/`

### Entry Point
- [ ] Create `apps/cli/index.ts`:
  - [ ] Import from `./src/commands/main.ts` or similar
  - [ ] Export main CLI function
- [ ] Update all imports to use relative paths (no `@/` aliases initially)

### Testing
- [ ] Test CLI in dev mode: `cd apps/cli && bun run index.ts`
- [ ] Verify all commands work
- [ ] Test RPC server starts correctly
- [ ] Fix any import errors

### Build Verification
- [ ] Run `cd apps/cli && bun build --compile ./index.ts --outfile dist/solforge`
- [ ] Test compiled binary: `./dist/solforge --help`
- [ ] Verify all commands work in binary

---

## Phase 3: Web UI Setup (Days 6-10)

### Project Scaffolding
- [ ] Create `apps/web/package.json`:
  - [ ] Add React, React DOM
  - [ ] Add Vite, TypeScript
  - [ ] Add Tailwind, PostCSS, Autoprefixer
  - [ ] Add @vitejs/plugin-react
- [ ] Create `apps/web/vite.config.ts`:
  - [ ] Configure React plugin
  - [ ] Set build output directory
  - [ ] Configure terser minification
- [ ] Create `apps/web/tsconfig.json`
- [ ] Create `apps/web/index.html`:
  - [ ] Add root div
  - [ ] Link to main.tsx
- [ ] Create `apps/web/postcss.config.js`

### Design System
- [ ] Create `apps/web/index.css`:
  - [ ] Add Tailwind directives
  - [ ] Add AGI color tokens (light mode)
  - [ ] Add AGI color tokens (dark mode)
  - [ ] Add typography styles
  - [ ] Add IBM Plex Mono font import
- [ ] Create `apps/web/tailwind.config.js`:
  - [ ] Configure colors (HSL variables)
  - [ ] Configure fonts
  - [ ] Set content paths

### API Client
- [ ] Create `apps/web/src/lib/config.ts`:
  - [ ] Implement getApiBaseUrl() function
  - [ ] Export API_BASE_URL constant
- [ ] Create `apps/web/src/lib/api.ts`:
  - [ ] Define TypeScript interfaces (SolforgeStatus, Program, Token)
  - [ ] Create SolforgeAPI class
  - [ ] Implement methods: getStatus(), cloneProgram(), cloneToken(), airdrop()
  - [ ] Export api instance

### UI Components
- [ ] Create `apps/web/src/components/ui/Button.tsx`:
  - [ ] Implement variants (primary, secondary, ghost)
  - [ ] Implement sizes (sm, md, lg, icon)
- [ ] Create `apps/web/src/components/ui/Input.tsx`
- [ ] Create `apps/web/src/components/ui/Card.tsx`
- [ ] Create `apps/web/src/components/ui/Modal.tsx`
- [ ] Create `apps/web/src/components/ui/Badge.tsx`

### Layout Components
- [ ] Create `apps/web/src/components/layout/Header.tsx`:
  - [ ] Logo/branding
  - [ ] Theme toggle
  - [ ] Actions
- [ ] Create `apps/web/src/components/layout/Sidebar.tsx`:
  - [ ] Navigation items
  - [ ] Active state styling
- [ ] Create `apps/web/src/components/layout/AppLayout.tsx`:
  - [ ] Compose Header + Sidebar + Main
  - [ ] Responsive layout

### Feature Components
- [ ] Create `apps/web/src/components/programs/ProgramList.tsx`
- [ ] Create `apps/web/src/components/programs/ProgramCard.tsx`
- [ ] Create `apps/web/src/components/programs/CloneProgramModal.tsx`
- [ ] Create `apps/web/src/components/programs/LoadProgramModal.tsx`
- [ ] Create `apps/web/src/components/tokens/TokenList.tsx`
- [ ] Create `apps/web/src/components/tokens/TokenCard.tsx`
- [ ] Create `apps/web/src/components/tokens/CloneTokenModal.tsx`
- [ ] Create `apps/web/src/components/tokens/AirdropForm.tsx`
- [ ] Create `apps/web/src/components/rpc/StatusPanel.tsx`
- [ ] Create `apps/web/src/components/rpc/ConfigPanel.tsx`
- [ ] Create `apps/web/src/components/rpc/ControlButtons.tsx`

### Main App
- [ ] Create `apps/web/src/App.tsx`:
  - [ ] Use AppLayout
  - [ ] Set up routing (if needed)
  - [ ] Fetch status on mount
- [ ] Create `apps/web/src/main.tsx`:
  - [ ] Import React
  - [ ] Import App
  - [ ] Render to DOM

### Development Testing
- [ ] Run `cd apps/web && bun run dev`
- [ ] Verify Vite dev server starts
- [ ] Test all components render
- [ ] Test API integration (mock or real)
- [ ] Test theme toggle (light/dark)
- [ ] Test responsive layout

### Build Testing
- [ ] Run `cd apps/web && bun run build`
- [ ] Verify `apps/web/dist/` created
- [ ] Check file structure:
  - [ ] `index.html`
  - [ ] `assets/index-*.js`
  - [ ] `assets/index-*.css`
- [ ] Verify assets are minified

---

## Phase 4: Web Embedding (Days 11-13)

### Build Script
- [ ] Create `scripts/build-web.ts`:
  - [ ] Import Bun, path, fs modules
  - [ ] Define paths (WEB_DIR, CLI_DIR, etc.)
  - [ ] Build web UI: `await $\`bun run build\`.cwd(WEB_DIR)`
  - [ ] Copy dist to CLI: `await $\`cp -r ${WEB_DIST} ${CLI_WEB_DIST}\``
  - [ ] Scan files recursively (implement scanDirectory function)
  - [ ] Convert files to base64
  - [ ] Generate TypeScript code for web-assets.ts
  - [ ] Write web-assets.ts to apps/cli/src/
- [ ] Make script executable: `chmod +x scripts/build-web.ts`
- [ ] Test script: `bun run scripts/build-web.ts`
- [ ] Verify web-assets.ts generated correctly

### Web Server
- [ ] Create `apps/cli/src/web-server.ts`:
  - [ ] Import web-assets
  - [ ] Define MIME_TYPES map
  - [ ] Implement getMimeType() function
  - [ ] Implement createWebServer() function:
    - [ ] Build asset URL map
    - [ ] Create Bun.serve instance
    - [ ] Handle requests:
      - [ ] Try filesystem first (dev)
      - [ ] Fallback to embedded (production)
      - [ ] Inject API URL into HTML
    - [ ] Return server instance

### CLI Integration
- [ ] Update `apps/cli/index.ts`:
  - [ ] Import createWebServer
  - [ ] Start RPC server
  - [ ] Start web server (port = rpcPort + 1)
  - [ ] Log both server URLs
  - [ ] Handle errors gracefully

### Prebuild Hook
- [ ] Update `apps/cli/package.json`:
  - [ ] Add `"prebuild": "bun run ../../scripts/build-web.ts"`
  - [ ] Ensure build script runs prebuild first

### Testing
- [ ] Test dev mode:
  - [ ] Run `cd apps/cli && bun run index.ts start`
  - [ ] Verify web server starts
  - [ ] Open browser to http://localhost:9101
  - [ ] Verify UI loads from filesystem
  - [ ] Test hot reload (change web file, restart CLI)
- [ ] Test production mode:
  - [ ] Run `cd apps/cli && bun run build`
  - [ ] Verify prebuild runs
  - [ ] Verify web-assets.ts generated
  - [ ] Run `./dist/solforge start`
  - [ ] Open browser to http://localhost:9101
  - [ ] Verify UI loads from embedded assets
  - [ ] Test all functionality

### Platform Builds
- [ ] Build darwin-arm64: `bun run build:darwin-arm64`
- [ ] Build darwin-x64: `bun run build:darwin-x64`
- [ ] Build linux-x64: `bun run build:linux-x64`
- [ ] Build linux-arm64: `bun run build:linux-arm64`
- [ ] Build windows-x64: `bun run build:windows-x64`
- [ ] Test each binary (if possible)

---

## Phase 5: Installer Package (Days 14-15)

### Package Setup
- [ ] Create `packages/install/package.json`:
  - [ ] Set name: `"@solforge/install"`
  - [ ] Add description, keywords, license
  - [ ] Add bin entry
  - [ ] Add dependencies (@clack/prompts)
- [ ] Create `packages/install/tsconfig.json`

### Implementation
- [ ] Create `packages/install/index.ts`:
  - [ ] Add shebang: `#!/usr/bin/env bun`
  - [ ] Import dependencies
  - [ ] Define GITHUB_REPO constant
  - [ ] Implement main() function:
    - [ ] Show intro with clack
    - [ ] Detect platform and arch
    - [ ] Determine binary name
    - [ ] Download from GitHub releases
    - [ ] Install to ~/.local/bin/
    - [ ] Make executable (chmod +x)
    - [ ] Show next steps (add to PATH)
  - [ ] Implement getBinaryName() helper
  - [ ] Call main()

### Build
- [ ] Run `cd packages/install && bun run build`
- [ ] Verify binary created: `packages/install/dist/install`

### Testing
- [ ] Test locally: `./packages/install/dist/install`
- [ ] Verify download works
- [ ] Verify installation works
- [ ] Verify PATH instructions shown
- [ ] Test with bunx (if published to npm):
  - [ ] Publish to npm (or test version)
  - [ ] Run `bunx @solforge/install`

### Documentation
- [ ] Create `packages/install/README.md`:
  - [ ] Installation instructions
  - [ ] Usage examples
  - [ ] Troubleshooting

---

## Phase 6: Cleanup & Documentation (Days 16-17)

### Code Cleanup
- [ ] Remove `src/gui/` directory (old GUI)
- [ ] Remove `src/` directory (if all moved)
- [ ] Remove legacy `server/` directory (if unused)
- [ ] Remove unused dependencies from root package.json
- [ ] Remove old build scripts (build:css, build:gui)

### Git Cleanup
- [ ] Update `.gitignore` (verify all new paths)
- [ ] Remove tracked files that should be ignored:
  - [ ] `git rm --cached apps/cli/src/web-dist`
  - [ ] `git rm --cached apps/cli/src/web-assets.ts`
- [ ] Commit changes: `git add -A && git commit -m "refactor: monorepo structure"`

### Documentation Updates
- [ ] Update root `README.md`:
  - [ ] New installation methods
  - [ ] New development instructions
  - [ ] New build instructions
  - [ ] Architecture overview (link to docs)
- [ ] Update `CONTRIBUTING.md` (if exists):
  - [ ] Monorepo workflow
  - [ ] How to add packages
- [ ] Create `docs/MIGRATION_GUIDE.md`:
  - [ ] For existing contributors
  - [ ] Breaking changes (if any)
  - [ ] New commands and workflows
- [ ] Update `CHANGELOG.md`:
  - [ ] Add v0.3.0 section
  - [ ] List major changes
  - [ ] Migration notes

### Final Testing
- [ ] Clone repo fresh in new directory
- [ ] Run `bun install`
- [ ] Build all: `bun run build:all`
- [ ] Test CLI: `apps/cli/dist/solforge --help`
- [ ] Test all CLI commands
- [ ] Test web UI in browser
- [ ] Test installer: `bunx @solforge/install` (if published)

### Platform Testing
- [ ] Test on macOS (ARM64)
- [ ] Test on macOS (x64)
- [ ] Test on Linux (x64)
- [ ] Test on Linux (ARM64) (optional)
- [ ] Test on Windows (x64) (optional)

---

## Phase 7: Release (Day 18+)

### Pre-Release Checks
- [ ] All tests passing
- [ ] All documentation updated
- [ ] All platforms build successfully
- [ ] No critical bugs

### Version Bump
- [ ] Update version in all package.json files:
  - [ ] Root package.json → 0.3.0
  - [ ] apps/cli/package.json → 0.3.0
  - [ ] apps/web/package.json → 0.3.0
  - [ ] packages/install/package.json → 0.3.0
- [ ] Update CHANGELOG.md with release date

### GitHub Release
- [ ] Build all platform binaries
- [ ] Create Git tag: `git tag v0.3.0`
- [ ] Push tag: `git push origin v0.3.0`
- [ ] Create GitHub Release:
  - [ ] Title: `v0.3.0 - Monorepo Refactor`
  - [ ] Description: Copy from CHANGELOG.md
  - [ ] Upload all binaries as assets
- [ ] Publish release

### NPM Publish
- [ ] Publish installer:
  - [ ] `cd packages/install`
  - [ ] `npm publish --access public`
- [ ] Verify published: `npm info @solforge/install`
- [ ] Test installation: `bunx @solforge/install@latest`

### Announcement
- [ ] Update README with latest version
- [ ] Post release notes (Discord, Twitter, etc.)
- [ ] Update documentation site (if exists)

---

## Post-Release Tasks

### Monitoring
- [ ] Monitor GitHub issues for bug reports
- [ ] Check npm download stats
- [ ] Gather user feedback

### Future Improvements
- [ ] Plan shared package (packages/shared) for common utilities
- [ ] Plan component documentation (Storybook)
- [ ] Plan E2E tests (Playwright)
- [ ] Plan CI/CD pipeline

---

## Rollback Plan

If critical issues are found:

1. **Revert Git Tag**:
   ```bash
   git tag -d v0.3.0
   git push origin :refs/tags/v0.3.0
   ```

2. **Unpublish NPM** (within 72 hours):
   ```bash
   npm unpublish @solforge/install@0.3.0
   ```

3. **Revert to Previous Release**:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

4. **Notify Users**:
   - Post issue on GitHub
   - Update README
   - Provide workaround or fix

---

## Success Metrics

### Technical
- [x] Monorepo structure implemented
- [ ] All builds succeed on all platforms
- [ ] Zero breaking changes for users
- [ ] Web UI fully functional
- [ ] Binary size acceptable (< 150MB)

### Documentation
- [ ] All docs updated
- [ ] Migration guide created
- [ ] README clear and concise
- [ ] Architecture documented

### User Experience
- [ ] Easy installation via bunx
- [ ] Modern, usable web UI
- [ ] Fast performance
- [ ] No regressions

---

## Notes

- **Time Estimates**: Adjust based on team size and experience
- **Testing**: Test early and often
- **Communication**: Keep team and users informed
- **Documentation**: Update as you go, not at the end

---

**Last Updated**: 2024  
**Version**: 1.0  
**Status**: Implementation Guide
