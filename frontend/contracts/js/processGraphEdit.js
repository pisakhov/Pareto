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

    // Viewport dragging state
    this.isDraggingCanvas = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.homeButton = null;
  }

  async init() {
    await this.loadProcesses();
    await this.loadProviders();
    this.setupEventListeners();
    this.setupResizeHandle();
    this.addHomeButton();
    await this.render();
    this.autoLayout();
    this.setupFormEventHandlers();
  }

  setupFormEventHandlers() {
    this.processList.addEventListener('submit', (e) => {
      const form = e.target;
      if (form.id && form.id.startsWith('editProcessForm-')) {
        e.preventDefault();
        e.stopPropagation();
        const processId = parseInt(form.id.replace('editProcessForm-', ''));
        this.handleEditProcess(e, processId);
      }
    });
  }

  setupEventListeners() {
    // Canvas pan
    this.canvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));

    // Touch support for canvas dragging
    this.canvas.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      // Mock a mouse event for handleCanvasMouseDown
      const mockEvent = {
        target: e.target,
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => e.preventDefault()
      };
      this.handleCanvasMouseDown(mockEvent);
    }, { passive: false });
  }

  setupResizeHandle() {
    const resizeHandle = document.getElementById('resizeHandle');
    const leftSidebar = document.getElementById('leftSidebar');
    const canvasContainer = document.getElementById('canvasContainer');

    if (!resizeHandle || !leftSidebar || !canvasContainer) return;

    let isResizing = false;
    let startX = 0;
    let startSidebarWidth = 0;

    const startResize = (e) => {
      isResizing = true;
      startX = e.clientX;
      startSidebarWidth = leftSidebar.offsetWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    };

    const doResize = (e) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startX;
      let newWidth = startSidebarWidth + deltaX;

      // Calculate min/max as 10% and 90% of viewport
      const viewportWidth = window.innerWidth;
      const minWidth = viewportWidth * 0.10;  // 10% of viewport
      const maxWidth = viewportWidth * 0.90;  // 90% of viewport

      // Constrain width
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

      leftSidebar.style.width = `${newWidth}px`;
    };

    const stopResize = () => {
      if (!isResizing) return;
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    resizeHandle.addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);

    // Touch support
    resizeHandle.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      startResize(touch);
    });
    document.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      doResize(touch);
    });
    document.addEventListener('touchend', stopResize);
  }

  async loadProcesses() {
    try {
      this.processes = await dataService.loadProcesses();
      await this.loadConnections();
    } catch (error) {
      this.processes = [];
    }
  }

  async loadConnections() {
    // Load connections from database API
    this.connections = await dataService.loadProcessGraph();
  }

  async loadProviders() {
    this.providers = await dataService.loadProviders();
    this.populateProviderDropdown();
  }

  populateProviderDropdown() {
    const providerSelect = document.getElementById('newContractProvider');
    if (!providerSelect) return;

    // Clear existing options
    providerSelect.innerHTML = '<option value="">Select a provider</option>';

    // Add provider options
    this.providers.forEach(provider => {
      const option = document.createElement('option');
      option.value = provider.provider_id;
      option.textContent = provider.company_name;
      providerSelect.appendChild(option);
    });
  }

  async render() {
    await this.renderProcessList();
    this.renderGraph();
    this.updateStats();
    this.updateHomeButtonVisibility();
  }

  addHomeButton() {
    const container = document.getElementById('canvasContainer');
    if (!container) return;

    // Remove existing if any
    const existing = container.querySelector('.graph-edit-home-btn');
    if (existing) existing.remove();

    const homeBtn = document.createElement('button');
    homeBtn.className = 'graph-edit-home-btn absolute bottom-4 right-4 p-2 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-all shadow-sm z-10 opacity-0 pointer-events-none text-slate-500';
    homeBtn.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
      </svg>
    `;
    homeBtn.title = 'Reset View';
    homeBtn.onclick = () => this.resetView();

    container.appendChild(homeBtn);
    this.homeButton = homeBtn;
  }

  resetView() {
    this.viewTransform = { x: 0, y: 0, scale: 1 };
    this.renderGraph();
    this.updateHomeButtonVisibility();
  }

  updateHomeButtonVisibility() {
    if (this.homeButton) {
      if (this.viewTransform.x !== 0 || this.viewTransform.y !== 0) {
        this.homeButton.style.opacity = '1';
        this.homeButton.style.pointerEvents = 'auto';
      } else {
        this.homeButton.style.opacity = '0';
        this.homeButton.style.pointerEvents = 'none';
      }
    }
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

  async renderProcessList() {
    this.processList.innerHTML = '';

    // Fetch all contract counts once, grouped by process name
    const contractCounts = {};
    const contractTierInfo = {}; // { processName: { contractCount, minTiers, maxTiers, allSameTierCount } }
    const uniqueProcessNames = [...new Set(this.processes.map(p => p.process_name))];

    // Fetch contracts and tier counts for each unique process name
    for (const processName of uniqueProcessNames) {
      try {
        const contracts = await dataService.loadContractsForProcess(processName);
        const contractCount = contracts.length;

        if (contractCount === 0) {
          contractTierInfo[processName] = {
            contractCount: 0,
            minTiers: null,
            maxTiers: null,
            allSameTierCount: null
          };
        } else {
          // Fetch tier counts for each contract
          const tierCounts = [];
          for (const contract of contracts) {
            try {
              const tiers = await dataService.loadContractTiers(contract.contract_id);
              tierCounts.push(tiers.length);
            } catch (error) {
              console.error('Error fetching tiers for contract:', contract.contract_id, error);
              tierCounts.push(0);
            }
          }

          // Calculate min and max tier counts
          const minTiers = Math.min(...tierCounts);
          const maxTiers = Math.max(...tierCounts);
          const allSame = tierCounts.every(count => count === tierCounts[0]);

          contractTierInfo[processName] = {
            contractCount,
            minTiers,
            maxTiers,
            allSameTierCount: allSame ? tierCounts[0] : null
          };
        }
      } catch (error) {
        console.error('Error fetching contracts for process:', processName, error);
        contractCounts[processName] = 0;
        contractTierInfo[processName] = {
          contractCount: 0,
          minTiers: null,
          maxTiers: null,
          allSameTierCount: null
        };
      }
    }

    // Render each process with its contract count
    this.processes.forEach(process => {
      const isSelected = this.selectedProcess === process.process_id;

      const processItem = document.createElement('div');
      processItem.className = `bg-card border rounded-lg p-3 transition-all cursor-pointer ${isSelected
        ? 'border-blue-500 shadow-lg shadow-blue-500/20'
        : 'border-border hover:shadow-md'
        }`;

      // Get provider name from the providers array
      const provider = this.providers?.find(p => p.provider_id === process.provider_id);
      const providerName = provider ? provider.company_name : 'Unknown Provider';

      // Get contract and tier info from our fetched data
      const tierInfo = contractTierInfo[process.process_name] || {
        contractCount: 0,
        minTiers: null,
        maxTiers: null,
        allSameTierCount: null
      };

      // Build the contracts and tiers display text
      let contractsTiersText = '';
      if (tierInfo.contractCount === 0) {
        contractsTiersText = '0 Contracts';
      } else if (tierInfo.allSameTierCount !== null && tierInfo.allSameTierCount > 0) {
        contractsTiersText = `${tierInfo.contractCount} ${tierInfo.contractCount !== 1 ? 'Contracts' : 'Contract'} • ${tierInfo.allSameTierCount} ${tierInfo.allSameTierCount !== 1 ? 'Tiers' : 'Tier'} ${tierInfo.contractCount !== 1 ? 'each' : ''}`;
      } else if (tierInfo.minTiers === tierInfo.maxTiers && tierInfo.minTiers > 0) {
        contractsTiersText = `${tierInfo.contractCount} ${tierInfo.contractCount !== 1 ? 'Contracts' : 'Contract'} • ${tierInfo.minTiers} ${tierInfo.minTiers !== 1 ? 'Tiers' : 'Tier'} ${tierInfo.contractCount !== 1 ? 'each' : ''}`;
      } else {
        contractsTiersText = `${tierInfo.contractCount} ${tierInfo.contractCount !== 1 ? 'Contracts' : 'Contract'} • ${tierInfo.minTiers}-${tierInfo.maxTiers} ${tierInfo.maxTiers !== 1 ? 'Tiers' : 'Tier'} each`;
      }

      processItem.innerHTML = `
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h4 class="font-semibold text-base mb-1">${process.process_name}</h4>
            <p class="text-xs text-muted-foreground mb-3">${process.description || 'No description'}</p>

            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
                <span class="text-sm font-medium">${tierInfo.contractCount} ${tierInfo.contractCount !== 1 ? 'Contracts' : 'Contract'}</span>
              </div>
              <div class="text-muted-foreground">•</div>
              <span class="text-xs text-muted-foreground font-medium">${tierInfo.minTiers === tierInfo.maxTiers ? `${tierInfo.minTiers} ${tierInfo.minTiers !== 1 ? 'Tiers' : 'Tier'} ${tierInfo.contractCount !== 1 ? 'each' : ''}` : `${tierInfo.minTiers}-${tierInfo.maxTiers} ${tierInfo.maxTiers !== 1 ? 'Tiers' : 'Tier'} each`}</span>
            </div>
          </div>

          <div class="flex gap-1 ml-2">
            <button onclick="event.stopPropagation(); processGraph.showEditProcessModal(${process.process_id})" class="p-2 hover:bg-accent rounded-md transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button onclick="event.stopPropagation(); processGraph.deleteProcess(${process.process_id})" class="p-2 hover:bg-accent rounded-md transition-colors text-red-600">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>
      `;

      processItem.onclick = (e) => {
        const editForm = e.target.closest('#editForm-' + process.process_id);
        if (editForm) {
          return;
        }
        this.selectProcess(process.process_id);
      };

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
        await this.render();
      }
    } else {
      this.selectedProcess = process.process_id;
      await this.render();
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
      const margin = 60;

      // Constrain to canvas boundaries
      this.draggedNode.x = Math.max(margin, Math.min(newX, canvasRect.width - margin));
      this.draggedNode.y = Math.max(margin, Math.min(newY, canvasRect.height - margin));

      this.renderGraph();
    } else if (this.isDraggingCanvas) {
      this.viewTransform.x = e.clientX - this.dragStartX;
      this.viewTransform.y = e.clientY - this.dragStartY;
      this.renderGraph();
      this.updateHomeButtonVisibility();
    }
  }

  handleMouseUp(e) {
    if (this.draggedNode) {
      this.draggedNode = null;
    }
    if (this.isDraggingCanvas) {
      this.isDraggingCanvas = false;
      this.canvas.style.cursor = 'move'; // Reset to default move cursor
    }
  }

  async handleCanvasMouseDown(e) {
    // Check if clicking on background (canvas or grid rect)
    if (e.target === this.canvas || e.target.id === 'gridRect') {
      this.selectedProcess = null;
      await this.render();

      // Start canvas dragging
      this.isDraggingCanvas = true;
      this.dragStartX = e.clientX - this.viewTransform.x;
      this.dragStartY = e.clientY - this.viewTransform.y;
      this.canvas.style.cursor = 'grabbing';
    }
  }

  async createConnection(fromProcessId, toProcessId) {
    if (this.connections.some(c => c.from_process_id === fromProcessId && c.to_process_id === toProcessId)) {
      return;
    }

    try {
      await dataService.addProcessEdge(fromProcessId, toProcessId);
      this.connections.push({ from_process_id: fromProcessId, to_process_id: toProcessId });
      this.renderGraph();
    } catch (error) {
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
      const processName = document.getElementById('newProcessName').value;
      const description = document.getElementById('newProcessDescription').value;

      if (!processName.trim()) {
        uiManager.showNotification('Process name is required', 'error');
        document.getElementById('newProcessName').focus();
        return;
      }

      // Get all contracts
      const contractsContainer = document.getElementById('addContractsContainer');
      const contractElements = contractsContainer.querySelectorAll('[id^="addContract-"]');

      if (contractElements.length === 0) {
        uiManager.showNotification('Please add at least one contract', 'error');
        return;
      }

      // Create the process FIRST to get its ID
      // Use tier thresholds from the first contract as the default
      const firstContractEl = contractElements[0];
      const firstTierInputs = firstContractEl.querySelectorAll('.add-contract-tier-threshold');
      const defaultTierThresholds = {};
      firstTierInputs.forEach(input => {
        const tierNumber = input.dataset.tier;
        const value = parseInt(input.value) || 0;
        defaultTierThresholds[tierNumber] = value;
      });

      const newProcess = await dataService.createProcess({
        process_name: processName.trim(),
        description: description.trim(),
        provider_id: 0,  // Will be set per-contract
        tier_thresholds: JSON.stringify(defaultTierThresholds),
        status: 'active'
      });

      // Calculate random position
      const canvasWidth = 1200;
      const canvasHeight = 800;
      const margin = 100;

      newProcess.x = Math.random() * (canvasWidth - margin * 2) + margin;
      newProcess.y = Math.random() * (canvasHeight - margin * 2) + margin;
      this.processes.push(newProcess);

      // Now create contracts for this process
      let createdContracts = 0;
      for (const contractEl of contractElements) {
        const contractId = contractEl.id;
        const providerId = parseInt(contractEl.dataset.providerId);

        if (!providerId) {
          uiManager.showNotification('Each contract must have a provider selected', 'error');
          return;
        }

        // Get tier thresholds for this contract
        const tierThresholds = {};
        const tierInputs = contractEl.querySelectorAll('.add-contract-tier-threshold');
        tierInputs.forEach(input => {
          const tierNumber = input.dataset.tier;
          const value = parseInt(input.value) || 0;
          tierThresholds[tierNumber] = value;
        });

        // Create contract using dataService with process_id
        const newContract = await dataService.createContract({
          process_id: newProcess.process_id,
          provider_id: providerId,
          status: 'active'
        });

        // Create tiers for this contract
        for (const [tierNumber, threshold] of Object.entries(tierThresholds)) {
          await dataService.createContractTier({
            contract_id: newContract.contract_id,
            tier_number: parseInt(tierNumber),
            threshold_units: threshold,
            is_selected: false
          });
        }

        createdContracts++;
      }

      uiManager.showNotification(
        createdContracts === 1
          ? `Process "${processName.trim()}" created with 1 contract`
          : `Process "${processName.trim()}" created with ${createdContracts} contracts`,
        'success'
      );

      // Close modal and refresh
      this.closeAddProcessModal();
      await this.render();
    } catch (error) {
      console.error('Error creating process:', error);
      uiManager.showNotification('Failed to create process: ' + error.message, 'error');
    }
  }

  async editProcess(processId) {
    const process = this.processes.find(p => p.process_id === processId);
    if (!process) {
      return;
    }

    const processName = document.getElementById('editProcessName').value;
    const description = document.getElementById('editProcessDescription').value;

    if (!processName.trim()) {
      uiManager.showNotification('Process name is required', 'error');
      document.getElementById('editProcessName').focus();
      return;
    }

    const duplicate = this.processes.find(p =>
      p.process_id !== processId &&
      p.process_name.toLowerCase() === processName.trim().toLowerCase()
    );

    if (duplicate) {
      uiManager.showNotification('A process with this name already exists. Please choose a different name.', 'error');
      document.getElementById('editProcessName').focus();
      return;
    }

    try {
      // Update process (tier thresholds are stored per-contract, not per-process)
      await dataService.updateProcess(processId, {
        process_name: processName.trim(),
        description: description.trim(),
        provider_id: process.provider_id, // Keep existing provider
        tier_thresholds: '{}', // Empty - not used at process level anymore
        status: process.status
      });

      // Update contract tiers for all contracts in the edit form
      const contractsContainer = document.getElementById('editContractsContainer');
      const contractElements = contractsContainer.querySelectorAll('[id^="editContract-"]');

      for (const contractEl of contractElements) {
        const contractId = contractEl.id.replace('editContract-', '');
        const tierInputs = contractEl.querySelectorAll('.contract-tier-threshold');

        // Get current tiers from database to know which ones to update/delete
        const existingTiers = await dataService.loadContractTiers(contractId);
        const updatedTiers = [];

        // Process each tier input
        for (const input of tierInputs) {
          const tierNumber = parseInt(input.dataset.tier);
          const threshold = parseInt(input.value) || 0;

          // Check if this tier already exists
          const existingTier = existingTiers.find(t => t.tier_number === tierNumber);

          if (existingTier) {
            // Update existing tier
            await dataService.updateContractTier(existingTier.contract_tier_id, {
              threshold_units: threshold,
              is_selected: existingTier.is_selected
            });
          } else {
            // Create new tier
            await dataService.createContractTier({
              contract_id: parseInt(contractId),
              tier_number: tierNumber,
              threshold_units: threshold,
              is_selected: false
            });
          }

          updatedTiers.push(tierNumber);
        }

        // Delete tiers that were removed
        for (const existingTier of existingTiers) {
          if (!updatedTiers.includes(existingTier.tier_number)) {
            await dataService.deleteContractTier(existingTier.contract_tier_id);
          }
        }
      }

      // Update local process object
      process.process_name = processName.trim();
      process.description = description.trim();
      process.tier_thresholds = '{}';

      this.closeEditProcessModal();
      await this.render();

      uiManager.showNotification(
        `Process "${processName.trim()}" updated successfully`,
        'success'
      );
    } catch (error) {
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
      await this.render();

      uiManager.showNotification(`Process "${process.process_name}" deleted successfully`, 'success');
    } catch (error) {
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
      await dataService.removeProcessEdge(fromProcessId, toProcessId);
      this.connections = this.connections.filter(
        c => !(c.from_process_id === fromProcessId && c.to_process_id === toProcessId)
      );
      const popup = document.getElementById('edgePopup');
      if (popup) {
        popup.style.display = 'none';
      }
      this.renderGraph();
    } catch (error) {
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

  showAddProcessModal() {
    const modal = document.getElementById('addProcessModal');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    this.resetAddForm();
    this.populateAddProviderSelect();

    // Focus on process name input
    setTimeout(() => {
      const processName = document.getElementById('newProcessName');
      if (processName) {
        processName.focus();
      }
    }, 150);
  }

  closeAddProcessModal() {
    const modal = document.getElementById('addProcessModal');
    if (!modal) return;

    modal.classList.add('hidden');
    modal.classList.remove('flex');
    this.resetAddForm();
  }

  populateTemplateDropdownForAdd() {
    const templateSelect = document.getElementById('newContractTemplate');
    if (templateSelect && this.processes) {
      templateSelect.innerHTML = '<option value="">Select template or create new</option>';
      // Get unique template names
      const uniqueTemplates = [...new Set(this.processes.map(p => p.process_name))];
      uniqueTemplates.forEach(templateName => {
        const option = document.createElement('option');
        option.value = templateName;
        option.textContent = templateName;
        templateSelect.appendChild(option);
      });
    }
  }

  resetAddForm() {
    document.getElementById('newProcessName').value = '';
    document.getElementById('newProcessDescription').value = '';

    // Clear contracts container
    const contractsContainer = document.getElementById('addContractsContainer');
    const emptyState = document.getElementById('addContractsEmpty');
    if (contractsContainer) {
      contractsContainer.innerHTML = '';
    }
    if (emptyState) {
      emptyState.style.display = 'block';
    }

    // Clear provider select
    const providerSelect = document.getElementById('addNewProviderSelect');
    if (providerSelect) {
      providerSelect.value = '';
    }
  }

  createNewTemplateFromAdd() {
    // No longer needed - using simple text input
  }

  addTierToAdd() {
    const container = document.getElementById('addTiersContainer');
    if (!container) return;

    const tierCount = container.children.length;
    const tierNumber = tierCount + 1;

    const tierRow = document.createElement('div');
    tierRow.className = 'flex items-center gap-2 p-3 border border-border rounded bg-secondary/20';
    tierRow.innerHTML = `
      <span class="text-sm font-medium w-16">Tier ${tierNumber}:</span>
      <span class="text-xs">&lt;</span>
      <input type="number"
             data-tier="${tierNumber}"
             class="tier-threshold w-32 px-2 py-1.5 text-sm border border-input rounded"
             value="0"
             min="0"
             placeholder="0">
      <span class="text-sm text-muted-foreground">units</span>
      <button type="button" onclick="this.parentElement.remove()"
              class="text-red-600 hover:text-red-800 ml-auto p-1 hover:bg-red-50 rounded">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    `;

    container.appendChild(tierRow);
  }

  async populateAddProviderSelect() {
    const providerSelectSection = document.getElementById('addProviderSelectSection');
    if (!providerSelectSection || !this.providers) return;

    const container = document.getElementById('addContractsContainer');

    // Get currently selected providers from contracts
    const existingProviders = new Set();
    if (container) {
      const contractElements = container.querySelectorAll('[id^="addContract-"]');
      contractElements.forEach(el => {
        const providerId = parseInt(el.dataset.providerId);
        if (providerId) {
          existingProviders.add(providerId);
        }
      });
    }

    // Get all active providers not yet added
    const availableProviders = this.providers.filter(p =>
      !existingProviders.has(p.provider_id) && p.status === 'active'
    );

    // Clear and update the provider selection section
    providerSelectSection.innerHTML = '';

    if (availableProviders.length === 0) {
      // Show nice message when all providers have contracts
      providerSelectSection.innerHTML = `
        <div class="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">All providers already have contracts for this process</span>
        </div>
      `;
    } else {
      // Show normal select and add button
      providerSelectSection.innerHTML = `
        <div class="flex items-center gap-3">
          <select id="addNewProviderSelect" class="flex-1 px-3 py-2 border border-input rounded-md">
          </select>
          <button type="button" onclick="processGraph.addProviderToAdd()"
                  class="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">
            Add
          </button>
        </div>
        <p class="text-xs text-muted-foreground mt-2">Each provider can only have one contract per process</p>
      `;

      // Populate the select
      const select = document.getElementById('addNewProviderSelect');
      availableProviders.forEach(provider => {
        const option = document.createElement('option');
        option.value = provider.provider_id;
        option.textContent = provider.company_name;
        select.appendChild(option);
      });
    }
  }

  async addProviderToAdd() {
    console.log('🔵 [ADD] Button clicked');

    const select = document.getElementById('addNewProviderSelect');
    if (!select) {
      console.error('❌ [ADD] Select element not found');
      uiManager.showNotification('No providers available to add', 'error');
      return;
    }

    const providerId = parseInt(select.value);
    console.log('🔵 [ADD] Selected provider ID:', providerId);

    if (!providerId) {
      console.warn('⚠️ [ADD] No provider selected');
      uiManager.showNotification('Please select a provider', 'error');
      return;
    }

    const provider = this.providers.find(p => p.provider_id === providerId);
    if (!provider) {
      console.error('❌ [ADD] Provider not found');
      uiManager.showNotification('Provider not found', 'error');
      return;
    }

    const container = document.getElementById('addContractsContainer');
    const emptyState = document.getElementById('addContractsEmpty');
    if (!container) {
      console.error('❌ [ADD] Container not found');
      return;
    }

    // Hide empty state
    if (emptyState) {
      emptyState.style.display = 'none';
    }

    const contractIndex = container.children.length;
    const contractId = `addContract-${contractIndex}`;

    const contractElement = document.createElement('div');
    contractElement.id = contractId;
    contractElement.className = 'p-3 bg-card border border-border rounded-md space-y-3';
    contractElement.dataset.providerId = providerId;

    contractElement.innerHTML = `
      <div class="flex items-center justify-between">
        <h5 class="text-xs font-semibold text-foreground flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
          ${provider.company_name}
        </h5>
        <button type="button" onclick="processGraph.removeContractFromAdd('${contractId}')"
                class="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Tier Thresholds for this Contract -->
      <div class="border-t border-border pt-3">
        <div class="flex items-center justify-between mb-2">
          <label class="block text-xs font-medium">Volume Tiers for this Contract</label>
          <button type="button" onclick="processGraph.addContractTierRowToAdd('${contractId}')"
                  class="text-xs px-2 py-1 bg-secondary hover:bg-secondary/80 rounded">
            + Add Tier
          </button>
        </div>
        <div id="addContractTiersContainer-${contractId}" class="space-y-2">
          <!-- Default tier -->
          <div class="flex items-center gap-2 p-2 border border-border rounded bg-secondary/20">
            <span class="text-sm font-medium w-16">Tier 1:</span>
            <span class="text-xs">&lt;</span>
            <input type="number"
                   data-tier="1"
                   class="add-contract-tier-threshold w-32 px-2 py-1 text-sm border border-input rounded"
                   value="1000"
                   min="0"
                   placeholder="0">
            <span class="text-xs text-muted-foreground">units</span>
            <span class="w-6"></span>
          </div>
        </div>
        <p class="text-xs text-muted-foreground mt-2">Customize tier thresholds for this provider</p>
      </div>
    `;

    container.appendChild(contractElement);
    console.log('✅ [ADD] Provider added:', provider.company_name);

    // Refresh provider select to exclude this provider
    this.populateAddProviderSelect();
    select.value = '';
  }

  removeContractFromAdd(contractId) {
    const contract = document.getElementById(contractId);
    const container = document.getElementById('addContractsContainer');
    const emptyState = document.getElementById('addContractsEmpty');

    if (contract) {
      contract.remove();
    }

    // Show empty state if no contracts left
    if (container && container.children.length === 0 && emptyState) {
      emptyState.style.display = 'block';
    }

    // Refresh provider select to include removed provider
    this.populateAddProviderSelect();
  }

  addContractTierRowToAdd(contractId, tierNumber = null, threshold = 0) {
    const container = document.getElementById(`addContractTiersContainer-${contractId}`);
    if (!container) return;

    const actualTierNumber = tierNumber || (container.children.length + 1);
    const rowId = `add-contract-tier-${contractId}-${actualTierNumber}`;

    // Check if tier already exists
    if (document.getElementById(rowId)) {
      return;
    }

    const row = document.createElement('div');
    row.id = rowId;
    row.className = 'flex items-center gap-2 p-2 border border-border rounded bg-secondary/20';

    row.innerHTML = `
      <span class="text-sm font-medium w-16">Tier ${actualTierNumber}:</span>
      <span class="text-xs">&lt;</span>
      <input type="number"
             data-tier="${actualTierNumber}"
             class="add-contract-tier-threshold w-32 px-2 py-1 text-sm border border-input rounded"
             value="${threshold}"
             min="0"
             placeholder="0">
      <span class="text-xs text-muted-foreground">units</span>
      ${actualTierNumber > 1
        ? `<button type="button" onclick="processGraph.removeContractTierRowFromAdd('${rowId}')" class="text-red-600 hover:text-red-800 ml-auto">
             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
             </svg>
           </button>`
        : '<span class="w-6"></span>'
      }
    `;

    container.appendChild(row);
  }

  removeContractTierRowFromAdd(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
      row.remove();
    }
  }

  showEditProcessModal(processId) {
    const modal = document.getElementById('editProcessModal');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Store current process ID
    document.getElementById('editProcessId').value = processId;

    this.populateEditForm(processId);

    // Focus on template select
    setTimeout(() => {
      const templateSelect = document.getElementById('editContractTemplate');
      if (templateSelect) {
        templateSelect.focus();
      }
    }, 150);
  }

  closeEditProcessModal() {
    const modal = document.getElementById('editProcessModal');
    if (!modal) return;

    modal.classList.add('hidden');
    modal.classList.remove('flex');

    // Clear form fields
    document.getElementById('editProcessId').value = '';
    document.getElementById('editProcessName').value = '';
    document.getElementById('editProcessDescription').value = '';

    // Clear contracts container
    const contractsContainer = document.getElementById('editContractsContainer');
    const emptyState = document.getElementById('editContractsEmpty');
    if (contractsContainer) {
      contractsContainer.innerHTML = '';
    }
    if (emptyState) {
      emptyState.style.display = 'block';
    }

    // Clear provider select
    const providerSelect = document.getElementById('editNewProviderSelect');
    if (providerSelect) {
      providerSelect.value = '';
    }
  }

  populateEditForm(processId) {
    const process = this.processes.find(p => p.process_id === processId);
    if (!process) return;

    // Set process name
    const nameInput = document.getElementById('editProcessName');
    if (nameInput) {
      nameInput.value = process.process_name || '';
    }

    // Set description
    const descriptionInput = document.getElementById('editProcessDescription');
    if (descriptionInput) {
      descriptionInput.value = process.description || '';
    }

    // Load contracts
    this.loadContractsForEdit(processId);
  }

  async getContractCountForProcess(processId) {
    // Get process by ID
    const process = this.processes.find(p => p.process_id === processId);
    if (!process) return 0;

    try {
      // Fetch actual contracts for this process
      const contracts = await dataService.loadContractsForProcess(process.process_name);
      return contracts.length;
    } catch (error) {
      console.error('Error fetching contract count:', error);
      return 0;
    }
  }

  createNewTemplateFromEdit() {
    // No longer needed - using simple text input
  }

  addContractTierRow(contractId, tierNumber = null, threshold = 0) {
    const container = document.getElementById(`editContractTiersContainer-${contractId}`);
    if (!container) return;

    const actualTierNumber = tierNumber || (container.children.length + 1);
    const rowId = `edit-contract-tier-${contractId}-${actualTierNumber}`;

    // Check if tier already exists
    if (document.getElementById(rowId)) {
      return;
    }

    const row = document.createElement('div');
    row.id = rowId;
    row.className = 'flex items-center gap-2 p-2 border border-border rounded bg-secondary/20';

    row.innerHTML = `
      <span class="text-sm font-medium w-16">Tier ${actualTierNumber}:</span>
      <span class="text-xs">&lt;</span>
      <input type="number"
             data-tier="${actualTierNumber}"
             class="contract-tier-threshold w-32 px-2 py-1 text-sm border border-input rounded"
             value="${threshold}"
             min="0"
             placeholder="0">
      <span class="text-xs text-muted-foreground">units</span>
      ${actualTierNumber > 1
        ? `<button type="button" onclick="processGraph.removeContractTierRow('${rowId}')" class="text-red-600 hover:text-red-800 ml-auto">
             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
             </svg>
           </button>`
        : '<span class="w-6"></span>'
      }
    `;

    container.appendChild(row);
  }

  removeContractTierRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
      row.remove();
    }
  }

  async loadContractsForEdit(processId, templateName) {
    const container = document.getElementById('editContractsContainer');
    if (!container) return;

    // Find the specific process being edited
    const process = this.processes.find(p => p.process_id === processId);
    if (!process) {
      container.innerHTML = `
        <div class="p-8 border-2 border-dashed border-border rounded-lg bg-secondary/10 text-center">
          <p class="text-sm text-muted-foreground">Error: Process not found</p>
        </div>
      `;
      return;
    }

    // Fetch contracts for this process
    try {
      const contracts = await dataService.loadContractsForProcessId(process.process_id);

      // Clear existing contracts
      container.innerHTML = '';

      if (contracts.length === 0) {
        // Show empty state - recreate it since we cleared the container
        container.innerHTML = `
          <div class="p-8 border-2 border-dashed border-border rounded-lg bg-secondary/10 text-center">
            <svg class="w-12 h-12 text-muted-foreground mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
            <p class="text-sm text-muted-foreground">No contracts found for this process</p>
            <p class="text-xs text-muted-foreground mt-1">Add providers to create contracts</p>
          </div>
        `;
      } else {
        // Render each contract
        for (const contract of contracts) {
          await this.renderContractInEdit(container, contract);
        }
      }

      // Always populate provider selection so users can add contracts
      await this.populateEditProviderSelect();
    } catch (error) {
      console.error('Error loading contracts:', error);
      container.innerHTML = `
        <div class="p-4 bg-red-50 border border-red-200 rounded-md">
          <p class="text-sm text-red-700">Error loading contracts: ${error.message}</p>
        </div>
      `;
    }
  }

  async renderContractInEdit(container, contract) {
    const contractId = `editContract-${contract.contract_id}`;

    const contractElement = document.createElement('div');
    contractElement.id = contractId;
    contractElement.className = 'p-4 bg-card border border-border rounded-md space-y-4';
    contractElement.dataset.providerId = contract.provider_id;

    contractElement.innerHTML = `
      <div class="flex items-center justify-between">
        <h5 class="text-sm font-semibold text-foreground flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
          ${contract.provider_name}
        </h5>
        <button type="button" onclick="processGraph.removeContractFromEdit('${contract.contract_id}')"
                class="text-red-600 hover:text-red-800 p-1.5 hover:bg-red-50 rounded">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Tier Thresholds for this Contract -->
      <div class="border-t border-border pt-4">
        <div class="flex items-center justify-between mb-3">
          <label class="block text-sm font-medium">Volume Tiers for this Contract</label>
          <button type="button" onclick="processGraph.addContractTierRow('${contractId}')"
                  class="text-sm px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded">
            + Add Tier
          </button>
        </div>
        <div id="editContractTiersContainer-${contractId}" class="space-y-2">
          <!-- Tier rows will be dynamically added here -->
        </div>
        <p class="text-sm text-muted-foreground mt-2">Customize tier thresholds for this provider</p>
      </div>
    `;

    container.appendChild(contractElement);

    // Load tier thresholds from the database
    const tierContainer = document.getElementById(`editContractTiersContainer-${contractId}`);
    if (tierContainer) {
      tierContainer.innerHTML = '';
      try {
        // Fetch contract tiers from the database
        const contractTiers = await dataService.loadContractTiers(contract.contract_id);

        if (contractTiers.length === 0) {
          // If no tiers exist in database, add one default tier
          this.addContractTierRow(contractId, 1, 1000);
        } else {
          // Sort tiers by tier_number and render them
          const sortedTiers = contractTiers.sort((a, b) => a.tier_number - b.tier_number);
          sortedTiers.forEach(tier => {
            this.addContractTierRow(contractId, tier.tier_number, tier.threshold_units);
          });
        }
      } catch (error) {
        console.error('Error loading contract tiers:', error);
        // If error loading tiers, show default tier
        this.addContractTierRow(contractId, 1, 1000);
      }
    }
  }

  async populateEditProviderSelect() {
    const providerSelectSection = document.getElementById('editProviderSelectSection');
    if (!providerSelectSection) return;

    // Ensure providers are loaded
    if (!this.providers || this.providers.length === 0) {
      try {
        this.providers = await dataService.loadProviders();
      } catch (e) {
        console.error("Failed to load providers", e);
        this.providers = [];
      }
    }

    if (!this.providers) this.providers = [];

    const container = document.getElementById('editContractsContainer');

    // Get currently selected providers from contracts using data attribute (like Add modal)
    const existingProviders = new Set();
    if (container) {
      const contractElements = container.querySelectorAll('[id^="editContract-"]');
      contractElements.forEach(el => {
        const providerId = parseInt(el.dataset.providerId);
        if (providerId) {
          existingProviders.add(providerId);
        }
      });
    }

    // Get all active providers not yet added
    const availableProviders = this.providers.filter(p =>
      !existingProviders.has(p.provider_id) && p.status === 'active'
    );

    // Clear and update the provider selection section
    providerSelectSection.innerHTML = '';

    if (this.providers.length === 0) {
      // No providers in the system
      providerSelectSection.innerHTML = `
        <div class="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="font-medium">No active providers found in the system</span>
        </div>
      `;
    } else if (availableProviders.length === 0) {
      // Show nice message when all providers have contracts
      providerSelectSection.innerHTML = `
        <div class="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">All active providers already have contracts for this process</span>
        </div>
      `;
    } else {
      // Show normal select and add button
      providerSelectSection.innerHTML = `
        <div class="flex items-center gap-3">
          <select id="editNewProviderSelect" class="flex-1 px-3 py-2 border border-input rounded-md">
          </select>
          <button type="button" onclick="processGraph.addProviderToEdit()"
                  class="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">
            Add
          </button>
        </div>
        <p class="text-xs text-muted-foreground mt-2">Each provider can only have one contract per process</p>
      `;

      // Populate the select
      const select = document.getElementById('editNewProviderSelect');
      availableProviders.forEach(provider => {
        const option = document.createElement('option');
        option.value = provider.provider_id;
        option.textContent = provider.company_name;
        select.appendChild(option);
      });
    }
  }

  async addProviderToEdit() {
    const select = document.getElementById('editNewProviderSelect');
    if (!select) {
      uiManager.showNotification('No providers available to add', 'error');
      return;
    }

    const providerId = parseInt(select.value);
    if (!providerId) {
      uiManager.showNotification('Please select a provider', 'error');
      return;
    }

    const processId = parseInt(document.getElementById('editProcessId').value);
    const process = this.processes.find(p => p.process_id === processId);

    if (!process) {
      uiManager.showNotification('Process not found', 'error');
      return;
    }

    try {
      // Get tier thresholds from the process
      let tierThresholds = {};
      try {
        tierThresholds = JSON.parse(process.tier_thresholds || '{}');
      } catch (e) {
        tierThresholds = { '1': 1000 };
      }

      // Create contract
      const newContract = await dataService.createContract({
        process_id: processId,
        provider_id: providerId,
        status: 'active'
      });

      // Create tiers for this contract
      for (const [tierNumber, threshold] of Object.entries(tierThresholds)) {
        await dataService.createContractTier({
          contract_id: newContract.contract_id,
          tier_number: parseInt(tierNumber),
          threshold_units: threshold,
          is_selected: false
        });
      }

      uiManager.showNotification('Contract created successfully', 'success');

      // Reload contracts
      await this.loadContractsForEdit(processId);
      // Clear the select
      select.value = '';
    } catch (error) {
      console.error('Error creating contract:', error);
      uiManager.showNotification('Failed to create contract: ' + error.message, 'error');
    }
  }

  async removeContractFromEdit(contractId) {
    if (!confirm('Are you sure you want to remove this contract?')) {
      return;
    }

    try {
      await dataService.deleteContract(contractId);
      uiManager.showNotification('Contract removed successfully', 'success');

      // Remove from UI
      const contractElement = document.getElementById(`editContract-${contractId}`);
      if (contractElement) {
        contractElement.remove();
      }

      // Check if empty state should be shown
      const container = document.getElementById('editContractsContainer');
      const emptyState = document.getElementById('editContractsEmpty');
      if (container && emptyState && container.children.length === 0) {
        emptyState.style.display = 'block';
      }

      // Refresh provider select
      await this.populateEditProviderSelect();
    } catch (error) {
      console.error('Error deleting contract:', error);
      uiManager.showNotification('Failed to delete contract: ' + error.message, 'error');
    }
  }

  handleEditProcess(event, processId) {
    event.preventDefault();
    event.stopPropagation();

    if (!this) {
      alert('Error: Process editor not initialized');
      return false;
    }

    this.editProcess(processId);
    return false;
  }

  handleEditProcessSubmit(event) {
    event.preventDefault();
    event.stopPropagation();

    const processId = parseInt(document.getElementById('editProcessId').value);
    if (!processId) return;

    // Call the editProcess method
    this.editProcess(processId);
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
    }
    await processGraph.init();
    // Initialize tierManager with a default tier
    window.tierManager.clearTiers();
    window.tierManager.addTierRow(1, 1000);
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
  const form = document.getElementById('addProcessForm');
  const btn = document.getElementById('addProcessBtn');

  if (!form || !btn) {
    return;
  }

  if (!processGraph) {
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
  return false;
}
