// control-panel.js - Client-side control panel logic

// Initialize WebSocket connection
const socket = io();

// State management
const state = {
    connected: false,
    systemStatus: {},
    metrics: {},
    tasks: [],
    activities: [],
    currentPreset: 'balanced'
};

// DOM elements
const elements = {
    systemStatus: document.getElementById('systemStatus'),
    databaseStatus: document.getElementById('databaseStatus'),
    proxiesStatus: document.getElementById('proxiesStatus'),
    collectionStatus: document.getElementById('collectionStatus'),
    actionsGrid: document.getElementById('actionsGrid'),
    presetsGrid: document.getElementById('presetsGrid'),
    tasksList: document.getElementById('tasksList'),
    activityLog: document.getElementById('activityLog'),
    successRateMetric: document.getElementById('successRateMetric'),
    activeSessionsMetric: document.getElementById('activeSessionsMetric'),
    dataExtractedMetric: document.getElementById('dataExtractedMetric'),
    avgResponseMetric: document.getElementById('avgResponseMetric'),
    uptimeValue: document.getElementById('uptimeValue'),
    lastUpdateValue: document.getElementById('lastUpdateValue')
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initializeSocketHandlers();
    loadQuickActions();
    loadPresets();
    startUptimeCounter();
});

// Socket.IO event handlers
function initializeSocketHandlers() {
    socket.on('connect', () => {
        state.connected = true;
        showNotification('Connected to control panel', 'success');
        updateConnectionStatus('online');
    });

    socket.on('disconnect', () => {
        state.connected = false;
        showNotification('Disconnected from control panel', 'error');
        updateConnectionStatus('offline');
    });

    socket.on('state', (data) => {
        state.systemStatus = data;
        updateUI();
    });

    socket.on('indicators', (indicators) => {
        updateStatusIndicators(indicators);
    });

    socket.on('metrics', (metrics) => {
        state.metrics = metrics;
        updateMetrics(metrics);
    });

    socket.on('task_update', (task) => {
        updateTask(task);
    });

    socket.on('activity', (activity) => {
        addActivity(activity);
    });

    socket.on('execution_result', (result) => {
        handleExecutionResult(result);
    });

    socket.on('error', (error) => {
        showNotification(error.message, 'error');
    });
}

// Load quick actions
async function loadQuickActions() {
    try {
        const response = await fetch('/api/actions');
        const actions = await response.json();
        renderQuickActions(actions);
    } catch (error) {
        console.error('Failed to load actions:', error);
    }
}

// Render quick actions
function renderQuickActions(actions) {
    elements.actionsGrid.innerHTML = actions.map(action => `
        <div class="action-button ${action.color}" onclick="executeAction('${action.id}', ${action.confirmation})">
            <div class="action-icon">${action.icon}</div>
            <div class="action-name">${action.name}</div>
        </div>
    `).join('');
}

// Load presets
async function loadPresets() {
    try {
        const response = await fetch('/api/presets');
        const presets = await response.json();
        renderPresets(presets);
    } catch (error) {
        console.error('Failed to load presets:', error);
    }
}

// Render presets
function renderPresets(presets) {
    elements.presetsGrid.innerHTML = presets.map(preset => `
        <div class="preset-card ${preset.id === state.currentPreset ? 'active' : ''}" 
             onclick="applyPreset('${preset.id}')"
             id="preset-${preset.id}">
            <div class="preset-name">${preset.name}</div>
            <div class="preset-description">${preset.description}</div>
            ${preset.settings && Object.keys(preset.settings).length > 0 ? `
                <div class="preset-settings">
                    ${Object.entries(preset.settings).map(([key, value]) => 
                        `<span class="preset-setting">${key}: ${value}</span>`
                    ).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Execute action
async function executeAction(actionId, requireConfirmation = false) {
    if (requireConfirmation) {
        showConfirmation(
            'Confirm Action',
            'Are you sure you want to execute this action?',
            () => performAction(actionId)
        );
        return;
    }

    // Handle actions that need parameters
    switch (actionId) {
        case 'quick_scan':
            openModal('quickScanModal');
            break;
        case 'batch_import':
            openModal('batchImportModal');
            break;
        case 'export_data':
            openModal('exportModal');
            break;
        default:
            performAction(actionId);
    }
}

// Perform action
async function performAction(actionId, params = {}) {
    try {
        showNotification('Executing action...', 'info');
        
        const response = await fetch('/api/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actionId, params })
        });

        const result = await response.json();
        
        if (result.success) {
            showNotification(result.result.message || 'Action executed successfully', 'success');
        } else {
            showNotification(result.error || 'Action failed', 'error');
        }
    } catch (error) {
        showNotification('Failed to execute action', 'error');
        console.error('Action execution error:', error);
    }
}

// Apply preset
async function applyPreset(presetId) {
    try {
        const response = await fetch('/api/preset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ presetId })
        });

        const result = await response.json();
        
        if (result.success) {
            state.currentPreset = presetId;
            updatePresetUI(presetId);
            showNotification(`Applied ${presetId} preset`, 'success');
            
            if (presetId === 'custom') {
                document.getElementById('customSettings').style.display = 'block';
            } else {
                document.getElementById('customSettings').style.display = 'none';
            }
        }
    } catch (error) {
        showNotification('Failed to apply preset', 'error');
    }
}

// Update preset UI
function updatePresetUI(activePresetId) {
    document.querySelectorAll('.preset-card').forEach(card => {
        card.classList.remove('active');
    });
    document.getElementById(`preset-${activePresetId}`).classList.add('active');
}

// Apply custom settings
async function applyCustomSettings() {
    const settings = {
        concurrency: parseInt(document.getElementById('concurrencyInput').value),
        requestDelay: parseInt(document.getElementById('requestDelayInput').value),
        proxyType: document.getElementById('proxyTypeSelect').value,
        behaviorProfile: document.getElementById('behaviorProfileSelect').value
    };

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings })
        });

        const result = await response.json();
        
        if (result.success) {
            showNotification('Custom settings applied', 'success');
        } else {
            showNotification(result.error || 'Failed to apply settings', 'error');
        }
    } catch (error) {
        showNotification('Failed to apply settings', 'error');
    }
}

// Update status indicators
function updateStatusIndicators(indicators) {
    if (indicators.system) {
        updateIndicator('systemStatus', indicators.system);
    }
    if (indicators.database) {
        updateIndicator('databaseStatus', indicators.database);
    }
    if (indicators.proxies) {
        updateIndicator('proxiesStatus', indicators.proxies);
    }
    if (indicators.collection) {
        updateIndicator('collectionStatus', indicators.collection);
    }
}

// Update individual indicator
function updateIndicator(elementId, status) {
    const element = elements[elementId];
    if (!element) return;

    // Remove all status classes
    element.classList.remove('online', 'offline', 'connected', 'disconnected', 
                           'healthy', 'degraded', 'running', 'stopped', 'unknown');
    
    // Add new status class
    element.classList.add(status);
    
    // Update status text
    const statusValue = element.querySelector('.status-value');
    if (statusValue) {
        statusValue.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    }
}

// Update metrics
function updateMetrics(metrics) {
    if (metrics.successRate !== undefined) {
        elements.successRateMetric.textContent = `${Math.round(metrics.successRate)}%`;
    }
    if (metrics.activeSessions !== undefined) {
        elements.activeSessionsMetric.textContent = metrics.activeSessions;
    }
    if (metrics.dataExtracted !== undefined) {
        elements.dataExtractedMetric.textContent = formatNumber(metrics.dataExtracted);
    }
    if (metrics.avgResponseTime !== undefined) {
        elements.avgResponseMetric.textContent = `${Math.round(metrics.avgResponseTime)}ms`;
    }
    
    elements.lastUpdateValue.textContent = new Date().toLocaleTimeString();
}

// Update task in list
function updateTask(task) {
    let taskIndex = state.tasks.findIndex(t => t.id === task.id);
    
    if (taskIndex === -1) {
        state.tasks.unshift(task);
    } else {
        state.tasks[taskIndex] = task;
    }
    
    renderTasks();
}

// Render tasks
function renderTasks() {
    if (state.tasks.length === 0) {
        elements.tasksList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📋</span>
                <p>No tasks in queue</p>
            </div>
        `;
        return;
    }

    elements.tasksList.innerHTML = state.tasks
        .slice(0, 20) // Show last 20 tasks
        .map(task => `
            <div class="task-item">
                <div class="task-info">
                    <div class="task-type">${task.type}</div>
                    <div class="task-details">${getTaskDetails(task)}</div>
                </div>
                <div class="task-status">
                    <span class="task-badge ${task.status}">${task.status}</span>
                    ${task.status === 'queued' || task.status === 'running' ? `
                        <button class="btn-icon" onclick="cancelTask('${task.id}')">❌</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
}

// Get task details string
function getTaskDetails(task) {
    switch (task.type) {
        case 'scan':
            return `URL: ${task.url}`;
        case 'batch':
            return `URLs: ${task.urlCount || task.urls?.length || 0}`;
        default:
            return task.description || '';
    }
}

// Cancel task
async function cancelTask(taskId) {
    try {
        const response = await fetch(`/api/task/${taskId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        
        if (result.success) {
            showNotification('Task cancelled', 'success');
        }
    } catch (error) {
        showNotification('Failed to cancel task', 'error');
    }
}

// Clear completed tasks
function clearCompletedTasks() {
    state.tasks = state.tasks.filter(task => 
        task.status !== 'completed' && task.status !== 'failed' && task.status !== 'cancelled'
    );
    renderTasks();
    showNotification('Completed tasks cleared', 'success');
}

// Add activity
function addActivity(activity) {
    state.activities.unshift({
        ...activity,
        timestamp: activity.timestamp || Date.now()
    });
    
    // Keep only recent activities
    state.activities = state.activities.slice(0, 50);
    
    renderActivities();
}

// Render activities
function renderActivities() {
    elements.activityLog.innerHTML = state.activities
        .map(activity => {
            const time = new Date(activity.timestamp).toLocaleTimeString();
            const icon = getActivityIcon(activity.type);
            const message = getActivityMessage(activity);
            
            return `
                <div class="activity-item">
                    <span class="activity-time">${time}</span>
                    <span class="activity-icon">${icon}</span>
                    <span class="activity-message">${message}</span>
                </div>
            `;
        }).join('');
}

// Get activity icon
function getActivityIcon(type) {
    const icons = {
        action: '⚡',
        config: '⚙️',
        error: '❌',
        maintenance: '🔧',
        info: 'ℹ️'
    };
    return icons[type] || '📌';
}

// Get activity message
function getActivityMessage(activity) {
    switch (activity.type) {
        case 'action':
            return `Executed action: ${activity.action}`;
        case 'config':
            return `Configuration changed: ${activity.action}`;
        case 'error':
            return `Error: ${activity.message}`;
        default:
            return activity.message || activity.action || 'Activity';
    }
}

// Handle execution result
function handleExecutionResult(result) {
    if (result.success) {
        showNotification(`Action completed: ${result.result?.message || 'Success'}`, 'success');
    } else {
        showNotification(`Action failed: ${result.error}`, 'error');
    }
}

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Execute quick scan
async function executeQuickScan() {
    const url = document.getElementById('quickScanUrl').value;
    if (!url) {
        showNotification('Please enter a URL', 'warning');
        return;
    }

    await performAction('quick_scan', { url });
    closeModal('quickScanModal');
    document.getElementById('quickScanUrl').value = '';
}

// Execute batch import
async function executeBatchImport() {
    const fileInput = document.getElementById('batchImportFile');
    const textInput = document.getElementById('batchImportText');
    
    let content = '';
    
    if (fileInput.files.length > 0) {
        content = await readFile(fileInput.files[0]);
    } else if (textInput.value) {
        content = textInput.value;
    } else {
        showNotification('Please provide URLs', 'warning');
        return;
    }

    await performAction('batch_import', { file: content });
    closeModal('batchImportModal');
    fileInput.value = '';
    textInput.value = '';
}

// Execute export
async function executeExport() {
    const format = document.getElementById('exportFormat').value;
    const range = document.getElementById('exportRange').value;
    
    await performAction('export_data', { format, range });
    closeModal('exportModal');
}

// Read file
function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

// Export activity log
async function exportActivityLog() {
    const activities = state.activities.map(a => ({
        timestamp: new Date(a.timestamp).toISOString(),
        type: a.type,
        message: getActivityMessage(a)
    }));
    
    const csv = [
        'Timestamp,Type,Message',
        ...activities.map(a => `"${a.timestamp}","${a.type}","${a.message}"`)
    ].join('\n');
    
    downloadFile('activity-log.csv', csv, 'text/csv');
}

// Download file
function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Show notification
function showNotification(message, type = 'info') {
    const toast = document.getElementById('notificationToast');
    const messageEl = document.getElementById('notificationMessage');
    
    // Set message and type
    messageEl.textContent = message;
    toast.className = `notification-toast ${type}`;
    
    // Show toast
    toast.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Show confirmation dialog
function showConfirmation(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    
    const confirmButton = document.getElementById('confirmButton');
    confirmButton.onclick = () => {
        onConfirm();
        closeModal('confirmModal');
    };
    
    openModal('confirmModal');
}

// Update connection status
function updateConnectionStatus(status) {
    updateIndicator('systemStatus', status);
}

// Update UI
function updateUI() {
    if (state.systemStatus.isRunning !== undefined) {
        updateIndicator('collectionStatus', state.systemStatus.isRunning ? 'running' : 'stopped');
    }
    
    if (state.systemStatus.activeSessions !== undefined) {
        elements.activeSessionsMetric.textContent = state.systemStatus.activeSessions;
    }
    
    if (state.systemStatus.tasksQueue) {
        state.tasks = state.systemStatus.tasksQueue;
        renderTasks();
    }
    
    if (state.systemStatus.recentActivities) {
        state.activities = state.systemStatus.recentActivities;
        renderActivities();
    }
}

// Format number
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Start uptime counter
function startUptimeCounter() {
    let startTime = Date.now();
    
    setInterval(() => {
        const uptime = Date.now() - startTime;
        const hours = Math.floor(uptime / 3600000);
        const minutes = Math.floor((uptime % 3600000) / 60000);
        elements.uptimeValue.textContent = `${hours}h ${minutes}m`;
    }, 60000); // Update every minute
}

// Navigation functions
function openDashboard() {
    window.open('/dashboard', '_blank');
}

function openLogs() {
    window.open('/logs', '_blank');
}

function openHelp() {
    showNotification('Help documentation coming soon', 'info');
}