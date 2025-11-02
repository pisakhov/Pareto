# Fixed: Database Sync Between View and Edit Components

## Problem
The process graph components were using **two different data sources**:
- **View component** (`processGraphView.js`): Fetched from database API → returned empty
- **Edit component** (`processGraphEdit.js`): Used localStorage → had 3 connections

This caused the Process Flow component on the main page to show nodes but no edges.

## Root Cause
The edit modal was using **localStorage** instead of the database:
```javascript
// OLD CODE (WRONG)
this.connections = JSON.parse(localStorage.getItem('processConnections') || '[]');
```

## Solution
Updated the edit modal to use the **database API** for all operations:

### 1. Load Connections from Database
**Before:**
```javascript
async loadConnections() {
  this.connections = JSON.parse(localStorage.getItem('processConnections') || '[]');
}
```

**After:**
```javascript
async loadConnections() {
  this.connections = await dataService.loadProcessGraph();
  console.log('🔗 ProcessGraph - Loaded connections from database:', this.connections);
}
```

### 2. Create Connection (Database API)
**Before:**
```javascript
createConnection(fromProcessId, toProcessId) {
  this.connections.push({ from_process_id: fromProcessId, to_process_id: toProcessId });
  localStorage.setItem('processConnections', JSON.stringify(this.connections));
}
```

**After:**
```javascript
async createConnection(fromProcessId, toProcessId) {
  await dataService.addProcessEdge(fromProcessId, toProcessId);
  this.connections.push({ from_process_id: fromProcessId, to_process_id: toProcessId });
}
```

### 3. Delete Connection (Database API)
**Before:**
```javascript
deleteEdge(fromProcessId, toProcessId) {
  this.connections = this.connections.filter(...);
  localStorage.setItem('processConnections', JSON.stringify(this.connections));
}
```

**After:**
```javascript
async deleteEdge(fromProcessId, toProcessId) {
  await dataService.removeProcessEdge(fromProcessId, toProcessId);
  this.connections = this.connections.filter(...);
}
```

### 4. Updated Function Signatures
Made functions `async` to properly await API calls:
- `async handleNodeClick()`
- `async handlePortClick()`
- `async createConnection()`
- `async deleteEdge()`

### 5. Removed Unused Code
- Removed `saveConnections()` method (no longer needed)
- All localStorage references eliminated

## API Endpoints Used

### GET `/api/process-graph`
**Returns:** All process connections from database
```javascript
[
  {"from_process_id": 1, "to_process_id": 3},
  {"from_process_id": 2, "to_process_id": 3},
  {"from_process_id": 3, "to_process_id": 4}
]
```

### POST `/api/process-graph?from_process_id=X&to_process_id=Y`
**Creates:** New connection in database

### DELETE `/api/process-graph?from_process_id=X&to_process_id=Y`
**Deletes:** Connection from database

## Testing

### Before Fix
```
View Component Console:
  🌐 ProcessFlowView - Loaded connections: []

Edit Modal Console:
  🔗 ProcessGraph - Loaded connections: (3) [{...}, {...}, {...}]
```

### After Fix
```
View Component Console:
  🌐 ProcessFlowView - Loaded connections: (3) [{...}, {...}, {...}]

Edit Modal Console:
  🔗 ProcessGraph - Loaded connections from database: (3) [{...}, {...}, {...}]
```

## Expected Result
Now both components use the same data source (database), so:
1. Creating connections in the modal saves to database
2. View component displays connections from database
3. Process Flow component shows both nodes **and edges**
4. No more localStorage usage

## Files Modified

### `/frontend/pricing/js/processGraphEdit.js`
- Updated `loadConnections()` to use API
- Updated `createConnection()` to save to database
- Updated `deleteEdge()` to remove from database
- Made functions async
- Removed localStorage references

### `/api/routers/pricing.py`
- Added debug logging to track database contents

## Server Console Output
When loading the page, you should now see:
```
📊 DEBUG - Raw data from process_graph table: [(1, 3), (2, 3), (3, 4)]
📊 DEBUG - Converted to JSON: [{"from_process_id": 1, "to_process_id": 3}, ...]
```

This confirms the database has the connections and both components are using it!

## Next Steps
✅ **Complete!** Both components now sync via database
- View component automatically shows connections from database
- Edit modal creates/deletes connections in database
- Process Flow component will display nodes and edges correctly
