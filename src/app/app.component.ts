import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { ChatbotComponent } from './features/chatbot/chatbot.component';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, NavbarComponent, ChatbotComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'e-commerce-frontend';
  showNavbar = false;
  showChatbot = false;

  private router = inject(Router);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects;
      const hideRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
      
      const isAuthRoute = hideRoutes.some(route => url.includes(route));
      const isAdminRoute = url.startsWith('/admin');
      const isCorporateRoute = url.startsWith('/corporate');
      const isIndividualRoute = url.startsWith('/individual');

      this.showNavbar = !(isAuthRoute || isAdminRoute || isCorporateRoute || isIndividualRoute);
      this.showChatbot = !isAuthRoute;
    });
  }
}

