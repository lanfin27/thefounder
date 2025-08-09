// dashboard.js - Dashboard Client Logic

class Dashboard {
    constructor() {
        this.ws = null;
        this.charts = {};
        this.metrics = {};
        this.isConnected = false;
        this.isPaused = false;
        this.reconnectInterval = null;
        
        this.init();
    }

    init() {
        this.setupWebSocket();
        this.setupEventListeners();
        this.initializeCharts();
    }

    setupWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.hostname}:3001`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('Connected to dashboard server');
            this.isConnected = true;
            this.updateConnectionStatus(true);
            
            // Subscribe to all updates
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                channels: ['all']
            }));
            
            // Clear reconnect interval
            if (this.reconnectInterval) {
                clearInterval(this.reconnectInterval);
                this.reconnectInterval = null;
            }
        };
        
        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
        };
        
        this.ws.onclose = () => {
            console.log('Disconnected from dashboard server');
            this.isConnected = false;
            this.updateConnectionStatus(false);
            
            // Attempt to reconnect
            this.attemptReconnect();
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    attemptReconnect() {
        if (!this.reconnectInterval) {
            this.reconnectInterval = setInterval(() => {
                console.log('Attempting to reconnect...');
                this.setupWebSocket();
            }, 5000);
        }
    }

    handleMessage(message) {
        switch (message.type) {
            case 'initial':
                this.handleInitialData(message.data);
                break;
                
            case 'metrics':
                this.updateMetrics(message.data);
                break;
                
            case 'strategy':
                this.updateStrategy(message.data);
                break;
                
            case 'health':
                this.updateHealth(message.data);
                break;
                
            case 'alert':
                this.handleAlert(message.data);
                break;
                
            case 'session':
                this.handleSessionUpdate(message.data);
                break;
                
            case 'command_result':
                this.handleCommandResult(message);
                break;
        }
    }

    handleInitialData(data) {
        // Update all components with initial data
        this.updateMetrics(data.metrics.current);
        this.updateStrategy(data.strategies);
        this.updateHealth(data.health);
        
        // Load historical data into charts
        this.loadHistoricalData(data.metrics.history);
    }

    updateMetrics(metrics) {
        // Update metric values
        document.getElementById('successRate').textContent = 
            `${(metrics.successRate * 100).toFixed(1)}%`;
        document.getElementById('activeSessions').textContent = 
            metrics.activeSessions;
        document.getElementById('dataExtracted').textContent = 
            this.formatNumber(metrics.dataExtracted);
        document.getElementById('avgResponseTime').textContent = 
            `${Math.round(metrics.avgResponseTime)}ms`;
        
        // Update sparkline charts
        this.updateSparklines(metrics);
        
        // Store metrics
        this.metrics = metrics;
    }

    updateStrategy(strategies) {
        const current = strategies.current;
        
        if (current) {
            document.getElementById('strategyName').textContent = current.name || 'Unknown';
            document.getElementById('strategyReason').textContent = current.reason || '';
            
            const confidence = (current.confidence || 0) * 100;
            document.getElementById('strategyConfidence').style.width = `${confidence}%`;
            document.getElementById('confidenceValue').textContent = `${confidence.toFixed(0)}%`;
        }
        
        // Update adaptation history
        const adaptationList = document.getElementById('adaptationList');
        adaptationList.innerHTML = '';
        
        strategies.history.slice(-5).reverse().forEach(adaptation => {
            const li = document.createElement('li');
            const time = this.formatRelativeTime(adaptation.timestamp);
            li.textContent = `${adaptation.strategy} - ${time}`;
            adaptationList.appendChild(li);
        });
    }

    updateHealth(health) {
        // Update overall status
        const overallStatus = health.status;
        
        // Update component statuses
        Object.entries(health.components).forEach(([component, data]) => {
            const element = document.getElementById(`${component}Health`);
            if (element) {
                element.className = `health-component ${data.status}`;
                element.querySelector('.component-status').textContent = data.status;
            }
        });
        
        // Update alerts list
        this.updateAlertsList(health.alerts);
    }

    updateAlertsList(alerts) {
        const alertsList = document.getElementById('alertsList');
        alertsList.innerHTML = '';
        
        if (alerts.length === 0) {
            alertsList.innerHTML = '<div class="alert-item">No active alerts</div>';
            return;
        }
        
        alerts.filter(a => !a.acknowledged).forEach(alert => {
            const alertElement = this.createAlertElement(alert);
            alertsList.appendChild(alertElement);
        });
    }

    createAlertElement(alert) {
        const div = document.createElement('div');
        div.className = 'alert-item';
        
        div.innerHTML = `
            <div class="alert-content">
                <span class="alert-severity ${alert.severity}">${alert.severity.toUpperCase()}</span>
                <div class="alert-message">${alert.message}</div>
                <div class="alert-time">${this.formatRelativeTime(alert.timestamp)}</div>
            </div>
            <button class="acknowledge-btn" data-alert-id="${alert.id}">Acknowledge</button>
        `;
        
        // Add acknowledge handler
        div.querySelector('.acknowledge-btn').addEventListener('click', (e) => {
            const alertId = e.target.dataset.alertId;
            this.acknowledgeAlert(alertId);
        });
        
        return div;
    }

    acknowledgeAlert(alertId) {
        fetch(`/api/alerts/acknowledge/${alertId}`, { method: 'POST' })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    console.log('Alert acknowledged');
                }
            })
            .catch(error => console.error('Failed to acknowledge alert:', error));
    }

    handleAlert(alert) {
        // Show notification for new alerts
        if (Notification.permission === 'granted') {
            new Notification('Stealth Collection Alert', {
                body: alert.message,
                icon: '/favicon.ico'
            });
        }
        
        // Add to alerts list
        const alertsList = document.getElementById('alertsList');
        const alertElement = this.createAlertElement(alert);
        alertsList.insertBefore(alertElement, alertsList.firstChild);
    }

    initializeCharts() {
        // Chart.js default options
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.borderColor = '#475569';
        
        // Initialize sparkline charts
        this.initializeSparklineChart('successRateChart', 'Success Rate', '#10b981');
        this.initializeSparklineChart('sessionsChart', 'Sessions', '#2563eb');
        this.initializeSparklineChart('dataChart', 'Data', '#f59e0b');
        this.initializeSparklineChart('responseChart', 'Response', '#ef4444');
        
        // Initialize main charts
        this.initializePerformanceChart();
        this.initializeErrorChart();
    }

    initializeSparklineChart(canvasId, label, color) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(20).fill(''),
                datasets: [{
                    label: label,
                    data: Array(20).fill(0),
                    borderColor: color,
                    backgroundColor: color + '20',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
    }

    initializePerformanceChart() {
        const ctx = document.getElementById('performanceChart').getContext('2d');
        
        this.charts.performance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Success Rate',
                        data: [],
                        borderColor: '#10b981',
                        yAxisID: 'y-percentage'
                    },
                    {
                        label: 'Response Time',
                        data: [],
                        borderColor: '#f59e0b',
                        yAxisID: 'y-time'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    'y-percentage': {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Success Rate (%)'
                        },
                        min: 0,
                        max: 100
                    },
                    'y-time': {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Response Time (ms)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    }

    initializeErrorChart() {
        const ctx = document.getElementById('errorChart').getContext('2d');
        
        this.charts.error = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Network', 'Parsing', 'Detection', 'Other'],
                datasets: [{
                    data: [30, 20, 40, 10],
                    backgroundColor: [
                        '#3b82f6',
                        '#10b981',
                        '#f59e0b',
                        '#ef4444'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }

    updateSparklines(metrics) {
        // Update success rate sparkline
        const successChart = this.charts.successRateChart;
        if (successChart) {
            successChart.data.datasets[0].data.shift();
            successChart.data.datasets[0].data.push(metrics.successRate * 100);
            successChart.update('none');
        }
        
        // Update sessions sparkline
        const sessionsChart = this.charts.sessionsChart;
        if (sessionsChart) {
            sessionsChart.data.datasets[0].data.shift();
            sessionsChart.data.datasets[0].data.push(metrics.activeSessions);
            sessionsChart.update('none');
        }
        
        // Update data sparkline
        const dataChart = this.charts.dataChart;
        if (dataChart) {
            dataChart.data.datasets[0].data.shift();
            dataChart.data.datasets[0].data.push(metrics.dataExtracted);
            dataChart.update('none');
        }
        
        // Update response sparkline
        const responseChart = this.charts.responseChart;
        if (responseChart) {
            responseChart.data.datasets[0].data.shift();
            responseChart.data.datasets[0].data.push(metrics.avgResponseTime);
            responseChart.update('none');
        }
    }

    loadHistoricalData(history) {
        if (!history || !history.timestamps) return;
        
        // Update performance chart
        const performanceChart = this.charts.performance;
        if (performanceChart) {
            // Sample data for display (every 10th point)
            const step = Math.max(1, Math.floor(history.timestamps.length / 100));
            
            performanceChart.data.labels = history.timestamps
                .filter((_, i) => i % step === 0)
                .map(ts => new Date(ts).toLocaleTimeString());
                
            performanceChart.data.datasets[0].data = history.successRates
                .filter((_, i) => i % step === 0)
                .map(rate => rate * 100);
                
            performanceChart.data.datasets[1].data = history.responseTimes
                .filter((_, i) => i % step === 0);
                
            performanceChart.update();
        }
    }

    setupEventListeners() {
        // Control buttons
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.togglePause();
        });
        
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.showExportModal();
        });
        
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showSettingsModal();
        });
        
        // Clear alerts
        document.getElementById('clearAlertsBtn').addEventListener('click', () => {
            this.clearAlerts();
        });
        
        // Modal handlers
        this.setupModalHandlers();
        
        // Request notification permission
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    setupModalHandlers() {
        // Settings modal
        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            this.saveSettings();
        });
        
        document.getElementById('cancelSettingsBtn').addEventListener('click', () => {
            this.hideModal('settingsModal');
        });
        
        // Export modal
        document.getElementById('downloadBtn').addEventListener('click', () => {
            this.downloadExport();
        });
        
        document.getElementById('cancelExportBtn').addEventListener('click', () => {
            this.hideModal('exportModal');
        });
        
        // Close modals on background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const btn = document.getElementById('pauseBtn');
        
        if (this.isPaused) {
            btn.textContent = '▶️ Resume';
            this.sendCommand('pause_collection');
        } else {
            btn.textContent = '⏸️ Pause';
            this.sendCommand('resume_collection');
        }
    }

    sendCommand(command, params = {}) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'command',
                command,
                params
            }));
        }
    }

    handleCommandResult(message) {
        if (message.result.success) {
            console.log('Command executed:', message.result.message);
        } else {
            console.error('Command failed:', message.error);
        }
    }

    showExportModal() {
        document.getElementById('exportModal').classList.add('active');
    }

    showSettingsModal() {
        document.getElementById('settingsModal').classList.add('active');
    }

    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    saveSettings() {
        const settings = {
            updateInterval: parseInt(document.getElementById('updateInterval').value),
            maxSessions: parseInt(document.getElementById('maxSessions').value),
            errorThreshold: parseInt(document.getElementById('errorThreshold').value) / 100,
            successThreshold: parseInt(document.getElementById('successThreshold').value) / 100,
            responseThreshold: parseInt(document.getElementById('responseThreshold').value)
        };
        
        // Send updated settings
        this.sendCommand('update_settings', settings);
        
        // Adjust concurrency if changed
        if (settings.maxSessions !== this.metrics.activeSessions) {
            this.sendCommand('adjust_concurrency', { value: settings.maxSessions });
        }
        
        this.hideModal('settingsModal');
    }

    downloadExport() {
        const period = document.getElementById('exportPeriod').value;
        const format = document.getElementById('exportFormat').value;
        
        fetch(`/api/export?period=${period}&format=${format}`)
            .then(response => {
                const contentType = response.headers.get('content-type');
                const filename = `metrics_${Date.now()}.${format}`;
                
                return response.blob().then(blob => ({
                    blob,
                    filename
                }));
            })
            .then(({ blob, filename }) => {
                // Create download link
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            })
            .catch(error => console.error('Export failed:', error));
        
        this.hideModal('exportModal');
    }

    clearAlerts() {
        this.sendCommand('clear_alerts');
    }

    updateConnectionStatus(connected) {
        const indicator = document.getElementById('connectionStatus');
        const text = document.getElementById('connectionText');
        
        if (connected) {
            indicator.classList.add('connected');
            text.textContent = 'Connected';
        } else {
            indicator.classList.remove('connected');
            text.textContent = 'Disconnected';
        }
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    formatRelativeTime(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }
}

// Initialize dashboard
const dashboard = new Dashboard();