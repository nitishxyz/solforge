# Quick Start: AGI Integration

## The Issue You're Experiencing

You're seeing the error: `undefined is not an object (evaluating 'config.defaults.agent')`

This happens because the AGI CLI server is not running. The web-sdk is trying to fetch configuration from the AGI server, but it can't connect.

## Solution: Start the AGI Server

The AGI server needs to be running separately from this SolForge app. Here's how:

### Option 1: Use Global AGI CLI (Recommended)

If you have AGI CLI installed globally:

```bash
# Start AGI server on port 3456
agi server --port 3456
```

### Option 2: Install AGI CLI

If you don't have AGI CLI installed:

```bash
# Install globally
npm install -g @agi-cli/cli
# or
bun add -g @agi-cli/cli

# Then start the server
agi server --port 3456
```

### Option 3: Use npx (No Installation)

```bash
npx @agi-cli/cli server --port 3456
```

## Verify the Server is Running

Open a new terminal and test:

```bash
curl http://127.0.0.1:3456/health
```

You should see: `{"status":"ok"}`

## Now Test the Web App

1. Keep the AGI server running in one terminal
2. In another terminal, start the web app:
   ```bash
   cd apps/web
   bun run dev
   ```
3. Open http://localhost:5173
4. Click the floating bot button in the bottom-right
5. The sidebar should open and work correctly!

## Why This Happens

The `@agi-cli/web-sdk` package expects an AGI server to be running. It makes API calls to:
- `/api/sessions` - List chat sessions
- `/api/config` - Get agent/model configuration
- `/api/sessions/:id/messages` - Get messages
- And more...

Without the server running, these calls fail and cause the error you're seeing.

## Alternative: Use Mock Data (Development Only)

If you want to test the UI without the AGI server, you can temporarily modify the components to use mock data. But for full functionality, you need the AGI server running.

## Common Issues

### Port Already in Use

If port 3456 is taken:
```bash
# Find what's using the port
lsof -i :3456

# Or use a different port and update .env
agi server --port 9999
```

Then update `apps/web/.env`:
```
VITE_API_BASE_URL=http://127.0.0.1:9999
```

### Server Not Found

If `agi` command is not found, the CLI isn't installed. Use Option 2 or 3 above.

### CORS Errors

The AGI server should handle CORS automatically. If you see CORS errors, make sure:
1. The AGI server version is up to date
2. You're using the correct URL in `.env`

## Next Steps

Once the server is running, refer to:
- `AGI_INTEGRATION.md` - Full integration documentation
- `TESTING_AGI.md` - Complete testing guide
