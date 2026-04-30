import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-navbar',
    imports: [CommonModule, RouterLink, RouterLinkActive],
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.css'
})
export class NavbarComponent {
    private authService = inject(AuthService);
    private router = inject(Router);

    get isLoggedIn(): boolean {
        return this.authService.isAuthenticated();
    }

    get userRole(): string {
        return this.authService.getRole() ?? '';
    }

    onLogout(): void {
        this.authService.logout().subscribe({
            next: () => {
                this.authService.clearStorage();
                this.router.navigate(['/login']);
            },
            error: () => {
                // Sunucu hatası olsa bile local'i temizle ve login'e yönlendir
                this.authService.clearStorage();
                this.router.navigate(['/login']);
            }
        });
    }
}
