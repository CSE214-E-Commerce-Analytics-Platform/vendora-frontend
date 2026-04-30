import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.css'
})
export class AdminSettingsComponent {
  private toastService = inject(ToastService);

  settings = {
    platformName: 'E-Commerce Analytics Platform',
    contactEmail: 'admin@datapulse.com',
    defaultTheme: 'light',
    enableNotifications: true,
    maintenanceMode: false,
    currency: 'TRY'
  };

  isSaving = false;

  saveSettings(): void {
    this.isSaving = true;
    // Simulate API call
    setTimeout(() => {
      this.isSaving = false;
      this.toastService.showSuccess('Settings updated successfully!');
      if (this.settings.defaultTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }, 800);
  }
}
