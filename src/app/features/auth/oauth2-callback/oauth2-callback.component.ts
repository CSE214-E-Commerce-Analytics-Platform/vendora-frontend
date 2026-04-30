import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-oauth2-callback',
  imports: [],
  templateUrl: './oauth2-callback.component.html',
  styleUrl: './oauth2-callback.component.css'
})
export class OAuth2CallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  error: string | null = null;

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const token = params.get('token');
    const role = params.get('role');
    const oauth2Error = params.get('oauth2Error');

    if (oauth2Error) {
      this.error = decodeURIComponent(oauth2Error);
      setTimeout(() => this.router.navigate(['/login']), 3000);
      return;
    }

    if (token && role) {
      this.authService.setAuthData(token, role);
      if (role === 'ADMIN') {
        this.router.navigate(['/admin/dashboard']);
      } else if (role === 'CORPORATE') {
        this.router.navigate(['/corporate/dashboard']);
      } else {
        this.router.navigate(['/individual/products']);
      }
    } else {
      this.router.navigate(['/login']);
    }
  }
}
