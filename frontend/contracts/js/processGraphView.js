/**
 * Process Graph View - Renders process flow diagram in view-only mode
 * Used on the main contracts page to show process relationships
 */

class ProcessGraphView {
  constructor() {
    this.processes = [];
    this.connections = [];
    this.offsetX = 0;
    this.offsetY = 0;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.boundaries = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    this.canvasElement = null;
    this.transformGroup = null;
    this.homeButton = null;
    this.defaultOffsetX = 0;
    this.defaultOffsetY = 0;
    this.toggleButton = null;
    this.isMenuMode = true;
  }

  async init() {
    await this.loadData();
    this.autoLayout();
    this.render();
  }

  async loadData() {
    const [processes, connections] = await Promise.all([
      dataService.loadProcesses(),
      dataService.loadProcessGraph()
    ]);

    this.processes = processes;
    this.connections = connections;
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

    const canvasWidth = 1043;
    const canvasHeight = 200;
    const marginX = 40;
    const levelWidth = 250;
    const nodeSpacing = 60;

    const totalWidth = (levelGroups.size - 1) * levelWidth;
    const startX = Math.max(marginX, (canvasWidth - totalWidth) / 2);

    levelGroups.forEach((nodeIds, level) => {
      nodeIds.forEach((nodeId, index) => {
        const process = this.processes.find(p => p.process_id === nodeId);
        if (process) {
          process.x = startX + (level * levelWidth);
          process.y = canvasHeight / 2 + ((index - (nodeIds.length - 1) / 2) * nodeSpacing);
        }
      });
    });

    this.defaultOffsetX = 0;
    this.defaultOffsetY = 0;
  }

  render() {
    const navGraph = document.getElementById('processGraphNav');
    if (!navGraph) {
      return;
    }

    this.canvasElement = navGraph.querySelector('svg');
    const nodesLayer = navGraph.querySelector('#nodesLayerNav');
    const connectionsLayer = navGraph.querySelector('#connectionsLayerNav');

    if (!this.canvasElement || !nodesLayer || !connectionsLayer) {
      return;
    }

    this.calculateBoundaries();

    this.transformGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.transformGroup.setAttribute('id', 'graphTransformGroup');

    const connectionsClone = connectionsLayer.cloneNode(true);
    const nodesClone = nodesLayer.cloneNode(true);

    this.transformGroup.appendChild(connectionsClone);
    this.transformGroup.appendChild(nodesClone);

    nodesLayer.innerHTML = '';
    connectionsLayer.innerHTML = '';

    const canvas = this.canvasElement;
    canvas.appendChild(this.transformGroup);

    nodesClone.innerHTML = '';
    connectionsClone.innerHTML = '';

    if (this.processes.length === 0) {
      return;
    }

    const processMap = {};
    this.processes.forEach(p => {
      processMap[p.process_id] = p;
    });

    const nodeWidth = 120;
    const nodeHeight = 50;
    const canvasWidth = canvas.clientWidth || 800;
    const canvasHeight = canvas.clientHeight || 200;

    const currentProcessId = this.getCurrentProcessId();

    this.processes.forEach((process, idx) => {
      const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      nodeGroup.setAttribute('data-process-id', process.process_id);
      nodeGroup.style.cursor = 'pointer';

      const x = process.x || (canvasWidth - nodeWidth) / 2;
      const y = process.y || (canvasHeight - nodeHeight) / 2;

      const maxTextWidth = nodeWidth - 20;
      const charWidth = 7;
      const maxChars = Math.floor(maxTextWidth / charWidth);
      const displayText = process.process_name.length > maxChars
        ? process.process_name.substring(0, maxChars) + '...'
        : process.process_name;

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', nodeWidth);
      rect.setAttribute('height', nodeHeight);
      rect.setAttribute('rx', '12');
      rect.setAttribute('filter', 'url(#node-shadow)');

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

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x + nodeWidth / 2);
      text.setAttribute('y', y + nodeHeight / 2 + 5);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '14');
      text.setAttribute('font-weight', '500');
      text.setAttribute('fill', process.process_id === currentProcessId ? '#ffffff' : '#0f172a');
      text.setAttribute('pointer-events', 'none');
      text.textContent = displayText;

      if (process.process_name.length > maxChars) {
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = process.process_name;
        text.appendChild(title);
      }

      nodeGroup.appendChild(text);

      nodeGroup.addEventListener('click', () => {
        if (process.process_id !== currentProcessId) {
          window.location.href = `/contracts/${process.process_id}`;
        }
      });

      nodesClone.appendChild(nodeGroup);
    });

    this.connections.forEach((conn, index) => {
      const fromProcess = this.processes.find(p => p.process_id === conn.from_process_id);
      const toProcess = this.processes.find(p => p.process_id === conn.to_process_id);

      if (!fromProcess || !toProcess) {
        return;
      }

      const fromX = (fromProcess.x || (canvasWidth - nodeWidth) / 2) + nodeWidth;
      const fromY = (fromProcess.y || (canvasHeight - nodeHeight) / 2) + nodeHeight / 2;
      const toX = (toProcess.x || (canvasWidth - nodeWidth) / 2);
      const toY = (toProcess.y || (canvasHeight - nodeHeight) / 2) + nodeHeight / 2;

      const midX = (fromX + toX) / 2;
      const pathData = `M ${fromX} ${fromY} Q ${midX} ${fromY} ${toX} ${toY}`;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#94a3b8');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('marker-end', 'url(#arrowhead-nav)');
      connectionsClone.appendChild(path);
    });

    const assumedCanvasWidth = 1043;
    const assumedStartX = Math.max(40, (assumedCanvasWidth - ((3 - 1) * 250)) / 2);
    const actualCenter = Math.max(40, (canvasWidth - ((3 - 1) * 250)) / 2);
    this.defaultOffsetX = actualCenter - assumedStartX;
    this.defaultOffsetY = 0;

    this.offsetX = this.defaultOffsetX;
    this.offsetY = this.defaultOffsetY;

    this.addHomeButton(navGraph);
    this.addToggleButton(navGraph);

    this.canvasElement.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvasElement.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvasElement.addEventListener('mouseup', () => this.handleMouseUp());
    this.canvasElement.addEventListener('mouseleave', () => this.handleMouseUp());

    this.canvasElement.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      this.handleMouseDown(touch);
      e.preventDefault();
    }, { passive: false });

    this.canvasElement.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      this.handleMouseMove(touch);
      e.preventDefault();
    }, { passive: false });

    this.canvasElement.addEventListener('touchend', () => this.handleMouseUp());

    this.applyTransform();

    if (this.offsetX !== this.defaultOffsetX || this.offsetY !== this.defaultOffsetY) {
      this.showHomeButton();
    }

    this.canvasElement.style.cursor = 'grab';
    this.applyViewMode();
  }

  getCurrentProcessId() {
    const match = window.location.pathname.match(/\/contracts\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  calculateBoundaries() {
    if (this.processes.length === 0) {
      this.boundaries = { minX: -500, maxX: 500, minY: -500, maxY: 500 };
      return;
    }

    const nodeWidth = 120;
    const nodeHeight = 50;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    this.processes.forEach(process => {
      const x = process.x || 0;
      const y = process.y || 0;

      minX = Math.min(minX, x - nodeWidth / 2);
      maxX = Math.max(maxX, x + nodeWidth / 2);
      minY = Math.min(minY, y - nodeHeight / 2);
      maxY = Math.max(maxY, y + nodeHeight / 2);
    });

    this.boundaries = {
      minX: minX - 500,
      maxX: maxX + 500,
      minY: minY - 500,
      maxY: maxY + 500
    };
  }

  resetView() {
    this.offsetX = this.defaultOffsetX;
    this.offsetY = this.defaultOffsetY;
    this.applyTransform();
    this.hideHomeButton();
  }

  applyTransform() {
    if (this.transformGroup) {
      this.transformGroup.setAttribute('transform', `translate(${this.offsetX}, ${this.offsetY})`);
    }
  }

  handleMouseDown(event) {
    if (event.target.closest('.process-nav-node')) {
      return;
    }

    this.isDragging = true;
    this.startX = event.clientX - this.offsetX;
    this.startY = event.clientY - this.offsetY;
    this.canvasElement.style.cursor = 'grabbing';

    event.preventDefault();
  }

  handleMouseMove(event) {
    if (!this.isDragging) return;

    const newOffsetX = event.clientX - this.startX;
    const newOffsetY = event.clientY - this.startY;

    const canvasWidth = this.canvasElement.clientWidth || 800;
    const canvasHeight = this.canvasElement.clientHeight || 200;

    this.offsetX = Math.min(
      Math.max(newOffsetX, canvasWidth - this.boundaries.maxX),
      -this.boundaries.minX
    );

    this.offsetY = Math.min(
      Math.max(newOffsetY, canvasHeight - this.boundaries.maxY),
      -this.boundaries.minY
    );

    if (this.offsetX === this.defaultOffsetX && this.offsetY === this.defaultOffsetY) {
      this.hideHomeButton();
    } else {
      this.showHomeButton();
    }

    this.applyTransform();
    event.preventDefault();
  }

  handleMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;
      this.canvasElement.style.cursor = 'grab';
    }
  }

  addHomeButton(navGraph) {
    const existingBtn = navGraph.querySelector('.graph-home-btn');
    if (existingBtn) {
      existingBtn.remove();
    }

    const homeBtn = document.createElement('button');
    homeBtn.className = 'graph-home-btn absolute top-4 right-4 p-2 bg-card border border-border rounded-md hover:bg-accent transition-colors shadow-sm z-10 opacity-0 pointer-events-none text-muted-foreground';
    homeBtn.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
      </svg>
    `;
    homeBtn.title = 'Reset to default view';
    homeBtn.onclick = () => this.resetView();

    navGraph.appendChild(homeBtn);
    this.homeButton = homeBtn;
  }

  addToggleButton(navGraph) {
    const existingBtn = navGraph.parentElement.querySelector('.view-toggle-btn');
    if (existingBtn) {
      existingBtn.remove();
    }

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'view-toggle-btn absolute top-4 left-4 p-2 bg-card border border-border rounded-md hover:bg-accent transition-colors shadow-sm z-20 flex items-center gap-2 text-muted-foreground';
    toggleBtn.innerHTML = `
      <svg class="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
      </svg>
    `;
    toggleBtn.title = 'Toggle Menu View';
    toggleBtn.onclick = () => this.toggleView();

    navGraph.parentElement.appendChild(toggleBtn);
    this.toggleButton = toggleBtn;

    if (this.isMenuMode) {
      this.toggleButton.innerHTML = `
        <svg class="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
        </svg>
      `;
    }
  }

  toggleView() {
    this.isMenuMode = !this.isMenuMode;
    this.applyViewMode();
  }

  applyViewMode() {
    const graphContainer = document.getElementById('processGraphNav');

    if (this.isMenuMode) {
      if (window.processMenuView) window.processMenuView.show();
      if (graphContainer) graphContainer.classList.add('opacity-0', 'pointer-events-none');

      if (this.toggleButton) {
        this.toggleButton.innerHTML = `
          <svg class="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
          </svg>
        `;
        this.toggleButton.title = 'Switch to Graph View';
      }
    } else {
      if (window.processMenuView) window.processMenuView.hide();
      if (graphContainer) graphContainer.classList.remove('opacity-0', 'pointer-events-none');

      if (this.toggleButton) {
        this.toggleButton.innerHTML = `
          <svg class="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
          </svg>
        `;
        this.toggleButton.title = 'Switch to Menu View';
      }
    }
  }

  showHomeButton() {
    if (this.homeButton) {
      this.homeButton.style.opacity = '1';
      this.homeButton.style.pointerEvents = 'auto';
    }
  }

  hideHomeButton() {
    if (this.homeButton) {
      this.homeButton.style.opacity = '0';
      this.homeButton.style.pointerEvents = 'none';
    }
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
