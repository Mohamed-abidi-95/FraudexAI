import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, interval } from 'rxjs';
import { map } from 'rxjs/operators';

// Transaction interface
export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  location: {
    lat: number;
    lng: number;
    city: string;
    country: string;
  };
  timestamp: string;
  riskScore: number;
  aiModel: 'Transformer' | 'Autoencoder' | 'Attention';
  merchant?: string;
  status?: 'confirmed' | 'flagged' | 'investigating' | 'resolved';
}

// Alert interface
export interface Alert {
  id: string;
  transaction: Transaction;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  timestamp: string;
  source?: 'ai' | 'client_reported' | 'manual';
}

// Notification interface for toast/sound alerts
export interface Notification {
  id: string;
  type: 'alert' | 'success' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
}

// Client fraud report interface
export interface ClientFraudReport {
  userId: string;
  description: string;
  suspiciousTransaction?: {
    amount?: number;
    merchant?: string;
    timestamp?: string;
    location?: string;
  };
  reportedAt: string;
}

// Reconstruction error data
export interface ReconstructionError {
  timestamp: string;
  value: number;
  isAnomaly: boolean;
}

// Attention weights data
export interface AttentionWeight {
  feature: string;
  weight: number;
  importance: 'critical' | 'high' | 'medium' | 'low';
}

// Investigation details response
export interface InvestigationDetails {
  userId: string;
  riskScore: number;
  reconstructionErrors: ReconstructionError[];
  attentionWeights: AttentionWeight[];
  transactions: Transaction[];
  modelAnalysis: {
    autoencoder: number;
    attention: number;
    transformer: number;
  };
  anomalyDescription: string;
}

@Injectable({
  providedIn: 'root'
})
export class FraudDataService {
  // Expose alerts$ as public Observable for components to subscribe to
  public alerts$ = new BehaviorSubject<Alert[]>([]);

  // Real-time stream of incoming fraud reports from AI and clients
  public incomingAlerts$ = new BehaviorSubject<Alert[]>([]);

  // Notification system for triggering toasts and sounds
  public notifications$ = new Subject<Notification>();

  private liveAlertInterval: any;

  // Mock data - merchants and cities for simulation
  private merchants = [
    'Amazon', 'Apple Store', 'Uber', 'Starbucks', 'Walmart',
    'Target', 'Whole Foods', 'Best Buy', 'CVS', 'Home Depot',
    'Nike Store', 'Sephora', 'Delta Airlines', 'Holiday Inn', 'McDonald\'s'
  ];

  private cities = [
    { name: 'New York', lat: 40.7128, lng: -74.0060, country: 'USA' },
    { name: 'London', lat: 51.5074, lng: -0.1278, country: 'UK' },
    { name: 'Paris', lat: 48.8566, lng: 2.3522, country: 'France' },
    { name: 'Tokyo', lat: 35.6762, lng: 139.6503, country: 'Japan' },
    { name: 'Sydney', lat: -33.8688, lng: 151.2093, country: 'Australia' },
    { name: 'Dubai', lat: 25.2048, lng: 55.2708, country: 'UAE' },
    { name: 'Singapore', lat: 1.3521, lng: 103.8198, country: 'Singapore' },
    { name: 'Hong Kong', lat: 22.3193, lng: 114.1694, country: 'Hong Kong' },
    { name: 'Toronto', lat: 43.6532, lng: -79.3832, country: 'Canada' },
    { name: 'Mexico City', lat: 19.4326, lng: -99.1332, country: 'Mexico' }
  ];

  private aiModels: Array<'Transformer' | 'Autoencoder' | 'Attention'> = ['Transformer', 'Autoencoder', 'Attention'];

  constructor() {
    // Initialize with sample alerts
    this.initializeAlerts();
  }

  /**
   * Initialize the service with some sample alerts
   */
  private initializeAlerts(): void {
    const initialAlerts: Alert[] = [
      {
        id: 'ALERT-001',
        transaction: {
          id: 'TXN-001',
          userId: 'USER-4829',
          amount: 2450.00,
          location: {
            lat: 48.8566,
            lng: 2.3522,
            city: 'Paris',
            country: 'France'
          },
          timestamp: '2024-04-08 08:15',
          riskScore: 94,
          aiModel: 'Transformer',
          merchant: 'Air France',
          status: 'investigating'
        },
        priority: 'high',
        reason: 'Suspicious international transaction',
        timestamp: '2024-04-08 08:15'
      },
      {
        id: 'ALERT-002',
        transaction: {
          id: 'TXN-002',
          userId: 'USER-5134',
          amount: 1876.00,
          location: {
            lat: 40.7128,
            lng: -74.0060,
            city: 'New York',
            country: 'USA'
          },
          timestamp: '2024-04-08 18:20',
          riskScore: 76,
          aiModel: 'Attention',
          merchant: 'Luxury Hotel Manhattan',
          status: 'investigating'
        },
        priority: 'high',
        reason: 'Multiple rapid card-present transactions',
        timestamp: '2024-04-08 18:20'
      },
      {
        id: 'ALERT-003',
        transaction: {
          id: 'TXN-003',
          userId: 'USER-3827',
          amount: 234.75,
          location: {
            lat: 35.6762,
            lng: 139.6503,
            city: 'Tokyo',
            country: 'Japan'
          },
          timestamp: '2024-04-08 20:00',
          riskScore: 62,
          aiModel: 'Autoencoder',
          merchant: 'Restaurant NYC',
          status: 'flagged'
        },
        priority: 'medium',
        reason: 'Unusual spending pattern detected',
        timestamp: '2024-04-08 20:00'
      }
    ];

    this.alerts$.next(initialAlerts);
  }

  /**
   * Get all active alerts as an Observable
   */
  getAlerts(): Observable<Alert[]> {
    return this.alerts$.asObservable();
  }

  /**
   * Get the current alerts value
   */
  getAlertsValue(): Alert[] {
    return this.alerts$.value;
  }

  /**
   * Get investigation details for a specific user
   */
  getInvestigationDetails(userId: string): InvestigationDetails {
    // Generate mock forensic data based on userId
    const seed = userId.charCodeAt(userId.length - 1);

    // Generate reconstruction error data
    const reconstructionErrors: ReconstructionError[] = [];
    for (let i = 0; i < 12; i++) {
      const baseValue = 10 + (seed % 10);
      const spike = i >= 7 && i <= 10 ? 35 + (seed % 20) : baseValue + (Math.random() * 10);
      reconstructionErrors.push({
        timestamp: new Date(Date.now() - (12 - i) * 60000).toISOString(),
        value: spike,
        isAnomaly: i >= 7 && i <= 10
      });
    }

    // Generate attention weights
    const attentionWeights: AttentionWeight[] = [
      { feature: 'Location', weight: 0.95, importance: 'critical' },
      { feature: 'Amount', weight: 0.88, importance: 'critical' },
      { feature: 'Time Delta', weight: 0.92, importance: 'critical' },
      { feature: 'MCC Code', weight: 0.75, importance: 'high' },
      { feature: 'Card Type', weight: 0.60, importance: 'medium' },
      { feature: 'Velocity', weight: 0.96, importance: 'critical' }
    ];

    // Generate model scores
    const modelAnalysis = {
      autoencoder: 68 + (seed % 20),
      attention: 82 + (seed % 15),
      transformer: 91 + (seed % 8)
    };

    return {
      userId,
      riskScore: 92,
      reconstructionErrors,
      attentionWeights,
      transactions: this.generateUserTransactions(userId),
      modelAnalysis,
      anomalyDescription: `Impossible travel detected: User ${userId} traveled from Paris to New York in 7 hours. Multiple high-value luxury transactions detected within 24 hours outside normal spending patterns.`
    };
  }

  /**
   * Generate mock transactions for a user
   */
  private generateUserTransactions(userId: string): Transaction[] {
    return [
      {
        id: 'TXN-U' + userId + '-001',
        userId,
        amount: 45.99,
        location: {
          lat: 48.8566,
          lng: 2.3522,
          city: 'Paris',
          country: 'France'
        },
        timestamp: '2024-04-08 08:15',
        riskScore: 12,
        aiModel: 'Transformer',
        merchant: 'Cafe Lumiere'
      },
      {
        id: 'TXN-U' + userId + '-002',
        userId,
        amount: 2450.00,
        location: {
          lat: 48.8566,
          lng: 2.3522,
          city: 'Paris',
          country: 'France'
        },
        timestamp: '2024-04-08 10:30',
        riskScore: 28,
        aiModel: 'Attention',
        merchant: 'Air France'
      },
      {
        id: 'TXN-U' + userId + '-003',
        userId,
        amount: 89.50,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          city: 'New York',
          country: 'USA'
        },
        timestamp: '2024-04-08 17:45',
        riskScore: 78,
        aiModel: 'Transformer',
        merchant: 'JFK Airport'
      },
      {
        id: 'TXN-U' + userId + '-004',
        userId,
        amount: 1876.00,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          city: 'New York',
          country: 'USA'
        },
        timestamp: '2024-04-08 18:20',
        riskScore: 88,
        aiModel: 'Transformer',
        merchant: 'Luxury Hotel Manhattan'
      },
      {
        id: 'TXN-U' + userId + '-005',
        userId,
        amount: 234.75,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          city: 'New York',
          country: 'USA'
        },
        timestamp: '2024-04-08 20:00',
        riskScore: 65,
        aiModel: 'Attention',
        merchant: 'Restaurant NYC'
      },
      {
        id: 'TXN-U' + userId + '-006',
        userId,
        amount: 3400.00,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          city: 'New York',
          country: 'USA'
        },
        timestamp: '2024-04-08 21:30',
        riskScore: 94,
        aiModel: 'Transformer',
        merchant: 'High-End Boutique'
      }
    ];
  }

  /**
   * Simulate a new live alert every 10 seconds
   * Call stopLiveAlertSimulation() to stop the stream
   */
  simulateLiveAlert(): void {
    // Clear any existing interval
    if (this.liveAlertInterval) {
      clearInterval(this.liveAlertInterval);
    }

    // Generate a new alert every 10 seconds
    this.liveAlertInterval = setInterval(() => {
      const newTransaction: Transaction = this.generateRandomTransaction();
      const newAlert: Alert = {
        id: 'ALERT-SIM-' + Date.now(),
        transaction: newTransaction,
        priority: newTransaction.riskScore > 80 ? 'high' : newTransaction.riskScore > 50 ? 'medium' : 'low',
        reason: this.generateAlertReason(newTransaction.riskScore),
        timestamp: newTransaction.timestamp
      };

      // Add the new alert to the current alerts
      const currentAlerts = this.alerts$.value;
      const updatedAlerts = [newAlert, ...currentAlerts.slice(0, 9)]; // Keep last 10 alerts
      this.alerts$.next(updatedAlerts);

      console.log('New simulated alert:', newAlert);
    }, 10000);
  }

  /**
   * Stop the live alert simulation
   */
  stopLiveAlertSimulation(): void {
    if (this.liveAlertInterval) {
      clearInterval(this.liveAlertInterval);
      this.liveAlertInterval = null;
    }
  }

  /**
   * Generate a random transaction for simulation
   */
  private generateRandomTransaction(): Transaction {
    const userId = `USER-${Math.floor(Math.random() * 9999)}`;
    const merchant = this.merchants[Math.floor(Math.random() * this.merchants.length)];
    const city = this.cities[Math.floor(Math.random() * this.cities.length)];
    const aiModel = this.aiModels[Math.floor(Math.random() * this.aiModels.length)];
    const amount = Math.floor(Math.random() * 5000) + 10;
    const riskScore = Math.floor(Math.random() * 100);

    return {
      id: 'TXN-' + Date.now(),
      userId,
      amount,
      location: {
        lat: city.lat,
        lng: city.lng,
        city: city.name,
        country: city.country
      },
      timestamp: new Date().toLocaleString(),
      riskScore,
      aiModel,
      merchant,
      status: 'flagged'
    };
  }

  /**
   * Generate alert reason based on risk score
   */
  private generateAlertReason(riskScore: number): string {
    const reasons = [
      'Unusual transaction amount detected',
      'Geographic anomaly detected',
      'High velocity transaction detected',
      'Merchant mismatch detected',
      'Time pattern anomaly',
      'Card-not-present followed by card-present',
      'Unusual spending pattern detected',
      'Cross-border transaction flagged',
      'Large transaction outside profile',
      'Multiple transactions in short time'
    ];

    if (riskScore > 80) {
      return 'Critical: ' + reasons[Math.floor(Math.random() * reasons.length)];
    } else if (riskScore > 50) {
      return 'Medium: ' + reasons[Math.floor(Math.random() * reasons.length)];
    } else {
      return 'Low: ' + reasons[Math.floor(Math.random() * reasons.length)];
    }
  }

  /**
   * Confirm fraud for a transaction
   */
  confirmFraud(alertId: string): void {
    const currentAlerts = this.alerts$.value;
    const updatedAlerts = currentAlerts.map(alert => {
      if (alert.id === alertId) {
        return {
          ...alert,
          transaction: {
            ...alert.transaction,
            status: 'confirmed' as const
          }
        };
      }
      return alert;
    });
    this.alerts$.next(updatedAlerts);
  }

  /**
   * Mark alert as false positive
   */
  markFalsePositive(alertId: string): void {
    const currentAlerts = this.alerts$.value;
    const updatedAlerts = currentAlerts.map(alert => {
      if (alert.id === alertId) {
        return {
          ...alert,
          transaction: {
            ...alert.transaction,
            status: 'resolved' as const
          }
        };
      }
      return alert;
    });
    this.alerts$.next(updatedAlerts);
  }

  /**
   * Get alert by ID
   */
  getAlertById(alertId: string): Alert | undefined {
    return this.alerts$.value.find(alert => alert.id === alertId);
  }

  /**
   * Get alerts for a specific user
   */
  getAlertsByUserId(userId: string): Alert[] {
    return this.alerts$.value.filter(alert => alert.transaction.userId === userId);
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts$.next([]);
  }

  /**
   * Get live alerts stream for real-time admin dashboard
   * Combines AI-generated and client-reported fraud alerts
   */
  getLiveAlerts(): Observable<Alert[]> {
    return this.incomingAlerts$.asObservable();
  }

  /**
   * Report fraud from a client
   * Creates a high-priority alert with 'Client Reported' source
   * Automatically triggers notification system
   */
  reportClientFraud(details: ClientFraudReport): void {
    // Create alert ID
    const alertId = `ALERT-CLIENT-${Date.now()}`;

    // Generate a transaction from the report details
    const reportedTransaction: Transaction = {
      id: `TXN-CLIENT-${Date.now()}`,
      userId: details.userId,
      amount: details.suspiciousTransaction?.amount || 0,
      location: {
        lat: 0,
        lng: 0,
        city: details.suspiciousTransaction?.location || 'Unknown',
        country: 'Unknown'
      },
      timestamp: details.suspiciousTransaction?.timestamp || new Date().toISOString(),
      riskScore: 95, // High risk for client report
      aiModel: 'Transformer',
      merchant: details.suspiciousTransaction?.merchant || 'Unknown Merchant',
      status: 'flagged'
    };

    // Create the alert
    const clientAlert: Alert = {
      id: alertId,
      transaction: reportedTransaction,
      priority: 'high',
      reason: `[Client Reported] ${details.description}`,
      timestamp: new Date().toISOString(),
      source: 'client_reported'
    };

    // Add to incoming alerts stream
    const currentIncoming = this.incomingAlerts$.value;
    this.incomingAlerts$.next([clientAlert, ...currentIncoming]);

    // Also add to main alerts stream for visibility
    const currentAlerts = this.alerts$.value;
    this.alerts$.next([clientAlert, ...currentAlerts]);

    // Trigger notification
    this.emitNotification({
      id: alertId,
      type: 'alert',
      title: '🚨 Client Fraud Report Received',
      message: `${details.userId} reported suspicious activity: ${details.description}`,
      timestamp: new Date().toISOString(),
      priority: 'high'
    });

    // Log the report
    console.log('[CLIENT FRAUD REPORT]', {
      timestamp: new Date().toISOString(),
      userId: details.userId,
      description: details.description,
      details: details.suspiciousTransaction
    });
  }

  /**
   * Emit notification for toast/sound alerts
   * Subscribes can listen for real-time notifications
   */
  private emitNotification(notification: Notification): void {
    this.notifications$.next(notification);

    // Play notification sound if available
    this.playNotificationSound();

    // Auto-dismiss notifications after 10 seconds (can be overridden by consumers)
    setTimeout(() => {
      // Notification will be handled by consumer components
    }, 10000);
  }

  /**
   * Play notification sound for high-priority alerts
   * Uses Web Audio API or HTML5 audio element
   */
  private playNotificationSound(): void {
    try {
      // Try to play a simple beep using Web Audio API
      const audioContext = new (window as any).AudioContext || new (window as any).webkitAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // High-pitched beep for alert
      oscillator.frequency.value = 1000;
      oscillator.type = 'sine';

      // Short duration beep
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Audio notification not available:', error);
      // Fallback: just log or use visual notification
    }
  }

  /**
   * Get all notifications as observable
   * Components can subscribe to display toast notifications
   */
  getNotifications(): Observable<Notification> {
    return this.notifications$.asObservable();
  }

  /**
   * Get incoming alerts count
   */
  getIncomingAlertsCount(): number {
    return this.incomingAlerts$.value.length;
  }
}
