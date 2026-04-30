import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StoreService } from '../../../core/services/store.service';
import { Store, StoreRequest } from '../../../shared/models/store';

@Component({
  selector: 'app-corp-dashboard',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './corp-dashboard.component.html',
  styleUrl: './corp-dashboard.component.css'
})
export class CorpDashboardComponent implements OnInit {

  store: Store | null = null;
  isLoading: boolean = false;

  // Edit mode
  showEditModal = false;
  editForm: FormGroup;

  constructor(
    private storeService: StoreService,
    private fb: FormBuilder
  ) {
    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  ngOnInit(): void {
    this.loadStore();
  }

  loadStore(): void {
    this.isLoading = true;
    this.storeService.getMyStores({ pageNumber: 0, pageSize: 10 }).subscribe({
      next: (res) => {
        const stores = res?.content || [];
        this.store = stores.length > 0 ? stores[0] : null;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching store', err);
        this.isLoading = false;
      }
    });
  }

  openEditModal(): void {
    if (!this.store) return;
    this.editForm.patchValue({ name: this.store.name });
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
  }

  saveStore(): void {
    if (this.editForm.invalid || !this.store?.id) return;

    const request: StoreRequest = { name: this.editForm.value.name };
    this.storeService.updateStore(this.store.id, request).subscribe({
      next: (updated) => {
        this.store = updated;
        this.closeEditModal();
      },
      error: (err) => {
        console.error('Error updating store', err);
        alert('An error occurred while updating the store.');
      }
    });
  }
}
