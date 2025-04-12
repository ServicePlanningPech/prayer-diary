// Mobile Debug Panel for Prayer Diary
// Activated by 5 two-finger taps anywhere on screen

(function() {
    // Only initialize in mobile environments or if explicitly enabled
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const debugForceEnable = localStorage.getItem('prayerDiaryDebugForceEnable') === 'true';
    
    if (!isMobile && !debugForceEnable) {
        console.log('Debug panel disabled: Not a mobile device. Set localStorage.prayerDiaryDebugForceEnable = true to enable on desktop.');
        return;
    }
    
    // State variables
    let logEntries = [];
    let maxLogEntries = 100;
    let tapCount = 0;
    let lastTapTime = 0;
    let debugPanelVisible = false;
    
    // Create and append the debug panel to the DOM
    function createDebugPanel() {
        const debugPanel = document.createElement('div');
        debugPanel.id = 'mobile-debug-panel';
        debugPanel.innerHTML = `
            <div class="debug-panel-header">
                <div class="debug-panel-title">Debug Console</div>
                <div class="debug-panel-controls">
                    <button id="debug-clear-btn" class="debug-btn">Clear</button>
                    <button id="debug-copy-btn" class="debug-btn">Copy</button>
                    <button id="debug-close-btn" class="debug-btn">Close</button>
                </div>
            </div>
            <div id="debug-log-container"></div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #mobile-debug-panel {
                display: none;
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background-color: rgba(0, 0, 0, 0.85);
                color: #fff;
                font-family: monospace;
                font-size: 12px;
                z-index: 10000;
                max-height: 50vh;
                overflow-y: auto;
                border-top: 2px solid #483D8B;
            }
            
            .debug-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px;
                background-color: #483D8B;
                position: sticky;
                top: 0;
            }
            
            .debug-panel-title {
                font-weight: bold;
            }
            
            .debug-btn {
                background: transparent;
                border: 1px solid #fff;
                color: #fff;
                padding: 2px 8px;
                margin-left: 4px;
                border-radius: 3px;
                font-size: 11px;
            }
            
            #debug-log-container {
                padding: 8px;
                overflow-y: auto;
                max-height: calc(50vh - 40px);
            }
            
            .log-entry {
                margin-bottom: 4px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                padding-bottom: 4px;
                word-break: break-all;
                white-space: pre-wrap;
            }
            
            .log-entry.log { color: #fff; }
            .log-entry.info { color: #4caf50; }
            .log-entry.warn { color: #ffc107; }
            .log-entry.error { color: #f44336; }
            .log-entry.debug { color: #03a9f4; }
        `;
        
        document.body.appendChild(style);
        document.body.appendChild(debugPanel);
        
        // Add event listeners for buttons
        document.getElementById('debug-clear-btn').addEventListener('click', clearLogs);
        document.getElementById('debug-copy-btn').addEventListener('click', copyLogs);
        document.getElementById('debug-close-btn').addEventListener('click', hideDebugPanel);
    }
    
    // Touch event handler for gesture detection
    function handleTouchStart(event) {
        if (event.touches.length === 2) {
            const currentTime = new Date().getTime();
            const timeDiff = currentTime - lastTapTime;
            
            if (timeDiff < 500) { // Detect taps that happen within 500ms
                tapCount++;
                
                if (tapCount >= 5) {
                    tapCount = 0;
                    toggleDebugPanel();
                }
            } else {
                tapCount = 1;
            }
            
            lastTapTime = currentTime;
        }
    }
    
    // Toggle debug panel visibility
    function toggleDebugPanel() {
        const panel = document.getElementById('mobile-debug-panel');
        
        if (!debugPanelVisible) {
            panel.style.display = 'block';
            updateLogDisplay();
        } else {
            panel.style.display = 'none';
        }
        
        debugPanelVisible = !debugPanelVisible;
    }
    
    // Hide debug panel
    function hideDebugPanel() {
        const panel = document.getElementById('mobile-debug-panel');
        panel.style.display = 'none';
        debugPanelVisible = false;
    }
    
    // Clear logs
    function clearLogs() {
        logEntries = [];
        updateLogDisplay();
    }
    
    // Copy logs to clipboard
    function copyLogs() {
        const logText = logEntries.map(entry => `[${entry.type}] ${entry.message}`).join('\n');
        
        // Use modern clipboard API if available
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(logText)
                .then(() => appendToLog('Logs copied to clipboard', 'info'))
                .catch(err => appendToLog('Failed to copy: ' + err, 'error'));
        } else {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = logText;
            textarea.style.position = 'fixed';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    appendToLog('Logs copied to clipboard', 'info');
                } else {
                    appendToLog('Failed to copy logs', 'error');
                }
            } catch (err) {
                appendToLog('Error during copy: ' + err, 'error');
            }
            
            document.body.removeChild(textarea);
        }
    }
    
    // Add a log entry
    function appendToLog(message, type) {
        // Convert non-string messages to string representation
        if (typeof message !== 'string') {
            try {
                message = JSON.stringify(message, getCircularReplacer(), 2);
            } catch (err) {
                message = String(message);
            }
        }
        
        const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
        logEntries.push({ message, type, timestamp });
        
        // Limit the number of entries to prevent memory issues
        if (logEntries.length > maxLogEntries) {
            logEntries.shift();
        }
        
        // Update the display if panel is visible
        if (debugPanelVisible) {
            updateLogDisplay();
        }
    }
    
    // Handle circular references in objects when stringifying
    function getCircularReplacer() {
        const seen = new WeakSet();
        return (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return '[Circular]';
                }
                seen.add(value);
            }
            return value;
        };
    }
    
    // Update the log display
    function updateLogDisplay() {
        const container = document.getElementById('debug-log-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Display the most recent logs at the bottom for easier viewing
        const recentLogs = [...logEntries].reverse();
        
        recentLogs.forEach(entry => {
            const logElement = document.createElement('div');
            logElement.className = `log-entry ${entry.type}`;
            logElement.textContent = `[${entry.timestamp}] ${entry.message}`;
            container.appendChild(logElement);
        });
        
        // Auto-scroll to bottom
        container.scrollTop = container.scrollHeight;
    }
    
    // Override console methods
    function overrideConsole() {
        const originalConsole = {
            log: console.log,
            info: console.info,
            warn: console.warn,
            error: console.error,
            debug: console.debug
        };
        
        // Override each console method
        console.log = function() {
            originalConsole.log.apply(console, arguments);
            appendToLog(Array.from(arguments).join(' '), 'log');
        };
        
        console.info = function() {
            originalConsole.info.apply(console, arguments);
            appendToLog(Array.from(arguments).join(' '), 'info');
        };
        
        console.warn = function() {
            originalConsole.warn.apply(console, arguments);
            appendToLog(Array.from(arguments).join(' '), 'warn');
        };
        
        console.error = function() {
            originalConsole.error.apply(console, arguments);
            appendToLog(Array.from(arguments).join(' '), 'error');
        };
        
        console.debug = function() {
            originalConsole.debug.apply(console, arguments);
            appendToLog(Array.from(arguments).join(' '), 'debug');
        };
    }
    
    // Initialize the debug panel
    function initialize() {
        createDebugPanel();
        overrideConsole();
        
        // Add touch event listener
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        
        console.log('Mobile debug panel initialized - tap with two fingers 5 times to activate');
    }
    
    // Wait for DOM to be fully loaded
    if (document.readyState === "loading") {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();