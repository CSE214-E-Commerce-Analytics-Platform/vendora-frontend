import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../../core/services/store.service';
import { Store } from '../../../shared/models/store';

@Component({
  selector: 'app-ind-stores',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ind-stores.component.html',
  styleUrl: './ind-stores.component.css'
})
export class IndStoresComponent implements OnInit {
  private storeService = inject(StoreService);

  stores: Store[] = [];
  isLoading = true;
  errorMessage = '';

  // Pagination
  pageNumber = 0;
  pageSize = 12;
  totalPages = 0;

  ngOnInit(): void {
    this.fetchStores();
  }

  fetchStores(): void {
    this.isLoading = true;
    this.storeService.getAllStores({ pageNumber: this.pageNumber, pageSize: this.pageSize }).subscribe({
      next: (res) => {
        this.stores = res?.content || [];
        this.totalPages = Math.ceil((res?.totalElement || 0) / this.pageSize);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching stores', err);
        this.errorMessage = 'Failed to load stores. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  prevPage(): void {
    if (this.pageNumber > 0) {
      this.pageNumber--;
      this.fetchStores();
    }
  }

  nextPage(): void {
    if (this.pageNumber < this.totalPages - 1) {
      this.pageNumber++;
      this.fetchStores();
    }
  }

  goToPage(pageStr: string): void {
    const page = parseInt(pageStr, 10);
    if (!isNaN(page) && page > 0 && page <= this.totalPages) {
      this.pageNumber = page - 1;
      this.fetchStores();
    }
  }
}
