import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FraudDataService, Alert } from '../../services/fraud-data.service';
import { FraudBridgeService } from '../../services/fraud-bridge.service';
import { SimulationService } from '../../services/simulation.service';

interface AlertItem {
  id: string;
  userId: string;
  riskScore: number;
  modelSource: string;
  priority: 'high' | 'medium' | 'low' | 'critical';
  timestamp: string;
  details: string;
  source?: 'ai' | 'client_reported' | 'manual';
  isNewAlert?: boolean;
}

interface ModelMetric {
  name: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  searchQuery = '';

  // Expose the alerts$ observable directly for use in template with async pipe
  alerts$ = this.fraudDataService.alerts$;

  // Dynamic KPI values calculated from alerts
  alertCount = 0;
  alertsTotal = 0;
  falsePositives = 0;
  precision = 0;
  meanRiskScore = 0;

  // Historical change percentages
  alertsChange = 0;
  falsePositivesChange = 0;
  precisionChange = 0;

  // Model metrics
  modelMetrics: ModelMetric[] = [
    { name: 'Autoencoder', value: 68, color: '#00D9FF' },
    { name: 'Attention', value: 82, color: '#00D9FF' },
    { name: 'Transformer', value: 91, color: '#00D9FF' }
  ];

  // Live alerts feed
  alertsFeed: AlertItem[] = [];

  // Track newly added alerts for animation
  newAlertIds = new Set<string>();

  // Fraud hotspot coordinates for map plotting
  fraudHotspots: Array<{cx: number, cy: number, txnCount: number}> = [];

  // Subscriptions
  private alertsSubscription: Subscription | null = null;
  private incomingAlertsSubscription: Subscription | null = null;
  private pulseInterval: any;

  constructor(
    private router: Router,
    private fraudDataService: FraudDataService,
    private fraudBridgeService: FraudBridgeService,
    private simulationService: SimulationService
  ) {}

  ngOnInit() {
    // Start the AI Simulation Engine
    console.log('[ADMIN DASHBOARD] Starting AI Fraudexia Simulation Engine...');
    this.simulationService.startSimulation();

    // Subscribe to live alerts from the service
    this.alertsSubscription = this.fraudDataService.getAlerts().subscribe(alerts => {
      this.alertCount = alerts.length;
      this.alertsTotal = alerts.length;

      // Convert service alerts to AlertItem format
      this.alertsFeed = alerts.map((alert: Alert) => ({
        id: alert.id,
        userId: alert.transaction.userId,
        riskScore: alert.transaction.riskScore,
        modelSource: alert.transaction.aiModel,
        priority: alert.priority,
        timestamp: this.getTimeAgo(alert.timestamp),
        details: alert.reason,
        source: alert.source,
        isNewAlert: this.newAlertIds.has(alert.id)
      }));

      // Calculate dynamic KPIs
      this.calculateKPIs(alerts);

      // Extract fraud hotspot coordinates from transaction locations
      this.updateFraudHotspots(alerts);

      // Update model metrics based on alerts distribution
      this.updateModelMetrics(alerts);
    });

    // Subscribe to incoming alerts from FraudBridgeService (real-time client reports)
    this.incomingAlertsSubscription = this.fraudBridgeService.getIncomingAlerts().subscribe(
      (incomingAlerts: Alert[]) => {
        if (incomingAlerts.length > 0) {
          const latestAlert = incomingAlerts[0]; // Most recent alert is first

          // Mark as new alert for animation
          this.newAlertIds.add(latestAlert.id);

          // Create AlertItem for the new alert
          const newAlertItem: AlertItem = {
            id: latestAlert.id,
            userId: latestAlert.transaction.userId,
            riskScore: latestAlert.transaction.riskScore,
            modelSource: latestAlert.transaction.aiModel,
            priority: latestAlert.priority,
            timestamp: this.getTimeAgo(latestAlert.timestamp),
            details: latestAlert.reason,
            source: latestAlert.source,
            isNewAlert: true
          };

          // Prepend to alerts feed (new alerts at top)
          this.alertsFeed = [newAlertItem, ...this.alertsFeed.slice(0, 99)];

          // Increment active alerts counter
          this.alertCount++;
          this.alertsTotal++;

          // Trigger red flashing animation for 4 seconds if client-reported
          if (latestAlert.source === 'client_reported') {
            this.triggerClientReportAnimation(latestAlert.id);
          }

          // Trigger browser notification for high-priority client reports
          if (latestAlert.priority === 'high' && latestAlert.source === 'client_reported') {
            this.triggerBrowserNotification(latestAlert);
          }

          // Log the new alert
          console.log('[ADMIN DASHBOARD] New incoming alert received:', latestAlert);
        }
      }
    );

    // Start live alert simulation
    this.fraudDataService.simulateLiveAlert();
    this.startPulseAnimation();
  }

  /**
   * Calculate Key Performance Indicators from alerts
   */
  private calculateKPIs(alerts: Alert[]): void {
    // Calculate mean risk score
    if (alerts.length > 0) {
      const totalRiskScore = alerts.reduce((sum, alert) => sum + alert.transaction.riskScore, 0);
      this.meanRiskScore = Math.round(totalRiskScore / alerts.length);
    } else {
      this.meanRiskScore = 0;
    }

    // Calculate false positives (alerts with low risk that were flagged)
    const lowRiskAlerts = alerts.filter(a => a.transaction.riskScore < 30 && a.priority === 'low');
    this.falsePositives = lowRiskAlerts.length > 0 ? Math.round((lowRiskAlerts.length / alerts.length) * 100) : 0;

    // Calculate precision (confirmed alerts / total alerts)
    const confirmedAlerts = alerts.filter(a => a.priority === 'high' && a.transaction.riskScore > 70);
    this.precision = alerts.length > 0 ? Math.round((confirmedAlerts.length / alerts.length) * 100) : 0;

    // Set dynamic change percentages
    this.alertsChange = Math.floor(Math.random() * 30) - 5; // Random change -5 to +25
    this.falsePositivesChange = Math.floor(Math.random() * 4) - 2; // Random change -2 to +2
    this.precisionChange = Math.floor(Math.random() * 3) - 1; // Random change -1 to +2
  }

  /**
   * Extract fraud hotspot coordinates from transaction locations
   */
  private updateFraudHotspots(alerts: Alert[]): void {
    // Map SVG viewport coordinates (0-960 x 0-600) from lat/lng
    const coordMap = new Map<string, {cx: number, cy: number, txnCount: number}>();

    alerts.forEach(alert => {
      const txn = alert.transaction;
      // Transform lat/lng to SVG coordinates (simplified mapping)
      // Assuming lat range: -90 to 90, lng range: -180 to 180
      // SVG range: 0-960 x 0-600
      const cx = ((txn.location.lng + 180) / 360) * 960;
      const cy = ((90 - txn.location.lat) / 180) * 600;

      const key = `${Math.round(cx)},${Math.round(cy)}`;
      if (coordMap.has(key)) {
        const existing = coordMap.get(key)!;
        existing.txnCount++;
      } else {
        coordMap.set(key, { cx, cy, txnCount: 1 });
      }
    });

    // Convert map to array, sorted by frequency
    this.fraudHotspots = Array.from(coordMap.values())
      .sort((a, b) => b.txnCount - a.txnCount)
      .slice(0, 10); // Keep top 10 hotspots
  }

  /**
   * Update model metrics based on alert distribution by model
   */
  private updateModelMetrics(alerts: Alert[]): void {
    const modelCounts = {
      'Transformer': 0,
      'Autoencoder': 0,
      'Attention': 0
    };

    // Count alerts per model
    alerts.forEach(alert => {
      const model = alert.transaction.aiModel as keyof typeof modelCounts;
      if (model in modelCounts) {
        modelCounts[model]++;
      }
    });

    // Calculate accuracy percentages based on alert confidence
    const totalAlerts = alerts.length || 1;
    const transformerAccuracy = Math.round((modelCounts['Transformer'] / totalAlerts) * 100 + 40); // Base 40% + weighted
    const autoencoderAccuracy = Math.round((modelCounts['Autoencoder'] / totalAlerts) * 100 + 50);
    const attentionAccuracy = Math.round((modelCounts['Attention'] / totalAlerts) * 100 + 60);

    this.modelMetrics = [
      { name: 'Autoencoder', value: Math.min(autoencoderAccuracy, 95), color: '#00D9FF' },
      { name: 'Attention', value: Math.min(attentionAccuracy, 96), color: '#00D9FF' },
      { name: 'Transformer', value: Math.min(transformerAccuracy, 92), color: '#00D9FF' }
    ];
  }

  /**
   * Calculate time ago from timestamp
   */
  private getTimeAgo(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;

      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return timestamp;
    }
  }

  ngOnDestroy() {
    // Unsubscribe from alerts
    if (this.alertsSubscription) {
      this.alertsSubscription.unsubscribe();
    }

    // Unsubscribe from incoming alerts
    if (this.incomingAlertsSubscription) {
      this.incomingAlertsSubscription.unsubscribe();
    }

    // Stop the live alert simulation
    this.fraudDataService.stopLiveAlertSimulation();

    // Stop the AI Fraud Simulation Engine
    this.simulationService.stopSimulation();

    // Clear animation interval
    if (this.pulseInterval) {
      clearInterval(this.pulseInterval);
    }
  }

  startPulseAnimation() {
    // Simulate pulse animation for alerts
    this.pulseInterval = setInterval(() => {
      // Animation handled via CSS
    }, 1000);
  }

  goBack() {
    this.router.navigate(['/selection']);
  }

  openForensicConsole() {
    this.router.navigate(['/forensic-console']);
  }

  openAiLaboratory() {
    this.router.navigate(['/client-hub/ai-lab']);
  }

  openDataAnalyst() {
    this.router.navigate(['/data-analyst']);
  }

  deepDive(alert: AlertItem) {
    // Get the alert from service and store the userId for investigation
    const serviceAlert = this.fraudDataService.getAlertById(alert.id);
    if (serviceAlert) {
      console.log('Deep Dive into alert:', serviceAlert);
      // Navigate to forensic console with user ID
      this.router.navigate(['/forensic-console'], {
        state: { userId: serviceAlert.transaction.userId }
      });
    }
  }

  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟠';
      case 'low':
        return '🟡';
      default:
        return '⚪';
    }
  }

  /**
   * Trigger red flashing border animation for client-reported alerts
   */
  private triggerClientReportAnimation(alertId: string): void {
    // Remove from new alerts set after 4 seconds of animation
    setTimeout(() => {
      this.newAlertIds.delete(alertId);
    }, 4000);
  }

  /**
   * Trigger browser notification for high-priority client reports
   */
  private triggerBrowserNotification(alert: Alert): void {
    // Check if browser supports notifications
    if ('Notification' in window) {
      // Request permission if not granted
      if (Notification.permission === 'granted') {
        this.showNotification(alert);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            this.showNotification(alert);
          }
        });
      }
    }
  }

  /**
   * Show the browser notification
   */
  private showNotification(alert: Alert): void {
    const notification = new Notification('🚨 Client Fraud Report - URGENT', {
      icon: '🛡️',
      badge: '🔴',
      tag: 'fraud-alert-' + alert.id,
      requireInteraction: true,
      body: `Critical: ${alert.transaction.merchant || 'Unknown Merchant'}\n` +
            `Amount: $${alert.transaction.amount || 0}\n` +
            `Location: ${alert.transaction.location.city}, ${alert.transaction.location.country}\n` +
            `Reported by: ${alert.transaction.userId}`,
      data: {
        alertId: alert.id,
        userId: alert.transaction.userId
      }
    });

    // Click handler to navigate to forensic console
    notification.onclick = () => {
      window.focus();
      this.router.navigate(['/forensic-console'], {
        state: { userId: alert.transaction.userId }
      });
      notification.close();
    };

    // Auto-close after 10 seconds if not clicked
    setTimeout(() => notification.close(), 10000);
  }

  /**
   * Check if alert is new (for animation)
   */
  isAlertNew(alertId: string): boolean {
    return this.newAlertIds.has(alertId);
  }
}
