/**
 * Process Menu View - Renders a menu of processes grouped by their connections
 */
class ProcessMenuView {
    constructor() {
        this.container = null;
        this.processes = [];
        this.connections = [];
        this.isVisible = false;
    }

    async init() {
        this.container = document.getElementById('processMenuView');
        if (!this.container) return;

        // Load data
        const [processes, connections] = await Promise.all([
            dataService.loadProcesses(),
            dataService.loadProcessGraph()
        ]);
        this.processes = processes;
        this.connections = connections;
        this.render();
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = '';
        const groups = this.groupProcesses();

        // Get current process ID to highlight active one
        const currentProcessId = this.getCurrentProcessId();

        const menuContainer = document.createElement('div');
        menuContainer.className = 'space-y-4';

        groups.forEach((group, index) => {
            const groupSection = document.createElement('div');
            groupSection.className = 'bg-card rounded-lg border border-border shadow-sm p-3';

            const list = document.createElement('div');
            list.className = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3';

            group.forEach(process => {
                const isActive = process.process_id === currentProcessId;
                const item = document.createElement('div');
                item.className = `
                    flex items-center gap-3 p-3 rounded-md transition-all duration-200 cursor-pointer
                    ${isActive
                        ? 'bg-emerald-50/80 border border-emerald-200 shadow-sm'
                        : 'hover:bg-accent border border-transparent hover:border-border'
                    }
                `;

                item.onclick = () => {
                    if (!isActive) window.location.href = `/contracts/${process.process_id}`;
                };

                item.innerHTML = `
                    <div class="flex-shrink-0 p-1.5 rounded-md ${isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-secondary text-muted-foreground'}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                        </svg>
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center justify-between">
                            <h3 class="text-sm font-medium text-foreground truncate ${isActive ? 'text-emerald-700' : ''}">${process.process_name}</h3>
                            ${isActive ? '<span class="flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>' : ''}
                        </div>
                        ${process.description ? `<p class="text-xs text-muted-foreground truncate mt-0.5">${process.description}</p>` : ''}
                    </div>
                `;

                list.appendChild(item);
            });

            groupSection.appendChild(list);
            menuContainer.appendChild(groupSection);
        });

        this.container.appendChild(menuContainer);
    }

    groupProcesses() {
        if (!this.processes.length) return [];
        if (!this.connections.length) return this.processes.map(p => [p]);

        const adj = new Map();
        this.processes.forEach(p => adj.set(p.process_id, []));

        // Build adjacency list (undirected for grouping)
        this.connections.forEach(conn => {
            if (adj.has(conn.from_process_id)) adj.get(conn.from_process_id).push(conn.to_process_id);
            if (adj.has(conn.to_process_id)) adj.get(conn.to_process_id).push(conn.from_process_id);
        });

        const visited = new Set();
        const groups = [];

        this.processes.forEach(process => {
            if (!visited.has(process.process_id)) {
                const group = [];
                const queue = [process.process_id];
                visited.add(process.process_id);

                while (queue.length > 0) {
                    const currId = queue.shift();
                    const currProcess = this.processes.find(p => p.process_id === currId);
                    if (currProcess) group.push(currProcess);

                    const neighbors = adj.get(currId) || [];
                    neighbors.forEach(neighborId => {
                        if (!visited.has(neighborId)) {
                            visited.add(neighborId);
                            queue.push(neighborId);
                        }
                    });
                }
                groups.push(group);
            }
        });

        // Sort groups by size (largest first) or name of first element
        return groups.sort((a, b) => b.length - a.length);
    }

    getCurrentProcessId() {
        const match = window.location.pathname.match(/\/contracts\/(\d+)/);
        return match ? parseInt(match[1]) : null;
    }

    show() {
        if (this.container) {
            this.container.classList.remove('hidden');
            this.isVisible = true;
        }
    }

    hide() {
        if (this.container) {
            this.container.classList.add('hidden');
            this.isVisible = false;
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.processMenuView = new ProcessMenuView();
    window.processMenuView.init();
});
