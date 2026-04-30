import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { extractErrorMessage } from '../../../core/utils/error.util';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  token = '';
  message = '';
  errorMessage = '';
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;

  resetPasswordForm = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (!this.token) {
        this.errorMessage = 'Invalid or missing reset token.';
      }
    });
  }

  onSubmit() {
    this.message = '';
    this.errorMessage = '';

    if (!this.token) {
      this.errorMessage = 'Missing token. Cannot reset password.';
      return;
    }

    if (this.resetPasswordForm.valid) {
      const { newPassword, confirmPassword } = this.resetPasswordForm.value;

      if (newPassword !== confirmPassword) {
        this.errorMessage = 'Passwords do not match.';
        return;
      }

      this.isLoading = true;

      this.authService.resetPassword(this.token, newPassword!).subscribe({
        next: (msg) => {
          this.message = msg || 'Password reset successfully.';
          this.resetPasswordForm.reset();
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = extractErrorMessage(err, 'An error occurred while resetting password.');
          this.resetPasswordForm.reset();
          this.isLoading = false;
        }
      });
    }
  }
}
