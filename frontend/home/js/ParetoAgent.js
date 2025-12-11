/**
 * ParetoAgent - Chat interface for interacting with the LangChain agent.
 * Provides a ChatGPT-like UI for sending messages and displaying responses.
 */
class ParetoAgent {
    constructor(containerId) {
        this.containerId = containerId;
        this.chatHistoryEl = null;
        this.messageInputEl = null;
        this.sendButtonEl = null;
        this.isProcessing = false;
        this.abortController = null;
        this.stopConfirmationPending = false;
        this.messages = []; // Store chat history
    }

    async init() {
        if (document.getElementById('pareto-agent-chat-interface')) {
            return;
        }

        this.renderLoading();
        try {
            this.renderInitialState();
            this.chatHistoryEl = document.getElementById('pareto-agent-chat-history');
            this.messageInputEl = document.getElementById('pareto-agent-message-input');
            this.sendButtonEl = document.getElementById('pareto-agent-send-button');
            
            this.addEventListeners();
        } catch (error) {
            console.error("ParetoAgent Init Error:", error);
            this.renderError(error.message);
        }
    }

    renderLoading() {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="animate-pulse text-muted-foreground">Loading Pareto Agent...</div>
                </div>`;
        }
    }

    renderError(msg) {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <p class="text-red-600 mb-2">Failed to load Pareto Agent</p>
                    <p class="text-sm text-muted-foreground">${msg}</p>
                </div>`;
        }
    }

    renderInitialState() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div id="pareto-agent-chat-interface" class="flex flex-col bg-white relative font-sans min-h-[600px]">
                <!-- Header (Minimal) -->
                <div class="shrink-0 bg-white/80 backdrop-blur-sm border-b border-zinc-100 flex items-center justify-center p-3 z-20 sticky top-0">
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-semibold text-zinc-900">Pareto Agent</span>
                        <span class="px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500 text-[10px] font-medium border border-zinc-200">Beta</span>
                    </div>
                </div>

                <!-- Chat History (Centered Column) -->
                <div id="pareto-agent-chat-history" class="flex-1 p-4 space-y-6 pb-24">
                    <div id="chat-messages-container" class="w-full space-y-6 pb-4">
                        <!-- Welcome Message -->
                        <div id="welcome-message" class="flex flex-col items-center justify-center py-12 text-center space-y-4">
                            <div class="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center shadow-lg mb-2">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <h3 class="text-lg font-semibold text-zinc-900">How can I help you optimize today?</h3>
                            <p class="text-sm text-zinc-500 max-w-md">
                                I can analyze your contracts, forecast pricing scenarios, or identify savings opportunities across your supply chain.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Input Area (Sticky Bottom) -->
                <div class="sticky bottom-0 z-30 p-6 pt-2 bg-gradient-to-t from-white via-white to-transparent backdrop-blur-sm">
                    <div class="max-w-3xl mx-auto w-full">
                        <div class="relative flex items-end gap-2 bg-white border border-zinc-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-zinc-900/10 focus-within:border-zinc-300 p-2">
                            <textarea 
                                id="pareto-agent-message-input" 
                                class="flex-1 resize-none border-none bg-transparent px-3 py-2 text-base text-zinc-800 focus:ring-0 placeholder:text-zinc-400 custom-scrollbar max-h-[200px]" 
                                rows="1" 
                                placeholder="Ask about allocation strategies, pricing forecasts..."
                            ></textarea>
                            <button 
                                id="pareto-agent-send-button" 
                                class="shrink-0 bg-zinc-900 text-white p-2.5 rounded-xl hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-0.5"
                            >
                                <svg id="send-icon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7" /></svg>
                                <svg id="stop-icon" class="w-4 h-4 hidden" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                            </button>
                        </div>
                        <div id="pareto-agent-helper-text" class="text-[10px] text-center text-zinc-400 mt-3 font-medium">
                            Pareto Agent can make mistakes. Verify critical data.
                        </div>
                    </div>
                </div>

                <!-- Confirmation Modal -->
                <div id="pareto-agent-modal-overlay" class="fixed inset-0 z-50 bg-white/60 backdrop-blur-[2px] hidden flex items-center justify-center">
                    <div class="bg-white border border-zinc-200 shadow-xl rounded-2xl p-6 max-w-sm w-full mx-4 transform transition-all scale-100 ring-1 ring-black/5">
                        <div class="flex flex-col items-center text-center space-y-3">
                            <div class="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-1">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <h3 class="text-base font-semibold text-zinc-900">Pareto is delivering</h3>
                            <p class="text-sm text-zinc-500 leading-relaxed px-2">
                                Are you sure you want to terminate him and <span id="pareto-modal-action-text">send the message</span>?
                            </p>
                            <div class="flex gap-3 w-full pt-3">
                                <button id="pareto-modal-cancel" class="flex-1 px-4 py-2.5 text-xs font-semibold text-zinc-700 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-200 transition-colors">
                                    Cancel
                                </button>
                                <button id="pareto-modal-confirm" class="flex-1 px-4 py-2.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl shadow-sm transition-colors">
                                    Terminate
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    addEventListeners() {
        this.sendButtonEl.addEventListener('click', () => this.handleAction());

        this.messageInputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleAction();
            }
        });

        this.messageInputEl.addEventListener('input', () => {
            this.messageInputEl.style.height = 'auto';
            this.messageInputEl.style.height = (this.messageInputEl.scrollHeight) + 'px';
        });

        // Modal Listeners
        document.getElementById('pareto-modal-cancel').addEventListener('click', () => this.hideConfirmationModal());
        document.getElementById('pareto-modal-confirm').addEventListener('click', () => this.confirmStop());
    }

    handleAction() {
        if (this.isProcessing) {
            this.showConfirmationModal();
        } else {
            this.sendMessage();
        }
    }

    showConfirmationModal() {
        const modal = document.getElementById('pareto-agent-modal-overlay');
        const actionText = document.getElementById('pareto-modal-action-text');
        const message = this.messageInputEl.value.trim();

        if (modal && actionText) {
            actionText.textContent = message ? "send the message" : "stop generation";
            modal.classList.remove('hidden');
        }
    }

    hideConfirmationModal() {
        const modal = document.getElementById('pareto-agent-modal-overlay');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    confirmStop() {
        this.hideConfirmationModal();
        const message = this.messageInputEl.value.trim();
        
        this.stopGeneration();

        if (message) {
             // Short delay to allow cleanup of previous request
             setTimeout(() => {
                this.sendMessage();
            }, 50);
        }
    }

    updateHelperText() {
        // Simplified helper text since we have the modal now
        const helperEl = document.getElementById('pareto-agent-helper-text');
        if (!helperEl) return;
        
        if (this.isProcessing) {
            helperEl.textContent = "Agent is working...";
            helperEl.className = "text-[10px] text-center text-zinc-400 mt-3 font-medium animate-pulse";
        } else {
            helperEl.textContent = "Pareto Agent can make mistakes. Verify critical data.";
            helperEl.className = "text-[10px] text-center text-zinc-400 mt-3 font-medium";
        }
    }

    stopGeneration() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.updateHelperText();
    }

    async sendMessage() {
        const messageText = this.messageInputEl.value.trim();
        if (!messageText) return;

        // Clear input and remove welcome
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) welcomeMessage.remove();

        this.messageInputEl.value = '';
        this.messageInputEl.style.height = 'auto';
        this.stopConfirmationPending = false; // Ensure reset

        // Add user message to history
        this.messages.push({ role: 'user', content: messageText });

        // Display user message
        this.displayMessage(messageText, 'user');

        // Start processing
        this.setProcessingState(true);
        this.abortController = new AbortController();

        // Show loading
        const loadingEl = this.displayMessage("Thinking...", 'agent-loading');

        try {
            const response = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ messages: this.messages }),
                signal: this.abortController.signal
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (loadingEl) loadingEl.remove();

            // Handle response messages
            if (data.messages && Array.isArray(data.messages)) {
                // Determine new messages
                const currentCount = this.messages.length;
                const serverMessages = data.messages;
                
                // Update local history to match server
                this.messages = serverMessages;

                // Display new messages
                // We check from the previous count, but be careful of overlapping user message
                // The server returns the FULL conversation.
                // If we sent 1 user message, length is 1. Server returns [User, Response...].
                // So index 0 is user (skip), index 1+ are new.
                
                // NOTE: If we used the updated count logic strictly, we might miss things if server modifies history
                // But generally, we just want to display what's new.
                
                // Find where our known history ends in the new list (simplified)
                // We just start from the index 'currentCount' which should be the first new message.
                
                for (let i = currentCount; i < serverMessages.length; i++) {
                    const msg = serverMessages[i];
                    let sender = 'agent';
                    if (msg.role === 'tool') {
                        sender = 'tool';
                    } else if (msg.role === 'assistant') {
                        sender = 'agent';
                    } else if (msg.role === 'user') {
                        continue;
                    }
                    
                    this.displayMessage(msg.content, sender);
                }
            }

        } catch (error) {
            if (loadingEl) loadingEl.remove();
            
            if (error.name === 'AbortError') {
                this.displayMessage("Stopped.", 'agent');
            } else {
                console.error("Error:", error);
                this.displayMessage("Sorry, I encountered an error: " + error.message, 'agent');
            }
        } finally {
            this.setProcessingState(false);
            this.abortController = null;
        }
    }

    setProcessingState(isProcessing) {
        this.isProcessing = isProcessing;
        this.stopConfirmationPending = false; // Always reset when state changes
        
        // Ensure modal is hidden if processing stops naturally
        if (!isProcessing) {
            this.hideConfirmationModal();
        }

        const sendIcon = document.getElementById('send-icon');
        const stopIcon = document.getElementById('stop-icon');
        
        if (isProcessing) {
            sendIcon.classList.add('hidden');
            stopIcon.classList.remove('hidden');
        } else {
            sendIcon.classList.remove('hidden');
            stopIcon.classList.add('hidden');
        }
        this.updateHelperText();
    }

    displayMessage(content, sender) {
        const chatContainer = document.getElementById('chat-messages-container');
        if (!chatContainer) return;

        // Helper to append a single block
        const appendBlock = (html, className) => {
            const wrapper = document.createElement('div');
            wrapper.className = className;
            wrapper.innerHTML = html;
            chatContainer.appendChild(wrapper);
            return wrapper;
        };

        let lastWrapper = null;

        if (sender === 'user') {
             // User messages are always simple strings
             const text = typeof content === 'string' ? content : JSON.stringify(content);
             lastWrapper = appendBlock(`
                <div class="bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed">
                    ${this.escapeHtml(text)}
                </div>
            `, 'flex justify-end w-full');

        } else if (sender === 'agent-loading') {
             lastWrapper = appendBlock(`
                <div class="w-6 h-6 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 mt-0.5">
                    <svg class="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div class="flex items-center gap-1 py-2">
                    <span class="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce"></span>
                    <span class="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce delay-75"></span>
                    <span class="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce delay-150"></span>
                </div>
            `, 'flex justify-start w-full gap-3');

        } else if (sender === 'tool') {
             // Tool output
             const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
             lastWrapper = appendBlock(`
                <div class="w-6 h-6 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 mt-0.5">
                    <svg class="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div class="text-zinc-600 py-0.5 max-w-[90%] text-xs font-mono bg-zinc-50 p-2 rounded border border-zinc-100 overflow-x-auto whitespace-pre-wrap">
                    ${this.escapeHtml(text)}
                </div>
            `, 'flex justify-start w-full gap-3 opacity-90');

        } else if (sender === 'agent') {
            // Agent messages can be strings or arrays of blocks
            let blocks = [];
            if (Array.isArray(content)) {
                blocks = content;
            } else {
                // If it's a string, treat as one text block
                blocks = [{ type: 'text', text: content }];
            }

            blocks.forEach(block => {
                if (block.type === 'thinking') {
                    // Thinking block - Distinct styling
                     const thoughtText = block.thinking || block.text || JSON.stringify(block);
                     lastWrapper = appendBlock(`
                        <div class="w-6 h-6 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                            <svg class="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                        </div>
                        <div class="text-purple-700 py-2 px-3 bg-purple-50/50 rounded-lg border border-purple-100 max-w-[90%] text-xs italic leading-relaxed">
                            ${this.escapeHtml(thoughtText)}
                        </div>
                    `, 'flex justify-start w-full gap-3 mb-2');

                } else if (block.type === 'text' || typeof block === 'string') {
                    // Standard text block
                    const text = block.text || block;
                    const htmlContent = window.marked ? marked.parse(text) : this.escapeHtml(text);
                    
                    lastWrapper = appendBlock(`
                        <div class="w-6 h-6 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 mt-0.5">
                            <svg class="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <div class="text-zinc-800 py-0.5 max-w-[90%] text-sm leading-relaxed markdown-body">
                            ${htmlContent}
                        </div>
                    `, 'flex justify-start w-full gap-3');
                }
                // Ignore other block types like tool_use for now, as they are usually followed by tool messages
            });
        }

        setTimeout(() => {
            this.scrollToBottom(lastWrapper);
        }, 10);

        return lastWrapper;
    }

    scrollToBottom(element) {
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (this.chatHistoryEl) {
            this.chatHistoryEl.scrollTo({
                top: this.chatHistoryEl.scrollHeight,
                behavior: 'smooth'
            });
        }
    }

    escapeHtml(text) {
        if (!text) return text;
        // Basic check if it's an object/string
        let str = text;
        if (typeof text !== 'string') {
            try {
                str = JSON.stringify(text, null, 2);
            } catch (e) {
                str = String(text);
            }
        }
        
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}