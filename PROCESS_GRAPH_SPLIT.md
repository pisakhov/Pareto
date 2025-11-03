# Process Graph Split - Summary

## Overview
Split the process graph functionality into two separate components to fix the issue where the Process Flow view-only component on the main page wasn't showing edges.

## Problem
The original `processGraph.js` file contained both:
1. **View-only component** - Rendered the "Process Flow" section on the main contracts page
2. **Edit modal component** - Allowed users to create/edit processes and connections in a modal

The issue was:
- **View component** fetched connections from database API (`/api/process-graph`) → returned empty array
- **Edit component** stored connections in `localStorage` → had data but only in modal
- **Result**: Main page showed nodes but no edges because database was empty

## Solution

### New File Structure

#### 1. `processGraphView.js` (8.9 KB)
**Purpose**: View-only component for the main contracts page
**Responsibilities**:
- Fetches processes and connections from database API
- Renders the "Process Flow" component at the top of contracts pages
- Shows process nodes and edges (if they exist in database)
- Allows navigation between process detail pages
- Auto-initializes when DOM is ready

**Key Methods**:
- `init()` - Initialize the view component
- `loadData()` - Fetch data from API endpoints
- `render()` - Render nodes and connections
- `calculateLayout()` - Position nodes using hierarchical layout

**Console Logs**: Uses `🌐 ProcessFlowView` prefix for all logs

#### 2. `processGraphEdit.js` (41.7 KB)
**Purpose**: Edit/modal component for process management
**Responsibilities**:
- Manages the process graph editor modal
- Allows creating/editing/deleting processes
- Enables connecting processes with edges
- Stores connections in localStorage (currently)
- Interactive drag-and-drop graph editor

**Key Features**:
- Full modal editor with process list sidebar
- Drag-and-drop node positioning
- Click-to-connect edges
- Form-based process creation/editing
- Connection management (add/delete edges)

**Console Logs**: Uses various emojis (📝, 🚀, 📊, 🔗, etc.) for different operations

## Database Integration

### Current State
The edit component (`processGraphEdit.js`) uses **localStorage** for storing connections, not the database.

### Future Enhancement Needed
To properly sync the modal editor with the view component:
1. Modify `processGraphEdit.js` to save connections to database via API
2. Use `dataService.addProcessEdge()` and `dataService.removeProcessEdge()` endpoints
3. Remove localStorage dependency

## File Updates

### `frontend/contracts/index.html`
**Before**:
```html
<script src="/static/contracts/js/processGraph.js"></script>
```

**After**:
```html
<script src="/static/contracts/js/processGraphView.js"></script>
<script src="/static/contracts/js/processGraphEdit.js"></script>
```

## Testing

### View Component (Main Page)
1. Navigate to `/contracts`
2. Check browser console for `🌐 ProcessFlowView` logs
3. Verify "Process Flow" section shows nodes
4. **Note**: Edges won't show until database has connections

### Edit Component (Modal)
1. Click "Add Process" button
2. Modal opens with graph editor
3. Create connections between processes
4. **Note**: Connections stored in localStorage (not database)

## API Endpoints Used

### View Component
- `GET /api/processes` - Load all processes
- `GET /api/process-graph` - Load process connections from database

### Edit Component (Future)
- `POST /api/process-graph` - Add connection to database
- `DELETE /api/process-graph` - Remove connection from database

## Console Log Reference

### View Component Logs
```
🌐 ProcessFlowView - Initializing...
🌐 ProcessFlowView - Loading data from API...
🌐 ProcessFlowView - Loaded processes: [...]
🌐 ProcessFlowView - Loaded connections: [...]
🌐 ProcessFlowView - Rendering...
🌐 ProcessFlowView - Layout calculation started: {...}
🌐 ProcessFlowView - Found roots: [...]
🌐 ProcessFlowView - Rendering X connections...
🌐 ProcessFlowView - Connection N: {...}
🌐 ProcessFlowView - Rendering complete!
```

### Edit Component Logs
```
📝 ProcessGraph - Opening process modal...
🚀 ProcessGraph - Initializing...
📊 ProcessGraph - Loaded processes: [...]
🔗 ProcessGraph - Loaded connections: [...]
🎨 ProcessGraph - Rendering with X processes and Y connections
🔗 ProcessGraph - Creating connection: {...}
✅ ProcessGraph - New connection added: {...}
💾 ProcessGraph - Saved connections: [...]
❌ ProcessGraph - Closing process modal...
```

## Next Steps

1. **Immediate**: Test that view component loads without errors
2. **Short-term**: Verify modal editor still works correctly
3. **Medium-term**: Integrate edit component with database
4. **Long-term**: Migrate existing localStorage connections to database

## Migration Path

To migrate edit component to use database:

1. Replace localStorage operations with API calls:
   ```javascript
   // OLD - localStorage
   this.connections = JSON.parse(localStorage.getItem('processConnections') || '[]');

   // NEW - Database API
   this.connections = await dataService.loadProcessGraph();
   ```

2. Update `createConnection()` to use API:
   ```javascript
   await dataService.addProcessEdge(fromProcessId, toProcessId);
   ```

3. Update `deleteEdge()` to use API:
   ```javascript
   await dataService.removeProcessEdge(fromProcessId, toProcessId);
   ```

This ensures both view and edit components work with the same data source.
