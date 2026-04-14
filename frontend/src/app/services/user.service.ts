import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  timestamp: string;
  location: {
    city: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  };
  category: string;
  status: 'verified' | 'suspect' | 'pending';
  isMerchantConfirmed?: boolean;
}

export interface CreditCard {
  cardNumber: string;
  maskedNumber: string;
  expiry: string;
  cvv: string;
  balance: number;
  limit: number;
  holderName: string;
  cardType: 'Visa' | 'MasterCard' | 'Amex';
}

export interface UserClient {
  id: string;
  name: string;
  email: string;
  trustScore: number; // 0-100 percentage
  secureStatus: 'Secure' | 'Moderate' | 'At Risk';
  creditCard: CreditCard;
  recentTransactions: Transaction[];
  whitelistedCountries: string[];
  lastLogin: string;
  timezone: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private mockCurrentUser: UserClient;
  private currentClientSubject: BehaviorSubject<UserClient>;
  public currentClient$: Observable<UserClient>;

  constructor(private authService: AuthService) {
    // Initialize with authenticated user or default
    this.mockCurrentUser = this.createDefaultUser();
    this.currentClientSubject = new BehaviorSubject<UserClient>(this.mockCurrentUser);
    this.currentClient$ = this.currentClientSubject.asObservable();

    // Subscribe to auth changes to update user profile
    this.authService.currentAuthUser$.subscribe(authUser => {
      if (authUser) {
        this.mockCurrentUser = this.createUserProfile(authUser.fullName, authUser.email);
        this.currentClientSubject.next(this.mockCurrentUser);
        console.log('[USER SERVICE] Updated profile for:', authUser.fullName);
      }
    });

    console.log('[USER SERVICE] Initialized with current user:', this.mockCurrentUser.name);
  }

  /**
   * Create a user profile based on authenticated user's info
   */
  private createUserProfile(fullName: string, email: string): UserClient {
    // Generate unique ID based on email hash
    const userId = `USR-CLIENT-${Math.abs(email.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0))}`;
    
    // Generate card number based on name
    const cardNumber = this.generateCardNumber(email);
    
    return {
      id: userId,
      name: fullName || email.split('@')[0],
      email: email,
      trustScore: 80,
      secureStatus: 'Secure',
      creditCard: {
        cardNumber: cardNumber,
        maskedNumber: '**** **** **** ' + cardNumber.slice(-4),
        expiry: this.generateExpiry(),
        cvv: this.generateCVV(),
        balance: parseFloat((Math.random() * 10000 + 1000).toFixed(2)),
        limit: 20000,
        holderName: fullName.toUpperCase() || email.split('@')[0].toUpperCase(),
        cardType: this.getRandomCardType()
      },
      recentTransactions: this.generateMockTransactions(),
      whitelistedCountries: ['USA', 'Canada', 'UK', 'France'],
      lastLogin: new Date().toISOString(),
      timezone: 'America/New_York'
    };
  }

  /**
   * Create default user (if not authenticated)
   */
  private createDefaultUser(): UserClient {
    return {
      id: 'USR-CLIENT-001',
      name: 'Guest User',
      email: 'guest@example.com',
      trustScore: 75,
      secureStatus: 'Moderate',
      creditCard: {
        cardNumber: '4532123456789012',
        maskedNumber: '**** **** **** 9012',
        expiry: '08/26',
        cvv: '425',
        balance: 3000,
        limit: 15000,
        holderName: 'GUEST USER',
        cardType: 'Visa'
      },
      recentTransactions: [],
      whitelistedCountries: ['USA', 'Canada'],
      lastLogin: new Date().toISOString(),
      timezone: 'America/New_York'
    };
  }

  /**
   * Generate a unique card number based on email
   */
  private generateCardNumber(email: string): string {
    // Visa card format: 4532 followed by random digits
    const prefix = '4532';
    const random = Math.floor(Math.random() * 9999999999).toString().padStart(10, '0');
    return prefix + random;
  }

  /**
   * Generate expiry date (current year + 4 years)
   */
  private generateExpiry(): string {
    const currentYear = new Date().getFullYear();
    const expiryYear = (currentYear + 4) % 100;
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    return `${month}/${String(expiryYear).padStart(2, '0')}`;
  }

  /**
   * Generate random CVV
   */
  private generateCVV(): string {
    return String(Math.floor(Math.random() * 900) + 100);
  }

  /**
   * Get random card type
   */
  private getRandomCardType(): 'Visa' | 'MasterCard' | 'Amex' {
    const types: ('Visa' | 'MasterCard' | 'Amex')[] = ['Visa', 'MasterCard', 'Amex'];
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Generate mock transactions for display
   */
  private generateMockTransactions(): Transaction[] {
    return [
      {
        id: 'TXN-1',
        merchant: 'Amazon Store',
        amount: 89.99,
        timestamp: '2026-04-08 14:32:15',
        location: { city: 'New York', country: 'USA' },
        category: 'Shopping',
        status: 'verified',
        isMerchantConfirmed: true
      },
      {
        id: 'TXN-2',
        merchant: 'Tokyo Retail Int\'l',
        amount: 2500.00,
        timestamp: '2026-04-08 12:15:42',
        location: { city: 'Tokyo', country: 'Japan' },
        category: 'Shopping',
        status: 'suspect',
        isMerchantConfirmed: false
      },
      {
        id: 'TXN-3',
        merchant: 'Starbucks Coffee',
        amount: 12.45,
        timestamp: '2026-04-08 09:23:18',
        location: { city: 'San Francisco', country: 'USA' },
        category: 'Food & Beverage',
        status: 'verified',
        isMerchantConfirmed: true
      },
      {
        id: 'TXN-4',
        merchant: 'Target Store',
        amount: 156.72,
        timestamp: '2026-04-07 18:45:33',
        location: { city: 'Seattle', country: 'USA' },
        category: 'Shopping',
        status: 'verified',
        isMerchantConfirmed: true
      },
      {
        id: 'TXN-5',
        merchant: 'Netflix Streaming',
        amount: 15.99,
        timestamp: '2026-04-07 00:00:00',
        location: { city: 'Los Angeles', country: 'USA' },
        category: 'Entertainment',
        status: 'verified',
        isMerchantConfirmed: true
      },
      {
        id: 'TXN-6',
        merchant: 'Unknown Online Store',
        amount: 499.99,
        timestamp: '2026-04-06 16:20:10',
        location: { city: 'Singapore', country: 'Singapore' },
        category: 'Shopping',
        status: 'suspect',
        isMerchantConfirmed: false
      }
    ];
  }

  /**
   * Get current logged-in user
   */
  getCurrentUser(): UserClient {
    return this.mockCurrentUser;
  }

  /**
   * Update user data (e.g., after transaction update)
   */
  updateUser(updatedUser: Partial<UserClient>): void {
    this.mockCurrentUser = { ...this.mockCurrentUser, ...updatedUser };
    this.currentClientSubject.next(this.mockCurrentUser);
  }

  /**
   * Add transaction to recent transactions
   */
  addTransaction(transaction: Transaction): void {
    this.mockCurrentUser.recentTransactions = [
      transaction,
      ...this.mockCurrentUser.recentTransactions
    ];
    this.currentClientSubject.next(this.mockCurrentUser);
  }

  /**
   * Update trust score (called after fraud analysis)
   */
  updateTrustScore(newScore: number): void {
    this.mockCurrentUser.trustScore = Math.max(0, Math.min(100, newScore));
    this.mockCurrentUser.secureStatus = this.calculateSecureStatus(newScore);
    this.currentClientSubject.next(this.mockCurrentUser);
  }

  /**
   * Calculate secure status based on trust score
   */
  private calculateSecureStatus(score: number): 'Secure' | 'Moderate' | 'At Risk' {
    if (score >= 75) return 'Secure';
    if (score >= 50) return 'Moderate';
    return 'At Risk';
  }

  /**
   * Add country to whitelist
   */
  whitelistCountry(country: string): void {
    if (!this.mockCurrentUser.whitelistedCountries.includes(country)) {
      this.mockCurrentUser.whitelistedCountries = [
        ...this.mockCurrentUser.whitelistedCountries,
        country
      ];
      this.currentClientSubject.next(this.mockCurrentUser);
    }
  }

  /**
   * Remove country from whitelist
   */
  removeCountryFromWhitelist(country: string): void {
    this.mockCurrentUser.whitelistedCountries = this.mockCurrentUser.whitelistedCountries.filter(
      (c) => c !== country
    );
    this.currentClientSubject.next(this.mockCurrentUser);
  }

  /**
   * Get country flag emoji
   */
  getCountryFlag(countryCode: string): string {
    const countryToFlag: { [key: string]: string } = {
      USA: '🇺🇸',
      Canada: '🇨🇦',
      UK: '🇬🇧',
      France: '🇫🇷',
      Germany: '🇩🇪',
      Japan: '🇯🇵',
      Singapore: '🇸🇬',
      India: '🇮🇳',
      Australia: '🇦🇺',
      Brazil: '🇧🇷',
      Mexico: '🇲🇽',
      Spain: '🇪🇸',
      Italy: '🇮🇹',
      Netherlands: '🇳🇱',
      Switzerland: '🇨🇭',
      Sweden: '🇸🇪',
      Norway: '🇳🇴',
      Denmark: '🇩🇰',
      Belgium: '🇧🇪',
      Korea: '🇰🇷'
    };
    return countryToFlag[countryCode] || '🌍';
  }
}
