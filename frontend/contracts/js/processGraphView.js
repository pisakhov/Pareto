/**
 * Process Graph View - Renders process flow diagram in view-only mode
 * Used on the main contracts page to show process relationships
 */

class ProcessGraphView {
  constructor() {
    this.processes = [];
    this.connections = [];
  }

  async init() {
    await this.loadData();
    this.autoLayout();
    this.render();
  }

  async loadData() {
    try {
      console.log('🔵 [ProcessGraphView] Loading data...');
      const [processes, connections] = await Promise.all([
        dataService.loadProcesses(),
        dataService.loadProcessGraph()
      ]);

      console.log('✅ [ProcessGraphView] Loaded processes:', processes.length);
      console.log('✅ [ProcessGraphView] Loaded connections:', connections.length);
      console.log('📊 [ProcessGraphView] Processes:', processes);
      console.log('🔗 [ProcessGraphView] Connections:', connections);

      this.processes = processes;
      this.connections = connections;

    } catch (error) {
      console.error('❌ [ProcessGraphView] Error loading data:', error);
      this.processes = [];
      this.connections = [];
    }
  }

  autoLayout() {
    console.log('🔵 [ProcessGraphView] Starting autoLayout...');
    console.log('📊 [ProcessGraphView] Total processes:', this.processes.length);
    console.log('🔗 [ProcessGraphView] Total connections:', this.connections.length);

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

    console.log('🎯 [ProcessGraphView] Level groups:', levelGroups.size);
    levelGroups.forEach((nodeIds, level) => {
      console.log(`  📌 Level ${level}:`, nodeIds.length, 'nodes');
    });

    // Canvas-relative positioning (assuming 1043x200 canvas)
    const canvasWidth = 1043;
    const canvasHeight = 200;
    const marginX = 40;
    const marginY = 30;
    const levelWidth = 250;
    const nodeSpacing = 60;

    console.log('🎨 [ProcessGraphView] Canvas size:', { width: canvasWidth, height: canvasHeight });
    console.log('📏 [ProcessGraphView] Layout settings:', { marginX, marginY, levelWidth, nodeSpacing });

    // Calculate total width needed for centering
    const totalWidth = (levelGroups.size - 1) * levelWidth;
    const startX = Math.max(marginX, (canvasWidth - totalWidth) / 2);

    levelGroups.forEach((nodeIds, level) => {
      nodeIds.forEach((nodeId, index) => {
        const process = this.processes.find(p => p.process_id === nodeId);
        if (process) {
          // X position based on level (horizontal flow)
          process.x = startX + (level * levelWidth);

          // Y position centered around middle of canvas (like processGraphEdit.js)
          // This distributes nodes vertically within the level
          process.y = canvasHeight / 2 + ((index - (nodeIds.length - 1) / 2) * nodeSpacing);

          console.log(`📍 [ProcessGraphView] Node "${process.process_name}" (ID: ${process.process_id}):`, {
            level,
            index,
            x: process.x,
            y: process.y
          });
        }
      });
    });

    console.log('✅ [ProcessGraphView] AutoLayout complete - Final node positions:');
    this.processes.forEach(p => {
      console.log(`  • ${p.process_name}: x=${Math.round(p.x)}, y=${Math.round(p.y)}`);
    });
  }

  render() {
    console.log('🎨 [ProcessGraphView] Starting render...');

    const navGraph = document.getElementById('processGraphNav');
    if (!navGraph) {
      console.error('❌ [ProcessGraphView] processGraphNav element not found!');
      return;
    }

    console.log('✅ [ProcessGraphView] processGraphNav element found');

    const canvas = navGraph.querySelector('svg');
    const nodesLayer = navGraph.querySelector('#nodesLayerNav');
    const connectionsLayer = navGraph.querySelector('#connectionsLayerNav');

    if (!canvas) {
      console.error('❌ [ProcessGraphView] SVG canvas not found!');
    } else {
      console.log('✅ [ProcessGraphView] SVG canvas found:', {
        width: canvas.clientWidth,
        height: canvas.clientHeight
      });
    }

    if (!nodesLayer || !connectionsLayer) {
      console.error('❌ [ProcessGraphView] Layers not found:', {
        nodesLayer: !!nodesLayer,
        connectionsLayer: !!connectionsLayer
      });
      return;
    }

    console.log('✅ [ProcessGraphView] Layers found:', {
      nodesLayer: !!nodesLayer,
      connectionsLayer: !!connectionsLayer
    });

    // Clear existing nodes and connections
    nodesLayer.innerHTML = '';
    connectionsLayer.innerHTML = '';

    if (this.processes.length === 0) {
      console.warn('⚠️ [ProcessGraphView] No processes to render');
      return;
    }

    console.log('🔵 [ProcessGraphView] Rendering', this.processes.length, 'nodes and', this.connections.length, 'connections');

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

    // Get current process ID from URL
    const currentProcessId = this.getCurrentProcessId();

    // Render nodes using positions from autoLayout
    console.log('🔵 [ProcessGraphView] Starting to render nodes...');
    this.processes.forEach((process, idx) => {
      console.log(`📍 [ProcessGraphView] Rendering node ${idx + 1}/${this.processes.length}: "${process.process_name}" at`, {
        x: process.x,
        y: process.y
      });

      const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      nodeGroup.setAttribute('data-process-id', process.process_id);
      nodeGroup.style.cursor = 'pointer';

      // Use positions from autoLayout or calculate fallback
      const x = process.x || (canvasWidth - nodeWidth) / 2;
      const y = process.y || (canvasHeight - nodeHeight) / 2;

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
        rect.setAttribute('class', 'process-nav-node process-nav-node-active');
      } else {
        rect.setAttribute('fill', '#ffffff');
        rect.setAttribute('stroke', '#cbd5e1');
        rect.setAttribute('stroke-width', '1');
        rect.setAttribute('class', 'process-nav-node');
      }

      nodeGroup.appendChild(rect);

      // Process name text
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x + nodeWidth / 2);
      text.setAttribute('y', y + nodeHeight / 2 + 5);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '14');
      text.setAttribute('font-weight', '500');
      text.setAttribute('fill', process.process_id === currentProcessId ? '#ffffff' : '#0f172a');
      text.setAttribute('pointer-events', 'none');
      text.textContent = process.process_name;
      nodeGroup.appendChild(text);

      // Add click handler
      nodeGroup.addEventListener('click', () => {
        if (process.process_id !== currentProcessId) {
          window.location.href = `/contracts/${process.process_id}`;
        }
      });

      nodesLayer.appendChild(nodeGroup);
    });

    console.log('✅ [ProcessGraphView] All nodes rendered');

    // Render connections
    console.log('🔵 [ProcessGraphView] Starting to render connections...');
    this.connections.forEach((conn, index) => {
      const fromProcess = this.processes.find(p => p.process_id === conn.from_process_id);
      const toProcess = this.processes.find(p => p.process_id === conn.to_process_id);

      if (!fromProcess || !toProcess) {
        console.warn(`⚠️ [ProcessGraphView] Connection ${index + 1}/${this.connections.length}: Missing process`, {
          from: fromProcess ? fromProcess.process_name : 'NOT FOUND',
          to: toProcess ? toProcess.process_name : 'NOT FOUND'
        });
        return;
      }

      console.log(`🔗 [ProcessGraphView] Connection ${index + 1}/${this.connections.length}:`, {
        from: fromProcess.process_name,
        to: toProcess.process_name,
        fromPos: { x: fromProcess.x, y: fromProcess.y },
        toPos: { x: toProcess.x, y: toProcess.y }
      });

      // Use positions from autoLayout
      const fromX = (fromProcess.x || (canvasWidth - nodeWidth) / 2) + nodeWidth;
      const fromY = (fromProcess.y || (canvasHeight - nodeHeight) / 2) + nodeHeight / 2;
      const toX = (toProcess.x || (canvasWidth - nodeWidth) / 2);
      const toY = (toProcess.y || (canvasHeight - nodeHeight) / 2) + nodeHeight / 2;

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

    console.log('✅ [ProcessGraphView] All connections rendered');
    console.log('✅ [ProcessGraphView] Render complete!');
  }

  getCurrentProcessId() {
    // Extract process ID from URL path
    const match = window.location.pathname.match(/\/contracts\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }
}

// Add CSS styles for process nodes
const style = document.createElement('style');
style.textContent = `
  .process-nav-node {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .process-nav-node:not(.process-nav-node-active):hover {
    fill: #f8fafc !important;
    stroke: #94a3b8 !important;
  }

  .process-nav-node-active {
    fill: #10b981;
    stroke: #059669;
    stroke-width: 2;
  }

  .process-nav-node-active:hover {
    fill: #059669 !important;
    stroke: #047857 !important;
  }
`;
document.head.appendChild(style);

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
