import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { CartService } from '../../../core/services/cart.service';
import { ToastService, ToastMessage } from '../../../core/services/toast.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-individual-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './individual-layout.component.html',
  styleUrl: './individual-layout.component.css'
})
export class IndividualLayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  themeService = inject(ThemeService);
  cartService = inject(CartService);
  private toastService = inject(ToastService);

  ind_email: String | null = this.authService.getCurrentUserEmail();
  ind_email_parsed = this.ind_email?.split('@')[0];

  toastMessage: ToastMessage | null = null;
  private toastTimeout: any;

  ngOnInit() {
    this.cartService.refreshMyCart().subscribe();
    
    this.toastService.toast$.subscribe(msg => {
      this.toastMessage = msg;
      if (this.toastTimeout) clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => {
        this.toastMessage = null;
      }, 3000);
    });
  }

  sidebarOpen = signal(false);

  toggleSidebar() { this.sidebarOpen.update(v => !v); }
  closeSidebar()  { this.sidebarOpen.set(false); }

  logout() {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
