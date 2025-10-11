# Testing the AGI Integration

This guide will help you test the AGI assistant integration in the web app.

## Prerequisites

1. **AGI Server Running**: Make sure the AGI server is running on port 3456
2. **Web App Running**: The web app should be running on port 5173 (or configured port)

## Quick Start

### 1. Start the AGI Server

From the project root:

```bash
# Option 1: Using the dev script
bun run dev:server

# Option 2: Direct from packages/server
cd packages/server
bun run dev
```

You should see output like:
```
🚀 AGI Server running on http://127.0.0.1:3456
```

### 2. Start the Web App

In a new terminal, from the project root:

```bash
cd apps/web
bun run dev
```

You should see:
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### 3. Open the Web App

Navigate to `http://localhost:5173` in your browser.

## Testing Steps

### Basic Functionality

1. **Floating Button Visibility**
   - [ ] Confirm you see a circular bot button in the bottom-right corner
   - [ ] The button should have a bot icon
   - [ ] Hover over it - it should scale up slightly

2. **Open the Sidebar**
   - [ ] Click the floating button
   - [ ] The sidebar should slide in from the right
   - [ ] A backdrop overlay should appear
   - [ ] The floating button should disappear

3. **Close the Sidebar**
   - [ ] Click the X button in the top-right of the sidebar
   - [ ] The sidebar should slide out
   - [ ] The backdrop should disappear
   - [ ] The floating button should reappear
   
   OR
   
   - [ ] Click anywhere on the backdrop (dark overlay)
   - [ ] Same behavior as above

### Session Management

4. **Create a New Session**
   - [ ] Open the sidebar
   - [ ] If no session exists, you'll see a "Create New Session" button
   - [ ] Click it
   - [ ] A new session should be created
   - [ ] The chat interface should appear

5. **Create Multiple Sessions**
   - [ ] Click the "+ New" button in the header
   - [ ] A new session should be created
   - [ ] The chat should clear (you're now in the new session)

6. **Switch Between Sessions**
   - [ ] Click "Switch Session" button (appears in header when you have an active session)
   - [ ] A list of all sessions should appear
   - [ ] Click on a different session
   - [ ] The chat should load messages from that session
   - [ ] Click "Back to Chat" to return

### Chat Functionality

7. **Send a Simple Message**
   - [ ] Type "Hello!" in the chat input at the bottom
   - [ ] Press Enter or click the send button
   - [ ] Your message should appear in the chat
   - [ ] The AI should respond (it will stream in real-time)

8. **Send a Complex Request**
   - [ ] Try: "Can you help me understand what this app does?"
   - [ ] The AI should provide a detailed response
   - [ ] The response should format nicely with markdown

9. **Test Tool Calls**
   - [ ] Try: "What files are in the current directory?"
   - [ ] The AI should use tools (like `ls` or `read`)
   - [ ] You should see tool call indicators in the chat
   - [ ] Results should be displayed properly

10. **Test Code Generation**
    - [ ] Try: "Write a simple React component for a button"
    - [ ] The AI should generate code
    - [ ] Code should be syntax highlighted
    - [ ] Code blocks should be formatted properly

### UI/UX Testing

11. **Responsive Behavior**
    - [ ] Resize your browser window
    - [ ] The sidebar should remain functional
    - [ ] On small screens, the sidebar should take full width

12. **Animations**
    - [ ] Open and close the sidebar multiple times
    - [ ] Animations should be smooth
    - [ ] No flickering or janky movement

13. **Loading States**
    - [ ] When creating a session, you should see a loading spinner
    - [ ] When sending a message, you should see appropriate feedback
    - [ ] While the AI is responding, you should see streaming text

14. **Error Handling**
    - [ ] Stop the AGI server
    - [ ] Try to send a message
    - [ ] You should see an appropriate error message
    - [ ] Restart the server and try again - it should work

## Advanced Testing

### Session Persistence

15. **Reload Page**
    - [ ] Create a session and send some messages
    - [ ] Reload the page (F5)
    - [ ] Open the sidebar
    - [ ] Your session should still be there
    - [ ] Messages should still be visible

### Multiple Tabs

16. **Open in Multiple Tabs**
    - [ ] Open the app in two browser tabs
    - [ ] Create/use sessions in both tabs
    - [ ] Both should work independently
    - [ ] Sessions should sync (if you create in one tab, refresh the other)

### Network Inspection

17. **Check API Calls**
    - [ ] Open browser DevTools (F12)
    - [ ] Go to the Network tab
    - [ ] Open the sidebar
    - [ ] You should see API calls to `http://127.0.0.1:3456`
    - [ ] Check for: `/api/sessions`, `/api/sessions/{id}/messages`, etc.

### Console Errors

18. **Check for Errors**
    - [ ] Open browser DevTools (F12)
    - [ ] Go to the Console tab
    - [ ] Use the app normally
    - [ ] There should be no errors (warnings are OK)

## Common Issues and Solutions

### Sidebar Not Opening

**Symptoms**: Clicking the button does nothing

**Solutions**:
1. Check browser console for errors
2. Verify the store is working: Open React DevTools, check Zustand state
3. Try refreshing the page

### Cannot Create Session

**Symptoms**: "Create New Session" button doesn't work or shows error

**Solutions**:
1. Verify AGI server is running: Check http://127.0.0.1:3456/health
2. Check the .env file has correct VITE_API_BASE_URL
3. Check browser Network tab for failed API calls
4. Check AGI server logs for errors

### Messages Not Appearing

**Symptoms**: You send a message but nothing happens

**Solutions**:
1. Check browser console for errors
2. Verify the session ID is set correctly
3. Check Network tab for SSE (Server-Sent Events) connection
4. Make sure the AGI server is responding

### Styles Look Wrong

**Symptoms**: Components are unstyled or look broken

**Solutions**:
1. Make sure you restarted the dev server after config changes
2. Check that Tailwind config includes the web-sdk package path
3. Clear browser cache and reload
4. Check that index.css has all required CSS variables

## Test Checklist Summary

Copy this checklist for quick testing:

```
□ Floating button visible
□ Sidebar opens on click
□ Sidebar closes on X click
□ Sidebar closes on backdrop click
□ Can create new session
□ Can send messages
□ AI responds correctly
□ Can create multiple sessions
□ Can switch between sessions
□ Sessions persist on reload
□ No console errors
□ Animations smooth
□ Loading states work
□ Error handling works
□ Responsive on different screen sizes
```

## Reporting Issues

If you find bugs, please include:

1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser console errors (if any)
5. Network tab details (if relevant)
6. Screenshots or screen recording

## Next Steps

After testing, you can:

1. Customize the styling in `src/index.css`
2. Add more features to `AgiSidebar.tsx`
3. Integrate with other parts of your app
4. Deploy to production (make sure to update API URLs)
