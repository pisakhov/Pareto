/**
 * Process Graph View - Renders process flow diagram in view-only mode
 * Used on the main pricing page to show process relationships
 */

class ProcessGraphView {
  constructor() {
    this.processes = [];
    this.connections = [];
  }

  async init() {
    await this.loadData();
    this.render();
  }

  async loadData() {
    try {
      const [processes, connections] = await Promise.all([
        dataService.loadProcesses(),
        dataService.loadProcessGraph()
      ]);

      this.processes = processes;
      this.connections = connections;

    } catch (error) {
      console.error('🌐 ProcessFlowView - Error loading data:', error);
      this.processes = [];
      this.connections = [];
    }
  }

  render() {
    const navGraph = document.getElementById('processGraphNav');
    if (!navGraph) {
      return;
    }

    const canvas = navGraph.querySelector('svg');
    const nodesLayer = navGraph.querySelector('#nodesLayerNav');
    const connectionsLayer = navGraph.querySelector('#connectionsLayerNav');

    if (!nodesLayer || !connectionsLayer) {
      return;
    }

    // Clear existing nodes and connections
    nodesLayer.innerHTML = '';
    connectionsLayer.innerHTML = '';

    if (this.processes.length === 0) {
      return;
    }

    // Create a map of process_id to process data
    const processMap = {};
    this.processes.forEach(p => {
      processMap[p.process_id] = p;
    });

    const nodeWidth = 120;
    const nodeHeight = 50;
    const margin = 40;
    const canvasWidth = canvas.clientWidth || 800;
    const canvasHeight = canvas.clientHeight || 200;

    // Calculate positions using a grid-based layout
    const positions = this.calculateLayout(this.processes, this.connections, canvasWidth, canvasHeight, margin, nodeWidth, nodeHeight);

    // Get current process ID from URL
    const currentProcessId = this.getCurrentProcessId();

    // Render nodes
    Object.keys(positions).forEach(processId => {
      const process = processMap[processId];
      if (!process) return;

      const pos = positions[processId];
      const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      nodeGroup.setAttribute('data-process-id', process.process_id);
      nodeGroup.style.cursor = 'pointer';

      // Node background
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', pos.x);
      rect.setAttribute('y', pos.y);
      rect.setAttribute('width', nodeWidth);
      rect.setAttribute('height', nodeHeight);
      rect.setAttribute('rx', '8');

      // Style based on current process
      if (process.process_id === currentProcessId) {
        rect.setAttribute('fill', '#10b981');
        rect.setAttribute('stroke', '#059669');
        rect.setAttribute('stroke-width', '2');
      } else {
        rect.setAttribute('fill', '#ffffff');
        rect.setAttribute('stroke', '#cbd5e1');
        rect.setAttribute('stroke-width', '1');
      }

      rect.setAttribute('class', 'process-nav-node');
      nodeGroup.appendChild(rect);

      // Process name text
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', pos.x + nodeWidth / 2);
      text.setAttribute('y', pos.y + nodeHeight / 2 + 5);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '14');
      text.setAttribute('font-weight', '500');
      text.setAttribute('fill', process.process_id === currentProcessId ? '#ffffff' : '#0f172a');
      text.textContent = process.process_name;
      nodeGroup.appendChild(text);

      // Add click handler
      nodeGroup.addEventListener('click', () => {
        if (process.process_id !== currentProcessId) {
          window.location.href = `/pricing/${process.process_id}`;
        }
      });

      nodesLayer.appendChild(nodeGroup);
    });

    // Render connections
    this.connections.forEach((conn, index) => {
      const fromPos = positions[conn.from_process_id];
      const toPos = positions[conn.to_process_id];

      if (!fromPos || !toPos) {
        return;
      }

      // Calculate connection points
      const fromX = fromPos.x + nodeWidth;
      const fromY = fromPos.y + nodeHeight / 2;
      const toX = toPos.x;
      const toY = toPos.y + nodeHeight / 2;

      // Create curved path for better visuals
      const midX = (fromX + toX) / 2;
      const pathData = `M ${fromX} ${fromY} Q ${midX} ${fromY} ${toX} ${toY}`;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#94a3b8');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('marker-end', 'url(#arrowhead-nav)');
      connectionsLayer.appendChild(path);
    });

  }

  calculateLayout(processes, connections, canvasWidth, canvasHeight, margin, nodeWidth, nodeHeight) {
    const positions = {};
    const canvasCenterX = canvasWidth / 2;
    const canvasCenterY = canvasHeight / 2;

    if (processes.length === 0) return positions;

    // Find roots (nodes with no incoming connections)
    const incomingCount = {};
    processes.forEach(p => incomingCount[p.process_id] = 0);
    connections.forEach(conn => {
      if (incomingCount[conn.to_process_id] !== undefined) {
        incomingCount[conn.to_process_id]++;
      }
    });
    const roots = processes.filter(p => incomingCount[p.process_id] === 0);

    // If no roots found, use first process as root
    const rootNodes = roots.length > 0 ? roots : [processes[0]];

    // Hierarchical layout
    const levels = {};
    const visited = new Set();

    function assignLevel(nodeId, level) {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      if (!levels[level]) levels[level] = [];
      levels[level].push(nodeId);

      // Find children
      connections.forEach(conn => {
        if (conn.from_process_id === nodeId) {
          assignLevel(conn.to_process_id, level + 1);
        }
      });
    }

    // Assign levels starting from roots
    rootNodes.forEach(root => {
      assignLevel(root.process_id, 0);
    });

    // Position nodes
    const levelsCount = Object.keys(levels).length;
    const levelHeight = (canvasHeight - 2 * margin - nodeHeight) / Math.max(1, levelsCount - 1);

    Object.keys(levels).forEach(levelStr => {
      const level = parseInt(levelStr);
      const nodesAtLevel = levels[level];
      const levelWidth = canvasWidth - 2 * margin;
      const nodeSpacing = levelWidth / (nodesAtLevel.length + 1);

      nodesAtLevel.forEach((processId, index) => {
        const x = margin + nodeSpacing * (index + 1) - nodeWidth / 2;
        const y = margin + level * levelHeight;
        positions[processId] = { x, y };
      });
    });

    // Handle any unvisited nodes (disconnected)
    processes.forEach(process => {
      if (!positions[process.process_id]) {
        const x = canvasCenterX - nodeWidth / 2;
        const y = canvasCenterY - nodeHeight / 2;
        positions[process.process_id] = { x, y };
      }
    });

    return positions;
  }

  getCurrentProcessId() {
    // Extract process ID from URL path
    const match = window.location.pathname.match(/\/pricing\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }
}

// Initialize when DOM is ready
let processGraphView;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    processGraphView = new ProcessGraphView();
    processGraphView.init();
  });
} else {
  processGraphView = new ProcessGraphView();
  processGraphView.init();
}
