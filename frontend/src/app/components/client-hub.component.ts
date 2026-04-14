import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FraudBridgeService, ReportStatus } from '../services/fraud-bridge.service';
import { UserService, UserClient, Transaction, CreditCard } from '../services/user.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-client-hub',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-hub.component.html',
  styleUrls: ['./client-hub.component.scss']
})
export class ClientHubComponent implements OnInit, OnDestroy {
  // Observable data from UserService
  currentClient$: any;
  currentClient: UserClient | null = null;

  // Transaction properties
  suspectTransactions: Transaction[] = [];
  verifiedTransactions: Transaction[] = [];

  // UI State
  reportStatus: ReportStatus = {
    isLoading: false,
    success: false,
    error: null,
    message: ''
  };

  activeAlerts: number = 0;
  currentHour: number = new Date().getHours();
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening' | 'Night' = this.getTimeOfDay();

  // Added countries list for travel mode
  availableCountries = [
    'USA', 'Canada', 'UK', 'France', 'Germany', 'Japan', 
    'Singapore', 'India', 'Australia', 'Brazil', 'Mexico'
  ];

  private subscriptions: Subscription[] = [];

  constructor(
    private fraudBridgeService: FraudBridgeService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    // Subscribe to current user data
    this.currentClient$ = this.userService.currentClient$;
    this.subscriptions.push(
      this.currentClient$.subscribe((user: UserClient) => {
        this.currentClient = user;
        this.categorizeTransactions();
      })
    );

    // Subscribe to fraud report status
    this.subscriptions.push(
      this.fraudBridgeService.getReportStatus().subscribe((status: ReportStatus) => {
        this.reportStatus = status;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Categorize transactions into suspect and verified
   */
  private categorizeTransactions(): void {
    if (this.currentClient?.recentTransactions) {
      this.suspectTransactions = this.currentClient.recentTransactions.filter(
        t => t.status === 'suspect'
      );
      this.verifiedTransactions = this.currentClient.recentTransactions.filter(
        t => t.status === 'verified'
      );
    }
  }

  /**
   * Get time of day greeting (EN)
   */
  private getTimeOfDay(): 'Morning' | 'Afternoon' | 'Evening' | 'Night' {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    if (hour < 21) return 'Evening';
    return 'Night';
  }

  /**
   * Get French time of day greeting
   */
  getTimeOfDayFrench(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 17) return 'Bon après-midi';
    if (hour < 21) return 'Bonsoir';
    return 'Bonne nuit';
  }

  /**
   * Get masked card number (first 12 digits masked, show last 4)
   */
  getMaskedCardNumber(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 4) return cardNumber;
    const lastFour = cardNumber.slice(-4);
    return `•••• •••• •••• ${lastFour}`;
  }

  /**
   * Get security score color (Green >80, Orange 50-80, Red <50)
   */
  getScoreColor(score: number): string {
    if (score > 80) return '#00E676';
    if (score >= 50) return '#FFD700';
    return '#FF4D4D';
  }

  /**
   * Get trust score ngStyle object for color binding
   */
  getTrustScoreStyle(score: number): { [key: string]: string } {
    let color: string;

    if (score > 80) {
      color = '#00E676';
    } else if (score >= 50) {
      color = '#FFD700';
    } else {
      color = '#FF4D4D';
    }

    return {
      'color': color,
      'font-weight': '600',
      'text-transform': 'uppercase',
      'letter-spacing': '0.5px'
    };
  }

  /**
   * Get trust score percentage style for circular gauge
   */
  getTrustScoreAngle(score: number): number {
    return (score / 100) * 360;
  }

  /**
   * Report fraud for a specific transaction
   */
  onReportFraud(transaction: Transaction): void {
    if (!this.currentClient) {
      console.error('No user data available');
      return;
    }

    const userId = this.currentClient.id;
    this.fraudBridgeService.reportClientFraud(userId, {
      transactionAmount: transaction.amount,
      merchant: transaction.merchant,
      timestamp: transaction.timestamp,
      location: `${transaction.location.city}, ${transaction.location.country}`,
      description: `Suspected fraudulent transaction at ${transaction.merchant}`
    });

    console.log('[CLIENT HUB] Fraud report submitted', {
      userId,
      transaction,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Confirm transaction is legitimate (Oui, c'était moi)
   */
  onConfirmTransaction(transaction: Transaction): void {
    console.log('[CLIENT HUB] Transaction confirmed as legitimate:', transaction.id);
    console.log('[CLIENT HUB] User confirmed: "Oui, c\'était moi" for transaction:', transaction.id);
    // In production, send confirmation to backend
    alert(`Transaction ${transaction.id} confirmée comme authentique`);
  }

  /**
   * Report transaction as fraud (Non, ce n'était pas moi)
   * Calls FraudBridgeService.reportClientFraud()
   */
  onRejectTransaction(transaction: Transaction): void {
    if (!this.currentClient) {
      console.error('No user data available');
      return;
    }

    console.log('[CLIENT HUB] Transaction rejected as fraudulent:', transaction.id);
    console.log('[CLIENT HUB] User responded: "Non, ce n\'était pas moi" for transaction:', transaction.id);

    // Call FraudBridgeService to report fraud
    const userId = this.currentClient.id;
    this.fraudBridgeService.reportClientFraud(userId, {
      transactionAmount: transaction.amount,
      merchant: transaction.merchant,
      timestamp: transaction.timestamp,
      location: `${transaction.location.city}, ${transaction.location.country}`,
      description: `Transaction suspecte - utilisateur a confirmé: "Non, ce n'était pas moi" - ${transaction.merchant}`
    });

    console.log('[CLIENT HUB] Fraud report submitted successfully', {
      userId,
      transaction,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Whitelist a country for travel
   */
  onWhitelistCountry(country: string): void {
    this.userService.whitelistCountry(country);
    console.log('[TRAVEL MODE] Whitelisted country:', country);
  }

  /**
   * Remove country from whitelist
   */
  onRemoveCountryFromWhitelist(country: string): void {
    this.userService.removeCountryFromWhitelist(country);
    console.log('[TRAVEL MODE] Removed country from whitelist:', country);
  }

  /**
   * Get available countries not yet whitelisted
   */
  getAvailableCountriesToAdd(): string[] {
    if (!this.currentClient) return [];
    return this.availableCountries.filter(
      country => !this.currentClient!.whitelistedCountries.includes(country)
    );
  }

  /**
   * Get flag emoji for country
   */
  getCountryFlag(country: string): string {
    return this.userService.getCountryFlag(country);
  }

  /**
   * Reset report status
   */
  resetReport(): void {
    this.fraudBridgeService.resetReportStatus();
  }

  /**
   * Check if currently loading
   */
  isLoading(): boolean {
    return this.reportStatus.isLoading;
  }
}
