import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CorporateApplicationService } from '../../../core/services/corporate-application.service';
import { CorporateApplication, CorporateCreateRequest } from '../../../shared/models/corporate-application';
import { extractErrorMessage } from '../../../core/utils/error.util';

@Component({
  selector: 'app-ind-corporate-apply',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ind-corporate-apply.component.html',
  styleUrl: './ind-corporate-apply.component.css'
})
export class IndCorporateApplyComponent implements OnInit {

  // Form fields
  companyName = '';
  reason = '';

  // State
  existingRequest: CorporateApplication | null = null;
  isLoading = true;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private corporateAppService: CorporateApplicationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadExistingRequest();
  }

  loadExistingRequest(): void {
    this.isLoading = true;
    this.corporateAppService.findMyLatestRequest().subscribe({
      next: (request) => {
        this.existingRequest = request;
        this.isLoading = false;
      },
      error: () => {
        // No existing request found — that's fine
        this.existingRequest = null;
        this.isLoading = false;
      }
    });
  }

  submitApplication(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.companyName.trim() || !this.reason.trim()) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    this.isSubmitting = true;
    const request: CorporateCreateRequest = {
      companyName: this.companyName.trim(),
      reason: this.reason.trim()
    };

    this.corporateAppService.createRequest(request).subscribe({
      next: (result) => {
        this.existingRequest = result;
        this.successMessage = 'Your corporate upgrade request has been submitted successfully! Please wait for admin review.';
        this.isSubmitting = false;
        this.companyName = '';
        this.reason = '';
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, 'Failed to submit your request. Please try again.');
        this.isSubmitting = false;
      }
    });
  }

  getStatusClass(): string {
    if (!this.existingRequest) return '';
    switch (this.existingRequest.status) {
      case 'PENDING': return 'status-pending';
      case 'APPROVED': return 'status-approved';
      case 'REJECTED': return 'status-rejected';
      default: return '';
    }
  }

  getStatusIcon(): string {
    if (!this.existingRequest) return '';
    switch (this.existingRequest.status) {
      case 'PENDING': return '⏳';
      case 'APPROVED': return '✅';
      case 'REJECTED': return '❌';
      default: return '❓';
    }
  }
}
