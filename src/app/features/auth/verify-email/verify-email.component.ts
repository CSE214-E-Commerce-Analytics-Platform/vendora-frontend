import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-verify-email',
  imports: [RouterLink],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.css'
})
export class VerifyEmailComponent implements OnInit {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  message = '';
  errorMessage = '';
  isVerifying = true;

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (!token) {
        this.errorMessage = 'Invalid or missing verification token.';
        this.isVerifying = false;
        return;
      }

      this.authService.verifyEmail(token).subscribe({
        next: (msg) => {
          this.message = msg || 'Email verified successfully. You can now login.';
          this.isVerifying = false;
        },
        error: (err) => {
          this.errorMessage = err?.message || 'An error occurred during verification.';
          this.isVerifying = false;
        }
      });
    });
  }
}
