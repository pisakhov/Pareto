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
    console.log('🎨 ProcessGraphView - init() called');
    await this.loadData();
    console.log('🎨 ProcessGraphView - data loaded, processes:', this.processes.length, 'connections:', this.connections.length);
    this.autoLayout();
    console.log('🎨 ProcessGraphView - autoLayout complete');
    this.render();
    console.log('🎨 ProcessGraphView - render complete');
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

  autoLayout() {
    const nodeMap = new Map();
    const levels = new Map();
    const visited = new Set();

    this.processes.forEach(p => {
      nodeMap.set(p.process_id, {
        process: p,
        inputs: [],
        outputs: []
      });
    });

    this.connections.forEach(conn => {
      if (nodeMap.has(conn.from_process_id) && nodeMap.has(conn.to_process_id)) {
        nodeMap.get(conn.from_process_id).outputs.push(conn.to_process_id);
        nodeMap.get(conn.to_process_id).inputs.push(conn.from_process_id);
      }
    });

    const roots = [];
    nodeMap.forEach((node, id) => {
      if (node.inputs.length === 0) {
        roots.push(id);
      }
    });

    if (roots.length === 0 && this.processes.length > 0) {
      roots.push(this.processes[0].process_id);
    }

    const queue = [...roots];
    roots.forEach(id => levels.set(id, 0));

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const currentLevel = levels.get(currentId) || 0;
      const node = nodeMap.get(currentId);

      node.outputs.forEach(outputId => {
        if (!levels.has(outputId) || levels.get(outputId) < currentLevel + 1) {
          levels.set(outputId, currentLevel + 1);
          queue.push(outputId);
        }
      });
    }

    const levelGroups = new Map();
    levels.forEach((level, id) => {
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level).push(id);
    });

    // Canvas-relative positioning (assuming 1043x200 canvas)
    const canvasWidth = 1043;
    const canvasHeight = 200;
    const marginX = 40;
    const marginY = 30;
    const levelWidth = 250;
    const nodeSpacing = 60;

    levelGroups.forEach((nodeIds, level) => {
      nodeIds.forEach((nodeId, index) => {
        const process = this.processes.find(p => p.process_id === nodeId);
        if (process) {
          const x = marginX + (level * levelWidth);
          const y = marginY + (index * nodeSpacing);
          console.log('🎨 ProcessGraphView - autoLayout positioning:', process.process_name, 'at', x, y);
          process.x = x;
          process.y = y;
        }
      });
    });
  }

  render() {
    console.log('🎨 ProcessGraphView - render() called');
    const navGraph = document.getElementById('processGraphNav');
    console.log('🎨 ProcessGraphView - navGraph element:', navGraph);
    if (!navGraph) {
      console.log('🎨 ProcessGraphView - navGraph not found, returning early');
      return;
    }

    const canvas = navGraph.querySelector('svg');
    const nodesLayer = navGraph.querySelector('#nodesLayerNav');
    const connectionsLayer = navGraph.querySelector('#connectionsLayerNav');
    console.log('🎨 ProcessGraphView - canvas:', canvas, 'nodesLayer:', nodesLayer, 'connectionsLayer:', connectionsLayer);

    if (!nodesLayer || !connectionsLayer) {
      console.log('🎨 ProcessGraphView - nodesLayer or connectionsLayer not found, returning early');
      return;
    }

    // Clear existing nodes and connections
    nodesLayer.innerHTML = '';
    connectionsLayer.innerHTML = '';

    if (this.processes.length === 0) {
      console.log('🎨 ProcessGraphView - no processes to render, returning early');
      return;
    }

    console.log('🎨 ProcessGraphView - rendering', this.processes.length, 'processes');

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
    console.log('🎨 ProcessGraphView - canvas dimensions:', canvasWidth, 'x', canvasHeight);

    // Get current process ID from URL
    const currentProcessId = this.getCurrentProcessId();
    console.log('🎨 ProcessGraphView - currentProcessId from URL:', currentProcessId);

    // Render nodes using positions from autoLayout
    console.log('🎨 ProcessGraphView - starting node render loop');
    this.processes.forEach((process, idx) => {
      console.log('🎨 ProcessGraphView - rendering process', idx + 1, '/', this.processes.length, ':', process.process_name, 'at position:', process.x, process.y);
      const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      nodeGroup.setAttribute('data-process-id', process.process_id);
      nodeGroup.style.cursor = 'pointer';

      // Use positions from autoLayout or calculate fallback
      const x = process.x || (canvasWidth - nodeWidth) / 2;
      const y = process.y || (canvasHeight - nodeHeight) / 2;
      console.log('🎨 ProcessGraphView - using coordinates:', x, y);

      // Node background
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
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
      text.setAttribute('x', x + nodeWidth / 2);
      text.setAttribute('y', y + nodeHeight / 2 + 5);
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
    console.log('🎨 ProcessGraphView - node render loop complete');

    // Render connections
    console.log('🎨 ProcessGraphView - starting connection render loop, total connections:', this.connections.length);
    this.connections.forEach((conn, index) => {
      const fromProcess = this.processes.find(p => p.process_id === conn.from_process_id);
      const toProcess = this.processes.find(p => p.process_id === conn.to_process_id);

      if (!fromProcess || !toProcess) {
        console.log('🎨 ProcessGraphView - skipping connection', index, 'missing processes');
        return;
      }

      console.log('🎨 ProcessGraphView - rendering connection', index + 1, '/', this.connections.length, 'from', fromProcess.process_name, 'to', toProcess.process_name);

      // Use positions from autoLayout
      const fromX = (fromProcess.x || (canvasWidth - nodeWidth) / 2) + nodeWidth;
      const fromY = (fromProcess.y || (canvasHeight - nodeHeight) / 2) + nodeHeight / 2;
      const toX = (toProcess.x || (canvasWidth - nodeWidth) / 2);
      const toY = (toProcess.y || (canvasHeight - nodeHeight) / 2) + nodeHeight / 2;

      console.log('🎨 ProcessGraphView - connection points from:', fromX, fromY, 'to:', toX, toY);

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
    console.log('🎨 ProcessGraphView - connection render loop complete');

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
