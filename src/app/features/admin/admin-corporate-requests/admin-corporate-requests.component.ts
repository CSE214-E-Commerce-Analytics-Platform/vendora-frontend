import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    CorporateApplication,
    CorporateApplicationStatus,
    CorporateReviewRequest
} from '../../../shared/models/corporate-application';
import { CorporateApplicationService } from '../../../core/services/corporate-application.service';
import { extractErrorMessage } from '../../../core/utils/error.util';

@Component({
    selector: 'app-admin-corporate-requests',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './admin-corporate-requests.component.html',
    styleUrl: './admin-corporate-requests.component.css'
})
export class AdminCorporateRequestsComponent implements OnInit {

    requests: CorporateApplication[] = [];
    selectedStatus: CorporateApplicationStatus = 'PENDING';

    isLoading = false;
    errorMessage = '';
    successMessage = '';

    // Pagination
    pageNumber = 0;
    pageSize = 20;
    totalPages = 0;

    // Review modal state
    showReviewModal = false;
    selectedRequest: CorporateApplication | null = null;
    reviewDecision: CorporateApplicationStatus = 'APPROVED';
    adminNote = '';
    isReviewing = false;
    reviewError = '';

    // Search by email
    searchEmail = '';
    isSearching = false;

    constructor(private corporateAppService: CorporateApplicationService) {}

    ngOnInit(): void {
        this.loadByStatus();
    }

    loadByStatus(): void {
        this.isLoading = true;
        this.errorMessage = '';
        this.requests = [];

        this.corporateAppService.findRequestsByStatus(this.selectedStatus, { pageNumber: this.pageNumber, pageSize: this.pageSize }).subscribe({
            next: (res) => {
                this.requests = res?.content || [];
                this.totalPages = Math.ceil((res?.totalElement || 0) / this.pageSize);
                this.isLoading = false;
            },
            error: (err) => {
                this.errorMessage = extractErrorMessage(err, 'Failed to load requests.');
                this.isLoading = false;
            }
        });
    }

    prevPage(): void { if (this.pageNumber > 0) { this.pageNumber--; this.loadByStatus(); } }
    nextPage(): void { if (this.pageNumber < this.totalPages - 1) { this.pageNumber++; this.loadByStatus(); } }

    searchByEmail(): void {
        if (!this.searchEmail.trim()) return;
        this.isSearching = true;
        this.errorMessage = '';
        this.successMessage = '';

        this.corporateAppService.findRequestByUserEmail(this.searchEmail.trim()).subscribe({
            next: (request) => {
                this.requests = request ? [request] : [];
                this.isSearching = false;
            },
            error: (err) => {
                this.errorMessage = extractErrorMessage(err, 'No request found for this email.');
                this.requests = [];
                this.isSearching = false;
            }
        });
    }

    clearSearch(): void {
        this.searchEmail = '';
        this.loadByStatus();
    }

    openReviewModal(request: CorporateApplication): void {
        this.selectedRequest = request;
        this.reviewDecision = 'APPROVED';
        this.adminNote = '';
        this.reviewError = '';
        this.showReviewModal = true;
    }

    closeReviewModal(): void {
        this.showReviewModal = false;
        this.selectedRequest = null;
        this.reviewError = '';
    }

    submitReview(): void {
        if (!this.selectedRequest) return;
        this.reviewError = '';

        const dto: CorporateReviewRequest = {
            status: this.reviewDecision,
            adminNote: this.adminNote.trim()
        };

        this.isReviewing = true;
        this.corporateAppService.reviewRequest(this.selectedRequest.id, dto).subscribe({
            next: (updated) => {
                // Replace in list or remove depending on current filter
                const index = this.requests.findIndex(r => r.id === updated.id);
                if (index !== -1) {
                    if (this.selectedStatus === updated.status) {
                        this.requests[index] = updated;
                    } else {
                        this.requests.splice(index, 1);
                    }
                }
                this.successMessage = `Request #${updated.id} has been ${updated.status.toLowerCase()} successfully.`;
                this.isReviewing = false;
                this.closeReviewModal();
                setTimeout(() => this.successMessage = '', 4000);
            },
            error: (err) => {
                this.reviewError = extractErrorMessage(err, 'Failed to submit review. Please try again.');
                this.isReviewing = false;
            }
        });
    }

    getStatusClass(status: string): string {
        switch (status) {
            case 'PENDING':  return 'status-pending';
            case 'APPROVED': return 'status-approved';
            case 'REJECTED': return 'status-rejected';
            default: return '';
        }
    }

    getStatusIcon(status: string): string {
        switch (status) {
            case 'PENDING':  return '⏳';
            case 'APPROVED': return '✅';
            case 'REJECTED': return '❌';
            default: return '❓';
        }
    }

  goToPage(pageStr: string): void {
    const page = parseInt(pageStr, 10);
    if (!isNaN(page) && page > 0 && page <= this.totalPages) {
      this.pageNumber = page - 1;
      this.loadByStatus();
    }
  }
}
