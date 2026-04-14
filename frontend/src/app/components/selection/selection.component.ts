import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface SelectionCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  isHovered?: boolean;
}

@Component({
  selector: 'app-selection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './selection.component.html',
  styleUrls: ['./selection.component.scss']
})
export class SelectionComponent {
  cards: SelectionCard[] = [
    {
      id: 'client',
      title: 'Client',
      description: 'Manage your payments securely',
      icon: 'client',
      isHovered: false
    },
    {
      id: 'administrator',
      title: 'Administrator',
      description: 'Oversee and manage the system',
      icon: 'admin',
      isHovered: false
    }
  ];

  constructor(private router: Router) {}

  onCardHover(cardId: string, isHovering: boolean): void {
    const card = this.cards.find(c => c.id === cardId);
    if (card) {
      card.isHovered = isHovering;
    }
  }

  onCardClick(cardId: string): void {
    console.log(`${cardId} card selected`);
    // Navigate to auth page with role parameter
    if (cardId === 'client') {
      this.router.navigate(['/auth'], { queryParams: { role: 'client' } });
    } else if (cardId === 'administrator') {
      this.router.navigate(['/auth'], { queryParams: { role: 'admin' } });
    }
  }

  onBackClick(): void {
    this.router.navigate(['/']);
  }
}
