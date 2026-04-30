import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { extractErrorMessage } from '../../../core/utils/error.util';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
    age: [null as number | null, [Validators.min(1), Validators.max(150)]],
    city: [null as string | null],
    state: [null as string | null],
    country: [null as string | null]
  });

  errorMessage = '';
  successMessage = '';
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;

  onRegister() {
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    if (this.registerForm.valid) {
      const { email, password, confirmPassword, age, city, state, country } = this.registerForm.value;

      if (password !== confirmPassword) {
        this.errorMessage = 'Passwords do not match.';
        return;
      }

      this.authService.register(email!, password!, age, city, state, country).subscribe({
        next: (message: string) => {
          this.successMessage = message || 'Registration successful. Please check your email to verify your account.';
          this.registerForm.reset();
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = extractErrorMessage(err, 'Registration failed. Please try again.');
          this.registerForm.reset();
          this.isLoading = false;
        }
      });
    }
  }
}
