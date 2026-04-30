import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminAuditService } from '../../../core/services/admin-audit.service';
import { ToastService } from '../../../core/services/toast.service';
import { DtoAuditLog } from '../../../shared/models/audit-log';
import { RestPageableRequest } from '../../../shared/models/pageable';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-admin-audit-logs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-audit-logs.component.html',
  styleUrl: './admin-audit-logs.component.css'
})
export class AdminAuditLogsComponent implements OnInit {
  private auditService = inject(AdminAuditService);
  private toastService = inject(ToastService);

  logs: DtoAuditLog[] = [];
  isLoading = false;

  // Pagination state
  pageNumber = 0;
  pageSize = 50;
  totalElements = 0;
  totalPages = 0;

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.isLoading = true;
    
    const request: RestPageableRequest = {
        pageNumber: this.pageNumber,
        pageSize: this.pageSize
    };

    this.auditService.getAuditLogs(request).pipe(
        catchError(() => {
            this.toastService.showError('Failed to load audit logs.');
            return of(null);
        })
    ).subscribe(response => {
        if (response) {
            this.logs = response.content || [];
            this.totalElements = response.totalElement;
            this.totalPages = Math.ceil(this.totalElements / this.pageSize);
        }
        this.isLoading = false;
    });
  }

  nextPage(): void {
      if (this.pageNumber < this.totalPages - 1) {
          this.pageNumber++;
          this.loadLogs();
      }
  }

  prevPage(): void {
      if (this.pageNumber > 0) {
          this.pageNumber--;
          this.loadLogs();
      }
  }

  getActionIcon(action: string): string {
      action = action.toLowerCase();
      if (action.includes('create')) return '➕';
      if (action.includes('update')) return '✏️';
      if (action.includes('delete')) return '🗑️';
      if (action.includes('login')) return '🔑';
      if (action.includes('approve')) return '✅';
      if (action.includes('reject')) return '❌';
      return '📝';
  }

  goToPage(pageStr: string): void {
    const page = parseInt(pageStr, 10);
    if (!isNaN(page) && page > 0 && page <= this.totalPages) {
      this.pageNumber = page - 1;
      this.loadLogs();
    }
  }
}
