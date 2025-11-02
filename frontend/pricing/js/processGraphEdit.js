/**
 * Process Graph Editor - Manages process visualization with drag-and-drop
 */
class ProcessGraph {
  constructor() {
    this.processes = [];
    this.connections = [];
    this.selectedProcess = null;
    this.connectionSource = null;
    this.draggedNode = null;
    this.viewTransform = { x: 0, y: 0, scale: 1 };
    this.isConnecting = false;

    this.canvas = document.getElementById('processGraphCanvas');
    this.nodesLayer = document.getElementById('nodesLayer');
    this.connectionsLayer = document.getElementById('connectionsLayer');
    this.processList = document.getElementById('processList');
  }

  async init() {
    await this.loadProcesses();
    this.setupEventListeners();
    this.render();
    this.autoLayout();
  }

  setupEventListeners() {
    // Canvas pan
    this.canvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
  }

  async loadProcesses() {
    try {
      this.processes = await dataService.loadProcesses();
      await this.loadConnections();
    } catch (error) {
      console.error('Error loading processes:', error);
      this.processes = [];
    }
  }

  async loadConnections() {
    // Load connections from database API
    this.connections = await dataService.loadProcessGraph();
  }

  render() {
    this.renderProcessList();
    this.renderGraph();
    this.updateStats();
  }

  addGridPattern() {
    // Add a subtle grid pattern to the SVG canvas
    const svgDefs = this.canvas.querySelector('defs');
    if (svgDefs && !svgDefs.querySelector('#gridPattern')) {
      const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
      pattern.setAttribute('id', 'gridPattern');
      pattern.setAttribute('x', '0');
      pattern.setAttribute('y', '0');
      pattern.setAttribute('width', '40');
      pattern.setAttribute('height', '40');
      pattern.setAttribute('patternUnits', 'userSpaceOnUse');

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M 40 0 L 0 0 0 40');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'rgba(148, 163, 184, 0.15)');
      path.setAttribute('stroke-width', '1');
      pattern.appendChild(path);

      svgDefs.appendChild(pattern);
    }

    // Add grid rectangle as background
    let gridRect = this.canvas.querySelector('#gridRect');
    if (!gridRect) {
      gridRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      gridRect.setAttribute('id', 'gridRect');
      gridRect.setAttribute('x', '0');
      gridRect.setAttribute('y', '0');
      gridRect.setAttribute('width', '100%');
      gridRect.setAttribute('height', '100%');
      gridRect.setAttribute('fill', 'url(#gridPattern)');
      this.canvas.insertBefore(gridRect, this.canvas.firstChild);
    }
  }

  renderProcessList() {
    this.processList.innerHTML = '';

    this.processes.forEach(process => {
      const processItem = document.createElement('div');
      processItem.className = 'bg-card border border-border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer';

      processItem.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-semibold text-sm">${process.process_name}</h4>
          <div class="flex gap-1">
            <button onclick="event.stopPropagation(); processGraph.toggleEditForm(${process.process_id})" class="p-1 hover:bg-accent rounded">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button onclick="event.stopPropagation(); processGraph.deleteProcess(${process.process_id})" class="p-1 hover:bg-accent rounded text-red-600">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>
        <p class="text-xs text-muted-foreground">${process.description || 'No description'}</p>
        <div class="mt-2 flex items-center gap-2">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            process.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }">
            ${process.status}
          </span>
        </div>
        <div id="editForm-${process.process_id}" class="hidden mt-3 p-3 border border-border rounded-md bg-secondary/50">
          <form onsubmit="return processGraph.handleEditProcess(event, ${process.process_id})" class="space-y-3">
            <div>
              <label class="block text-xs font-medium mb-1">Process Name *</label>
              <input type="text" id="editName-${process.process_id}" value="${process.process_name}" required
                     class="w-full px-3 py-2 border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-transparent text-sm">
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">Description</label>
              <textarea id="editDescription-${process.process_id}" rows="2"
                        class="w-full px-3 py-2 border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-transparent text-sm">${process.description || ''}</textarea>
            </div>
            <div class="flex gap-2">
              <button type="submit" class="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 px-2 py-2 bg-emerald-600 text-white hover:bg-emerald-600/90">
                Save
              </button>
              <button type="button" onclick="processGraph.toggleEditForm(${process.process_id})" class="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 px-2 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground">
                Cancel
              </button>
            </div>
          </form>
        </div>
      `;

      processItem.onclick = () => this.selectProcess(process.process_id);
      this.processList.appendChild(processItem);
    });
  }

  renderGraph() {
    // Clear layers
    this.nodesLayer.innerHTML = '';
    this.connectionsLayer.innerHTML = '';

    // Apply view transform
    const transform = `translate(${this.viewTransform.x}, ${this.viewTransform.y}) scale(${this.viewTransform.scale})`;
    this.nodesLayer.setAttribute('transform', transform);
    this.connectionsLayer.setAttribute('transform', transform);

    // Add subtle grid pattern to canvas background
    this.addGridPattern();

    // Render connections with animated dotted lines
    this.connections.forEach(conn => {
      const fromProcess = this.processes.find(p => p.process_id === conn.from_process_id);
      const toProcess = this.processes.find(p => p.process_id === conn.to_process_id);

      if (fromProcess && toProcess) {
        // Create animated dotted line
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const fromX = (fromProcess.x || 400);
        const fromY = (fromProcess.y || 300);
        const toX = (toProcess.x || 400);
        const toY = (toProcess.y || 300);

        // Adjust endpoints to stop at node boundaries (rectangular nodes)
        const nodeWidth = 160;
        const nodeHeight = 80;
        const halfWidth = nodeWidth / 2;
        const halfHeight = nodeHeight / 2;

        // For rectangles, we need to calculate the edge intersection point
        const angle = Math.atan2(toY - fromY, toX - fromX);

        // Calculate intersection with rectangle edge
        const dx = toX - fromX;
        const dy = toY - fromY;

        let adjustedFromX, adjustedFromY, adjustedToX, adjustedToY;

        // From node - exit from right side (output)
        if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
          // Horizontal intersection
          adjustedFromX = fromX + Math.sign(dx) * halfWidth;
          adjustedFromY = fromY;
        } else {
          // Vertical intersection
          adjustedFromX = fromX;
          adjustedFromY = fromY + Math.sign(dy) * halfHeight;
        }

        // To node - enter from left side (input)
        if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
          // Horizontal intersection
          adjustedToX = toX - Math.sign(dx) * halfWidth;
          adjustedToY = toY;
        } else {
          // Vertical intersection
          adjustedToX = toX;
          adjustedToY = toY - Math.sign(dy) * halfHeight;
        }

        // Recalculate control point
        const midX = (adjustedFromX + adjustedToX) / 2;
        const midY = (adjustedFromY + adjustedToY) / 2;
        const controlX = midX;
        const controlY = midY - 50;

        const pathData = `M ${adjustedFromX} ${adjustedFromY} Q ${controlX} ${controlY} ${adjustedToX} ${adjustedToY}`;

        // Create invisible wider path for easier clicking
        const hitAreaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hitAreaPath.setAttribute('d', pathData);
        hitAreaPath.setAttribute('fill', 'none');
        hitAreaPath.setAttribute('stroke', 'transparent');
        hitAreaPath.setAttribute('stroke-width', '20'); // Wide invisible hit area
        hitAreaPath.setAttribute('class', 'connection-hit-area');
        hitAreaPath.style.cursor = 'pointer';
        hitAreaPath.dataset.fromId = conn.from_process_id;
        hitAreaPath.dataset.toId = conn.to_process_id;

        // Create visible edge path
        const visiblePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        visiblePath.setAttribute('d', pathData);
        visiblePath.setAttribute('fill', 'none');
        visiblePath.setAttribute('stroke', '#64748b');
        visiblePath.setAttribute('stroke-width', '2.5');
        visiblePath.setAttribute('stroke-dasharray', '5,5');
        visiblePath.setAttribute('marker-end', 'url(#arrowhead)');
        visiblePath.setAttribute('class', 'animated-connection');

        // Add click handler to hit area (for easy clicking)
        hitAreaPath.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showEdgePopup(e, conn);
        });

        this.connectionsLayer.appendChild(hitAreaPath);
        this.connectionsLayer.appendChild(visiblePath);
      }
    });

    // Render process nodes as rectangles
    this.processes.forEach(process => {
      const x = process.x || 400;
      const y = process.y || 300;
      const width = 160;
      const height = 80;
      const halfWidth = width / 2;
      const halfHeight = height / 2;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('data-process-id', process.process_id);
      g.style.cursor = 'pointer';

      // Create rectangular node with shadcn-inspired professional styling
      const isSelected = this.selectedProcess === process.process_id;
      const nodeBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      nodeBg.setAttribute('x', x - halfWidth);
      nodeBg.setAttribute('y', y - halfHeight);
      nodeBg.setAttribute('width', width);
      nodeBg.setAttribute('height', height);
      nodeBg.setAttribute('rx', '8');
      nodeBg.setAttribute('fill', isSelected ? '#f8fafc' : '#ffffff');
      nodeBg.setAttribute('stroke', isSelected ? '#3b82f6' : '#e2e8f0');
      nodeBg.setAttribute('stroke-width', isSelected ? '2' : '1.5');
      nodeBg.setAttribute('filter', isSelected
        ? 'drop-shadow(0 6px 20px rgba(59, 130, 246, 0.25)) drop-shadow(0 0 8px rgba(59, 130, 246, 0.15))'
        : 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.08))');
      nodeBg.classList.add('process-node');

      // Add subtle inner border for depth
      const innerBorder = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      innerBorder.setAttribute('x', x - halfWidth + 0.5);
      innerBorder.setAttribute('y', y - halfHeight + 0.5);
      innerBorder.setAttribute('width', width - 1);
      innerBorder.setAttribute('height', height - 1);
      innerBorder.setAttribute('rx', '7.5');
      innerBorder.setAttribute('fill', 'none');
      innerBorder.setAttribute('stroke', 'rgba(255, 255, 255, 0.6)');
      innerBorder.setAttribute('stroke-width', '0.5');

      // Process name
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x);
      text.setAttribute('y', y - 5);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#0f172a');
      text.setAttribute('font-size', '14');
      text.setAttribute('font-weight', '600');
      text.textContent = process.process_name.length > 18 ?
        process.process_name.substring(0, 15) + '...' :
        process.process_name;

      // Process description/status
      const subtext = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      subtext.setAttribute('x', x);
      subtext.setAttribute('y', y + 18);
      subtext.setAttribute('text-anchor', 'middle');
      subtext.setAttribute('fill', '#64748b');
      subtext.setAttribute('font-size', '11');
      subtext.textContent = process.status || 'active';

      // Add connection ports - LEFT (input/TO) and RIGHT (output/FROM)
      const ports = [
        {
          x: x - halfWidth,
          y: y,
          type: 'input',
          cursor: 'pointer'
        },
        {
          x: x + halfWidth,
          y: y,
          type: 'output',
          cursor: 'pointer'
        }
      ];

      ports.forEach(portInfo => {
        if (portInfo.type === 'input') {
          // LEFT PORT - Modern circle (TO/Input) with purple/violet color
          // Invisible larger hit area for easier clicking
          const circleHitArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circleHitArea.setAttribute('cx', portInfo.x);
          circleHitArea.setAttribute('cy', portInfo.y);
          circleHitArea.setAttribute('r', '15');
          circleHitArea.setAttribute('fill', 'transparent');
          circleHitArea.style.cursor = portInfo.cursor;
          circleHitArea.dataset.processId = process.process_id;
          circleHitArea.dataset.portType = portInfo.type;
          circleHitArea.classList.add('connection-port');

          // Shadow for depth
          const circleShadow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circleShadow.setAttribute('cx', portInfo.x);
          circleShadow.setAttribute('cy', portInfo.y + 1);
          circleShadow.setAttribute('r', '5');
          circleShadow.setAttribute('fill', 'rgba(168, 85, 247, 0.15)');

          // Main circle with modern purple color
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', portInfo.x);
          circle.setAttribute('cy', portInfo.y);
          circle.setAttribute('r', '5');
          circle.setAttribute('fill', '#a855f7');
          circle.setAttribute('stroke', '#9333ea');
          circle.setAttribute('stroke-width', '1.5');
          circle.setAttribute('filter', 'drop-shadow(0 2px 4px rgba(168, 85, 247, 0.25))');
          circle.dataset.processId = process.process_id;
          circle.dataset.portType = portInfo.type;

          // Inner dot for modern look
          const circleInner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circleInner.setAttribute('cx', portInfo.x);
          circleInner.setAttribute('cy', portInfo.y);
          circleInner.setAttribute('r', '2');
          circleInner.setAttribute('fill', '#ffffff');
          circleInner.setAttribute('opacity', '0.9');

          // Hover effect
          circle.addEventListener('mouseenter', () => {
            circle.setAttribute('fill', '#c084fc');
            circle.setAttribute('stroke', '#a855f7');
            circle.setAttribute('filter', 'drop-shadow(0 3px 8px rgba(168, 85, 247, 0.4))');
          });
          circle.addEventListener('mouseleave', () => {
            circle.setAttribute('fill', '#a855f7');
            circle.setAttribute('stroke', '#9333ea');
            circle.setAttribute('filter', 'drop-shadow(0 2px 4px rgba(168, 85, 247, 0.25))');
          });

          g.appendChild(circleHitArea);
          g.appendChild(circleShadow);
          g.appendChild(circle);
          g.appendChild(circleInner);
        } else {
          // RIGHT PORT - Modern diamond/rhombus (FROM/Output) with orange/amber color
          // Invisible larger hit area for easier clicking
          const diamondHitArea = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          const hitPoints = `${portInfo.x},${portInfo.y - 15} ${portInfo.x + 15},${portInfo.y} ${portInfo.x},${portInfo.y + 15} ${portInfo.x - 15},${portInfo.y}`;
          diamondHitArea.setAttribute('points', hitPoints);
          diamondHitArea.setAttribute('fill', 'transparent');
          diamondHitArea.style.cursor = portInfo.cursor;
          diamondHitArea.dataset.processId = process.process_id;
          diamondHitArea.dataset.portType = portInfo.type;
          diamondHitArea.classList.add('connection-port');

          // Shadow for depth
          const diamondShadow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          const shadowPoints = `${portInfo.x},${portInfo.y - 6 + 1} ${portInfo.x + 6},${portInfo.y + 1} ${portInfo.x},${portInfo.y + 6 + 1} ${portInfo.x - 6},${portInfo.y + 1}`;
          diamondShadow.setAttribute('points', shadowPoints);
          diamondShadow.setAttribute('fill', 'rgba(245, 158, 11, 0.15)');

          // Main diamond with modern orange color
          const diamond = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          const points = `${portInfo.x},${portInfo.y - 6} ${portInfo.x + 6},${portInfo.y} ${portInfo.x},${portInfo.y + 6} ${portInfo.x - 6},${portInfo.y}`;
          diamond.setAttribute('points', points);
          diamond.setAttribute('fill', '#f59e0b');
          diamond.setAttribute('stroke', '#d97706');
          diamond.setAttribute('stroke-width', '1.5');
          diamond.setAttribute('filter', 'drop-shadow(0 2px 4px rgba(245, 158, 11, 0.25))');
          diamond.dataset.processId = process.process_id;
          diamond.dataset.portType = portInfo.type;

          // Inner diamond for modern look
          const diamondInner = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          const innerPoints = `${portInfo.x},${portInfo.y - 3} ${portInfo.x + 3},${portInfo.y} ${portInfo.x},${portInfo.y + 3} ${portInfo.x - 3},${portInfo.y}`;
          diamondInner.setAttribute('points', innerPoints);
          diamondInner.setAttribute('fill', '#ffffff');
          diamondInner.setAttribute('opacity', '0.9');

          // Hover effect
          diamond.addEventListener('mouseenter', () => {
            diamond.setAttribute('fill', '#fbbf24');
            diamond.setAttribute('stroke', '#f59e0b');
            diamond.setAttribute('filter', 'drop-shadow(0 3px 8px rgba(245, 158, 11, 0.4))');
          });
          diamond.addEventListener('mouseleave', () => {
            diamond.setAttribute('fill', '#f59e0b');
            diamond.setAttribute('stroke', '#d97706');
            diamond.setAttribute('filter', 'drop-shadow(0 2px 4px rgba(245, 158, 11, 0.25))');
          });

          g.appendChild(diamondHitArea);
          g.appendChild(diamondShadow);
          g.appendChild(diamond);
          g.appendChild(diamondInner);
        }
      });

      // Add node background and text
      g.insertBefore(nodeBg, g.firstChild);
      g.appendChild(innerBorder);
      g.appendChild(text);
      g.appendChild(subtext);

      // Add event listeners
      g.addEventListener('mousedown', (e) => this.startDrag(e, process));
      g.addEventListener('click', (e) => this.handleNodeClick(e, process));

      // Port click handlers for click-to-connect
      g.querySelectorAll('.connection-port').forEach(port => {
        port.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handlePortClick(process, port.dataset.portType);
        });
      });

      this.nodesLayer.appendChild(g);
    });
  }

  async handleNodeClick(e, process) {
    e.stopPropagation();

    if (this.isConnecting) {
      if (!this.connectionSource) {
        this.connectionSource = process;
        this.showConnectionIndicator(true);
      } else if (this.connectionSource.process_id !== process.process_id) {
        await this.createConnection(this.connectionSource.process_id, process.process_id);
        this.connectionSource = null;
        this.showConnectionIndicator(false);
        this.render();
      }
    } else {
      this.selectedProcess = process.process_id;
      this.render();
    }
  }

  async handlePortClick(process, portType) {
    // Click-to-connect logic
    if (!this.connectionSource) {
      // First click: must be on OUTPUT port (right triangle)
      if (portType === 'output') {
        this.connectionSource = process;
        this.showConnectionIndicator(true);
        this.highlightPort(process.process_id, portType, true);
      }
    } else {
      // Second click: must be on INPUT port (left rectangle)
      if (portType === 'input' && this.connectionSource.process_id !== process.process_id) {
        await this.createConnection(this.connectionSource.process_id, process.process_id);
        this.connectionSource = null;
        this.showConnectionIndicator(false);
        this.highlightAllPorts(false);
        this.autoLayout();
      }
    }
  }

  highlightPort(processId, portType, highlight) {
    const port = document.querySelector(`[data-process-id="${processId}"] [data-port-type="${portType}"]`);
    if (port) {
      if (highlight) {
        if (portType === 'output') {
          port.setAttribute('fill', '#34d399');
          port.setAttribute('stroke', '#10b981');
        } else {
          port.setAttribute('fill', '#60a5fa');
          port.setAttribute('stroke', '#3b82f6');
        }
      } else {
        if (portType === 'output') {
          port.setAttribute('fill', '#10b981');
          port.setAttribute('stroke', '#059669');
        } else {
          port.setAttribute('fill', '#3b82f6');
          port.setAttribute('stroke', '#2563eb');
        }
      }
    }
  }

  highlightAllPorts(reset) {
    document.querySelectorAll('.connection-port').forEach(port => {
      if (port.dataset.portType === 'output') {
        port.setAttribute('fill', '#f59e0b');
        port.setAttribute('stroke', '#d97706');
        port.setAttribute('filter', 'drop-shadow(0 2px 4px rgba(245, 158, 11, 0.25))');
      } else {
        port.setAttribute('fill', '#a855f7');
        port.setAttribute('stroke', '#9333ea');
        port.setAttribute('filter', 'drop-shadow(0 2px 4px rgba(168, 85, 247, 0.25))');
      }
    });
  }

  showConnectionIndicator(show) {
    const indicator = document.getElementById('connectionModeIndicator');
    if (show) {
      indicator.classList.remove('hidden');
      if (!this.connectionSource) {
        indicator.innerHTML = `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
          <span class="font-medium">Step 1: Click RIGHT diamond (FROM)</span>
        `;
      } else {
        indicator.innerHTML = `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
          <span class="font-medium">Step 2: Click LEFT circle (TO)</span>
        `;
      }
    } else {
      indicator.classList.add('hidden');
    }
  }

  startDrag(e, process) {
    e.stopPropagation();
    this.draggedNode = process;
    this.dragOffset = {
      x: (e.clientX - this.viewTransform.x) / this.viewTransform.scale - (process.x || 400),
      y: (e.clientY - this.viewTransform.y) / this.viewTransform.scale - (process.y || 300)
    };
  }

  handleMouseMove(e) {
    if (this.draggedNode) {
      const newX = (e.clientX - this.viewTransform.x) / this.viewTransform.scale - this.dragOffset.x;
      const newY = (e.clientY - this.viewTransform.y) / this.viewTransform.scale - this.dragOffset.y;

      // Boundary constraints (keep nodes within canvas)
      const canvasRect = this.canvas.getBoundingClientRect();
      const nodeWidth = 160;
      const nodeHeight = 80;
      const margin = 60;

      // Constrain to canvas boundaries
      this.draggedNode.x = Math.max(margin, Math.min(newX, canvasRect.width - margin));
      this.draggedNode.y = Math.max(margin, Math.min(newY, canvasRect.height - margin));

      this.renderGraph();
    }
  }

  handleMouseUp(e) {
    if (this.draggedNode) {
      this.draggedNode = null;
    }
  }

  handleCanvasMouseDown(e) {
    if (e.target === this.canvas) {
      this.selectedProcess = null;
      this.render();
    }
  }

  async createConnection(fromProcessId, toProcessId) {

    // Check if connection already exists in memory
    if (this.connections.some(c => c.from_process_id === fromProcessId && c.to_process_id === toProcessId)) {
      return;
    }

    try {
      // Save to database via API
      await dataService.addProcessEdge(fromProcessId, toProcessId);

      // Add to local array
      this.connections.push({ from_process_id: fromProcessId, to_process_id: toProcessId });

      this.renderGraph();
    } catch (error) {
      console.error('❌ ProcessGraph - Error creating connection:', error);
    }
  }

  autoLayout() {
    // Simple hierarchical layout based on connections
    const nodeMap = new Map();
    const levels = new Map();
    const visited = new Set();

    // Build adjacency map
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

    // Find root nodes (no inputs)
    const roots = [];
    nodeMap.forEach((node, id) => {
      if (node.inputs.length === 0) {
        roots.push(id);
      }
    });

    // If no roots, use first node
    if (roots.length === 0 && this.processes.length > 0) {
      roots.push(this.processes[0].process_id);
    }

    // Assign levels using BFS
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

    // Position nodes by level
    const levelGroups = new Map();
    levels.forEach((level, id) => {
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level).push(id);
    });

    const levelWidth = 300;
    const nodeSpacing = 180;

    levelGroups.forEach((nodeIds, level) => {
      nodeIds.forEach((nodeId, index) => {
        const process = this.processes.find(p => p.process_id === nodeId);
        if (process) {
          process.x = 400 + (level * levelWidth);
          process.y = 300 + ((index - (nodeIds.length - 1) / 2) * nodeSpacing);
        }
      });
    });

    this.renderGraph();
  }

  selectProcess(processId) {
    this.selectedProcess = processId;
    this.render();
  }

  async addNewProcess() {
    try {
      const name = document.getElementById('newProcessName').value;
      const description = document.getElementById('newProcessDescription').value;

      if (!name.trim()) {
        uiManager.showNotification('Process name is required', 'error');
        document.getElementById('newProcessName').focus();
        return;
      }

      // Check for duplicate names
      const duplicate = this.processes.find(p =>
        p.process_name.toLowerCase() === name.trim().toLowerCase()
      );

      if (duplicate) {
        uiManager.showNotification('A process with this name already exists. Please choose a different name.', 'error');
        document.getElementById('newProcessName').focus();
        return;
      }

      const newProcess = await dataService.createProcess({
        process_name: name.trim(),
        description: description.trim(),
        status: 'active'
      });

      // Calculate random position within canvas boundaries
      const canvasWidth = 1200;
      const canvasHeight = 800;
      const nodeSize = 120;
      const margin = 100;

      newProcess.x = Math.random() * (canvasWidth - margin * 2) + margin;
      newProcess.y = Math.random() * (canvasHeight - margin * 2) + margin;

      this.processes.push(newProcess);

      // Clear form and hide
      document.getElementById('newProcessName').value = '';
      document.getElementById('newProcessDescription').value = '';
      this.toggleAddProcessForm();

      this.render();

      uiManager.showNotification(`Process "${newProcess.process_name}" created successfully`, 'success');
    } catch (error) {
      console.error('Error creating process:', error);
      let errorMsg = 'Failed to create process';

      if (error.message.includes('Duplicate key')) {
        errorMsg = 'A process with this name already exists. Please choose a different name.';
      } else if (error.message) {
        errorMsg = error.message;
      }

      uiManager.showNotification(errorMsg, 'error');
    }
  }

  async editProcess(processId) {
    const process = this.processes.find(p => p.process_id === processId);
    if (!process) return;

    const name = document.getElementById(`editName-${processId}`).value;
    const description = document.getElementById(`editDescription-${processId}`).value;

    if (!name.trim()) {
      uiManager.showNotification('Process name is required', 'error');
      document.getElementById(`editName-${processId}`).focus();
      return;
    }

    // Check for duplicate names (excluding current process)
    const duplicate = this.processes.find(p =>
      p.process_id !== processId &&
      p.process_name.toLowerCase() === name.trim().toLowerCase()
    );

    if (duplicate) {
      uiManager.showNotification('A process with this name already exists. Please choose a different name.', 'error');
      document.getElementById(`editName-${processId}`).focus();
      return;
    }

    try {
      await dataService.updateProcess(processId, {
        process_name: name.trim(),
        description: description.trim(),
        status: process.status
      });

      process.process_name = name.trim();
      process.description = description.trim();

      this.toggleEditForm(processId);
      this.render();

      uiManager.showNotification(`Process "${name.trim()}" updated successfully`, 'success');
    } catch (error) {
      console.error('Error updating process:', error);
      let errorMsg = 'Failed to update process';

      if (error.message.includes('Duplicate key')) {
        errorMsg = 'A process with this name already exists. Please choose a different name.';
      } else if (error.message) {
        errorMsg = error.message;
      }

      uiManager.showNotification(errorMsg, 'error');
    }
  }

  async deleteProcess(processId) {
    const process = this.processes.find(p => p.process_id === processId);
    if (!process) return;

    const confirmed = uiManager.confirmAction(`Are you sure you want to delete the process "${process.process_name}"?`);
    if (!confirmed) return;

    try {
      await dataService.deleteProcess(processId);
      this.processes = this.processes.filter(p => p.process_id !== processId);
      this.connections = this.connections.filter(
        c => c.from_process_id !== processId && c.to_process_id !== processId
      );
      this.render();

      uiManager.showNotification(`Process "${process.process_name}" deleted successfully`, 'success');
    } catch (error) {
      console.error('Error deleting process:', error);
      uiManager.showNotification('Failed to delete process: ' + error.message, 'error');
    }
  }

  updateStats() {
    document.getElementById('processCount').textContent = this.processes.length;
    document.getElementById('connectionCount').textContent = this.connections.length;
  }

  showEdgePopup(event, connection) {
    // Get the SVG coordinates
    const svgRect = this.canvas.getBoundingClientRect();
    const x = event.clientX - svgRect.left;
    const y = event.clientY - svgRect.top;

    // Create popup element
    let popup = document.getElementById('edgePopup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'edgePopup';
      popup.className = 'absolute bg-white border border-border rounded-md shadow-lg py-1 z-50 min-w-[120px]';
      this.canvas.parentElement.appendChild(popup);
    }

    const fromProcess = this.processes.find(p => p.process_id === connection.from_process_id);
    const toProcess = this.processes.find(p => p.process_id === connection.to_process_id);

    popup.innerHTML = `
      <button class="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2" onclick="processGraph.deleteEdge(${connection.from_process_id}, ${connection.to_process_id})">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
        Delete Edge
      </button>
    `;

    // Position popup
    popup.style.left = `${x + 10}px`;
    popup.style.top = `${y + 10}px`;
    popup.style.display = 'block';

    // Hide popup when clicking elsewhere
    const hidePopup = (e) => {
      if (!popup.contains(e.target)) {
        popup.style.display = 'none';
        document.removeEventListener('click', hidePopup);
      }
    };
    setTimeout(() => document.addEventListener('click', hidePopup), 0);
  }

  async deleteEdge(fromProcessId, toProcessId) {

    try {
      // Delete from database via API
      await dataService.removeProcessEdge(fromProcessId, toProcessId);

      // Remove from local array
      this.connections = this.connections.filter(
        c => !(c.from_process_id === fromProcessId && c.to_process_id === toProcessId)
      );

      // Hide popup
      const popup = document.getElementById('edgePopup');
      if (popup) {
        popup.style.display = 'none';
      }

      this.renderGraph();
    } catch (error) {
      console.error('❌ ProcessGraph - Error deleting connection:', error);
    }
  }

  toggleConnectionMode() {
    this.isConnecting = !this.isConnecting;
    this.connectionSource = null;

    const btn = document.getElementById('connectionModeBtn');
    if (this.isConnecting) {
      btn.classList.add('bg-emerald-600', 'text-white');
      btn.classList.remove('bg-card');
      this.showConnectionIndicator(true);
    } else {
      btn.classList.remove('bg-emerald-600', 'text-white');
      btn.classList.add('bg-card');
      this.showConnectionIndicator(false);
      this.highlightAllPorts(false);
    }
  }

  toggleAddProcessForm() {
    const form = document.getElementById('addProcessForm');
    const btn = document.getElementById('addProcessBtn');

    if (!form || !btn) {
      console.error('Add process form or button not found in DOM');
      return;
    }

    if (form.classList.contains('hidden')) {
      form.classList.remove('hidden');
      btn.classList.add('hidden');
      document.getElementById('newProcessName').focus();
    } else {
      form.classList.add('hidden');
      btn.classList.remove('hidden');
      document.getElementById('newProcessName').value = '';
      document.getElementById('newProcessDescription').value = '';
    }
  }

  toggleEditForm(processId) {
    const form = document.getElementById(`editForm-${processId}`);

    if (form.classList.contains('hidden')) {
      form.classList.remove('hidden');
    } else {
      form.classList.add('hidden');
      document.getElementById(`editName-${processId}`).value = '';
      document.getElementById(`editDescription-${processId}`).value = '';
    }
  }
}

// Global functions
let processGraph;

async function showProcessModal() {
  const modal = document.getElementById('processModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (!processGraph) {
      processGraph = new ProcessGraph();
    } else {
    }
    await processGraph.init();
  } else {
    console.error('❌ ProcessGraph - Modal element not found!');
  }
}

function closeProcessModal() {
  const modal = document.getElementById('processModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

// Function to attach all event listeners
function attachProcessEventListeners() {
  const showProcessBtn = document.getElementById('showProcessBtn');
  if (showProcessBtn) {
    showProcessBtn.addEventListener('click', showProcessModal);
  }

  const closeProcessBtn = document.getElementById('closeProcessBtn');
  if (closeProcessBtn) {
    closeProcessBtn.addEventListener('click', closeProcessModal);
  }

  const addProcessBtn = document.getElementById('addProcessBtn');
  if (addProcessBtn) {
    addProcessBtn.addEventListener('click', toggleAddProcessForm);
  }

  const cancelAddProcessBtn = document.getElementById('cancelAddProcessBtn');
  if (cancelAddProcessBtn) {
    cancelAddProcessBtn.addEventListener('click', toggleAddProcessForm);
  }

  const footerCloseBtn = document.getElementById('footerCloseBtn');
  if (footerCloseBtn) {
    footerCloseBtn.addEventListener('click', closeProcessModal);
  }
}

// Event listeners will be attached when showProcessModal() is called

function addNewProcess() {
  processGraph.addNewProcess();
}

function toggleConnectionMode() {
  processGraph.toggleConnectionMode();
}

function handleCreateProcess(event) {
  event.preventDefault();
  processGraph.addNewProcess();
  return false;
}

function toggleAddProcessForm() {
  // Check if form exists in DOM first
  const form = document.getElementById('addProcessForm');
  const btn = document.getElementById('addProcessBtn');

  if (!form || !btn) {
    console.warn('Add process form/button not found. Make sure the modal is open.');
    return;
  }

  if (!processGraph) {
    console.warn('ProcessGraph not initialized, creating new instance');
    processGraph = new ProcessGraph();
    processGraph.init().then(() => {
      processGraph.toggleAddProcessForm();
    });
    return;
  }

  processGraph.toggleAddProcessForm();
}

function toggleEditForm(processId) {
  processGraph.toggleEditForm(processId);
}

function handleEditProcess(event, processId) {
  event.preventDefault();
  processGraph.editProcess(processId);
  return false;
}
