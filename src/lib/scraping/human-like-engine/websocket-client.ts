// websocket-client.ts
// WebSocket client for real-time scraping updates

import React from 'react';

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface ScrapingProgress {
  sessionId: string;
  timestamp: number;
  message: string;
  progress: {
    listingsScraped: number;
    pagesVisited: number;
    errors: number;
    startTime: number;
    estimatedCompletion: Date | null;
  };
  metrics: {
    listingsPerMinute: number;
    successRate: number;
    averageDelay: number;
  };
}

export class ScrapingWebSocketClient {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts: number = 0;
  private listeners: Map<string, Set<Function>> = new Map();
  private isConnected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      ...config
    };
  }

  // Connect to WebSocket server
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected:', this.config.url);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.isConnected = false;
          this.emit('disconnected');
          this.attemptReconnect();
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  // Handle incoming messages
  private handleMessage(data: any) {
    switch (data.type) {
      case 'scraping_progress':
        this.emit('progress', data.data as ScrapingProgress);
        break;
      
      case 'metrics_update':
        this.emit('metrics', data.data);
        break;
      
      case 'alert':
        this.emit('alert', data.data);
        break;
      
      case 'status_change':
        this.emit('statusChange', data.data);
        break;
      
      case 'error':
        this.emit('error', data.data);
        break;
      
      default:
        this.emit('message', data);
    }
  }

  // Send message to server
  send(type: string, data: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, queuing message');
      return;
    }

    this.ws.send(JSON.stringify({ type, data, timestamp: Date.now() }));
  }

  // Subscribe to scraping session updates
  subscribeToSession(sessionId: string) {
    this.send('subscribe', { sessionId });
  }

  // Unsubscribe from session
  unsubscribeFromSession(sessionId: string) {
    this.send('unsubscribe', { sessionId });
  }

  // Send command to scraping engine
  sendCommand(sessionId: string, command: string, params?: any) {
    this.send('command', { sessionId, command, params });
  }

  // Event handling
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  private emit(event: string, data?: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Reconnection logic
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      console.error('Max reconnection attempts reached');
      this.emit('reconnectFailed');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, this.config.reconnectInterval);
  }

  // Disconnect
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.listeners.clear();
  }

  // Get connection status
  getStatus() {
    return {
      connected: this.isConnected,
      url: this.config.url,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// React hook for WebSocket
export function useScrapingWebSocket(url: string) {
  const [client, setClient] = React.useState<ScrapingWebSocketClient | null>(null);
  const [connected, setConnected] = React.useState(false);
  const [progress, setProgress] = React.useState<ScrapingProgress | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const wsClient = new ScrapingWebSocketClient({ url });

    wsClient.on('connected', () => setConnected(true));
    wsClient.on('disconnected', () => setConnected(false));
    wsClient.on('progress', (data: ScrapingProgress) => setProgress(data));
    wsClient.on('error', (err: any) => setError(err.message || 'WebSocket error'));

    wsClient.connect().catch(err => {
      console.error('Failed to connect WebSocket:', err);
      setError('Failed to connect to real-time updates');
    });

    setClient(wsClient);

    return () => {
      wsClient.disconnect();
    };
  }, [url]);

  return {
    client,
    connected,
    progress,
    error,
    subscribeToSession: (sessionId: string) => client?.subscribeToSession(sessionId),
    sendCommand: (sessionId: string, command: string, params?: any) => 
      client?.sendCommand(sessionId, command, params)
  };
}

// Singleton instance for global use
let globalClient: ScrapingWebSocketClient | null = null;

export function getWebSocketClient(url?: string): ScrapingWebSocketClient {
  if (!globalClient && url) {
    globalClient = new ScrapingWebSocketClient({ url });
    globalClient.connect().catch(console.error);
  }
  
  if (!globalClient) {
    throw new Error('WebSocket client not initialized');
  }
  
  return globalClient;
}

export function closeWebSocketClient() {
  if (globalClient) {
    globalClient.disconnect();
    globalClient = null;
  }
}