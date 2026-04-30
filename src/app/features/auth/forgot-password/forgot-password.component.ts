import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { RouterLink } from '@angular/router';
import { extractErrorMessage } from '../../../core/utils/error.util';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  forgotPasswordForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  message = '';
  errorMessage = '';
  isLoading = false;

  onSubmit() {
    this.message = '';
    this.errorMessage = '';

    if (this.forgotPasswordForm.valid) {
      this.isLoading = true;
      const email = this.forgotPasswordForm.value.email!;
      this.authService.forgotPassword(email).subscribe({
        next: (msg) => {
          this.message = msg || 'Reset link sent! Please check your email.';
          this.forgotPasswordForm.reset();
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = extractErrorMessage(err, 'An error occurred while sending the reset link.');
          this.forgotPasswordForm.reset();
          this.isLoading = false;
        }
      });
    }
  }
}
