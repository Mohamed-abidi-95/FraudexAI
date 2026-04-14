import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { UserService, UserClient } from '../services/user.service';

@Component({
  selector: 'app-client-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="shell-container">
      <!-- Sidebar Navigation -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="logo-container">
            <div class="logo-icon">F</div>
            <span class="logo-text">FraudExAI</span>
          </div>
        </div>

        <nav class="sidebar-nav">
          <div class="nav-group">
            <a routerLink="/client-hub" routerLinkActive="active" class="nav-item">
              <span class="icon">📊</span>
              <span class="label">Tableau de bord</span>
            </a>
            <a class="nav-item disabled">
              <span class="icon">💼</span>
              <span class="label">Comptes</span>
            </a>
            <a class="nav-item disabled">
              <span class="icon">💳</span>
              <span class="label">Cartes</span>
            </a>
            <a class="nav-item disabled">
              <span class="icon">📝</span>
              <span class="label">Chèques</span>
            </a>
            <a class="nav-item disabled">
              <span class="icon">📱</span>
              <span class="label">Recharge téléphonique</span>
            </a>
            <a class="nav-item disabled">
              <span class="icon">📫</span>
              <span class="label">Demandes</span>
            </a>
          </div>

          <div class="nav-divider"></div>

          <div class="nav-group">
            <a routerLink="/client-hub/converter" routerLinkActive="active" class="nav-item">
              <span class="icon">🔄</span>
              <span class="label">Convertisseur</span>
            </a>
            <a class="nav-item disabled">
              <span class="icon">🧮</span>
              <span class="label">Simulateur</span>
            </a>
            <a class="nav-item disabled">
              <span class="icon">📍</span>
              <span class="label">Agences</span>
            </a>
          </div>
        </nav>

        <div class="sidebar-footer">
          <button (click)="onLogout()" class="logout-btn">
            <span class="icon">🚪</span>
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .shell-container {
      display: flex;
      height: 100vh;
      width: 100vw;
      background: #0f0a1e;
      color: white;
      overflow: hidden;
    }

    .sidebar {
      width: 260px;
      background: rgba(30, 20, 50, 0.9);
      backdrop-filter: blur(10px);
      border-right: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }

    .sidebar-header {
      padding: 30px;
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #a855f7, #6366f1);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 24px;
      box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
    }

    .logo-text {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.5px;
      background: linear-gradient(to right, #fff, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .sidebar-nav {
      flex: 1;
      padding: 10px 15px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      overflow-y: auto;
    }

    .nav-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.05);
      margin: 5px 15px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 18px;
      border-radius: 12px;
      text-decoration: none;
      color: rgba(255, 255, 255, 0.6);
      font-size: 15px;
      font-weight: 500;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
    }

    .nav-item:hover {
      background: rgba(255, 255, 255, 0.05);
      color: white;
      transform: translateX(4px);
    }

    .nav-item.active {
      background: linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(99, 102, 241, 0.15));
      color: #c084fc;
      border: 1px solid rgba(168, 85, 247, 0.2);
    }

    .nav-item.active .icon {
      filter: drop-shadow(0 0 8px rgba(168, 85, 247, 0.5));
    }

    .nav-item.disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .icon {
      font-size: 18px;
      width: 24px;
      display: flex;
      justify-content: center;
    }

    .sidebar-footer {
      padding: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .logout-btn {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      color: #ef4444;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .logout-btn:hover {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.2);
    }

    .main-content {
      flex: 1;
      padding: 0;
      overflow-y: auto;
      background: linear-gradient(135deg, #0f0a1e 0%, #1a152e 100%);
      position: relative;
    }

    /* Custom Scrollbar */
    ::-webkit-scrollbar {
      width: 6px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `]
})
export class ClientShellComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {}

  onLogout(): void {
    // Implement logout logic
    this.router.navigate(['/auth']);
  }
}
