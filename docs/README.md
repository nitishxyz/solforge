# Solforge Documentation

Welcome to the Solforge documentation! This directory contains comprehensive guides for the monorepo refactor and new web UI implementation.

---

## 📚 Documentation Index

### 🎯 Getting Started

1. **[MONOREPO_QUICK_START.md](./MONOREPO_QUICK_START.md)** - Start here!
   - Quick overview of the refactor
   - Key commands and workflows
   - Essential file structure

2. **[IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md)** - Practical guide
   - Step-by-step checklist
   - Phase-by-phase breakdown
   - Testing and release procedures

### 📋 Detailed Plans

3. **[MONOREPO_REFACTOR_PLAN.md](./MONOREPO_REFACTOR_PLAN.md)** - Complete strategy
   - Full architecture overview
   - Migration strategy
   - Package configurations
   - Web UI implementation details
   - Build & deployment processes

4. **[ARCHITECTURE_DIAGRAM.md](./ARCHITECTURE_DIAGRAM.md)** - Visual guide
   - Package structure diagrams
   - Build flow charts
   - Runtime execution flow
   - Data flow diagrams
   - Security model

### 🎨 Design Resources

5. **[AGI_WEB_UI_GUIDE.md](./AGI_WEB_UI_GUIDE.md)** - Design system (provided)
   - Color system
   - Typography
   - Component patterns
   - Layout structure

6. **[webapp-embedding-guide.md](./webapp-embedding-guide.md)** - Embedding guide (provided)
   - How web embedding works
   - Build process
   - Runtime serving
   - Implementation patterns

7. **[webapp-embedding-quick-ref.md](./webapp-embedding-quick-ref.md)** - Quick reference (provided)
   - Condensed embedding guide
   - Key code snippets
   - Troubleshooting

---

## 🚀 Quick Navigation

### For New Contributors

**Start here:**
1. Read [MONOREPO_QUICK_START.md](./MONOREPO_QUICK_START.md)
2. Review [ARCHITECTURE_DIAGRAM.md](./ARCHITECTURE_DIAGRAM.md)
3. Follow [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md)

### For Implementers

**Building the refactor:**
1. Use [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) as your guide
2. Reference [MONOREPO_REFACTOR_PLAN.md](./MONOREPO_REFACTOR_PLAN.md) for details
3. Check [webapp-embedding-guide.md](./webapp-embedding-guide.md) for web UI embedding

### For Designers/Frontend Devs

**Building the UI:**
1. Study [AGI_WEB_UI_GUIDE.md](./AGI_WEB_UI_GUIDE.md) for design system
2. Review component patterns in the refactor plan
3. Check [ARCHITECTURE_DIAGRAM.md](./ARCHITECTURE_DIAGRAM.md) for UI structure

---

## 📖 Document Purposes

### MONOREPO_QUICK_START.md
**Who**: Everyone  
**What**: High-level overview and quick reference  
**When**: First read, ongoing reference

### IMPLEMENTATION_CHECKLIST.md
**Who**: Developers implementing the refactor  
**What**: Actionable checklist with tasks  
**When**: During implementation

### MONOREPO_REFACTOR_PLAN.md
**Who**: Team leads, architects, implementers  
**What**: Complete technical specification  
**When**: Planning phase, detailed reference

### ARCHITECTURE_DIAGRAM.md
**Who**: Everyone (visual learners especially)  
**What**: Visual diagrams and flow charts  
**When**: Understanding system design

### AGI_WEB_UI_GUIDE.md
**Who**: Frontend developers, designers  
**What**: Complete design system documentation  
**When**: Building UI components

### webapp-embedding-guide.md
**Who**: Backend/build engineers  
**What**: Detailed embedding technical guide  
**When**: Implementing web embedding

### webapp-embedding-quick-ref.md
**Who**: Developers needing quick answers  
**What**: Condensed embedding reference  
**When**: Quick lookups during implementation

---

## 🗂️ Project Structure Overview

```
solforge/
├── apps/
│   ├── cli/              # Main Solforge CLI
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   ├── web-server.ts
│   │   │   ├── web-assets.ts (auto-generated)
│   │   │   └── web-dist/ (gitignored)
│   │   ├── index.ts
│   │   └── package.json
│   │
│   └── web/              # New AGI-style Web UI
│       ├── src/
│       │   ├── components/
│       │   ├── lib/
│       │   └── App.tsx
│       ├── index.html
│       ├── index.css
│       └── package.json
│
├── packages/
│   └── install/          # Installer CLI
│       ├── index.ts
│       └── package.json
│
├── scripts/
│   └── build-web.ts      # Web UI build & embedding
│
├── docs/                 # You are here!
│   ├── README.md
│   ├── MONOREPO_QUICK_START.md
│   ├── IMPLEMENTATION_CHECKLIST.md
│   ├── MONOREPO_REFACTOR_PLAN.md
│   ├── ARCHITECTURE_DIAGRAM.md
│   ├── AGI_WEB_UI_GUIDE.md
│   ├── webapp-embedding-guide.md
│   └── webapp-embedding-quick-ref.md
│
└── package.json          # Root workspace config
```

---

## 🔄 Workflow Examples

### Daily Development

```bash
# Terminal 1: CLI Development
cd apps/cli
bun run dev

# Terminal 2: Web UI Development
cd apps/web
bun run dev

# Browser: http://localhost:5173
```

### Building for Production

```bash
# Build everything
bun run build:all

# Or individually:
cd apps/cli && bun run build
cd apps/web && bun run build
cd packages/install && bun run build
```

### Testing Embedded Web UI

```bash
# Build CLI (includes web UI)
cd apps/cli
bun run build

# Run binary
./dist/solforge start

# Browser: http://localhost:9101
```

---

## 🎯 Key Concepts

### Monorepo
- **apps/**: Standalone applications (CLI, Web)
- **packages/**: Reusable packages (installer)
- **Workspace**: Bun manages dependencies across all packages

### Web Embedding
- **Build Time**: Web UI built → copied → converted to base64 → embedded in binary
- **Runtime**: Binary serves web UI from embedded assets
- **Development**: Serves from filesystem for fast iteration
- **Production**: Serves from embedded base64 in compiled binary

### Design System
- **AGI Style**: IBM Plex Mono, minimal design, dark/light themes
- **Components**: Reusable UI primitives (Button, Input, Card, Modal)
- **Colors**: Semantic HSL tokens for theming

---

## ❓ FAQ

### Q: Which document should I read first?
**A**: Start with [MONOREPO_QUICK_START.md](./MONOREPO_QUICK_START.md) for overview, then move to [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) for action items.

### Q: How do I understand the web embedding?
**A**: Read [webapp-embedding-quick-ref.md](./webapp-embedding-quick-ref.md) for basics, then [webapp-embedding-guide.md](./webapp-embedding-guide.md) for deep dive.

### Q: Where are the design specs?
**A**: [AGI_WEB_UI_GUIDE.md](./AGI_WEB_UI_GUIDE.md) has complete design system documentation.

### Q: How do I visualize the architecture?
**A**: Check [ARCHITECTURE_DIAGRAM.md](./ARCHITECTURE_DIAGRAM.md) for all diagrams and flow charts.

### Q: What's the migration timeline?
**A**: [MONOREPO_REFACTOR_PLAN.md](./MONOREPO_REFACTOR_PLAN.md) has detailed timeline (2-4 weeks estimated).

---

## 🔗 External Resources

- **Bun Workspaces**: https://bun.sh/docs/install/workspaces
- **Vite**: https://vite.dev/
- **React**: https://react.dev/
- **Tailwind CSS**: https://tailwindcss.com/
- **IBM Plex Mono**: https://fonts.google.com/specimen/IBM+Plex+Mono

---

## 📝 Contributing to Docs

When updating documentation:

1. **Keep it current**: Update docs as you implement
2. **Be specific**: Include code examples and file paths
3. **Cross-reference**: Link to related docs
4. **Test examples**: Verify all commands and code work
5. **Update index**: Add new docs to this README

---

## 🏆 Success Criteria

Before considering the refactor complete:

- [ ] All documentation is accurate and up-to-date
- [ ] Every document has been reviewed
- [ ] Code examples are tested and working
- [ ] Architecture diagrams reflect actual implementation
- [ ] Migration guide is clear and actionable
- [ ] Quick start guide helps new contributors

---

## 📞 Support

**Need help?**
- Review relevant docs above
- Check existing GitHub issues
- Ask in Discord/Slack
- Create new issue with `[docs]` tag

---

**Last Updated**: 2024  
**Maintained by**: Solforge Team  
**License**: MIT
