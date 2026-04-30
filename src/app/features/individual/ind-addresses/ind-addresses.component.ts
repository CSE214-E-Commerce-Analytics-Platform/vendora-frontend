import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AddressService } from '../../../core/services/address.service';
import { ToastService } from '../../../core/services/toast.service';
import { DtoAddress, DtoAddressRequest } from '../../../shared/models/address';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-ind-addresses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ind-addresses.component.html',
  styleUrl: './ind-addresses.component.css'
})
export class IndAddressesComponent implements OnInit {
  private addressService = inject(AddressService);
  private toastService = inject(ToastService);

  addresses: DtoAddress[] = [];
  isLoading = true;

  showModal = false;
  isEditing = false;
  editingId: number | null = null;
  
  addressForm: DtoAddressRequest = {
    city: '',
    district: '',
    fullAddress: '',
    phoneNumber: '',
    zipCode: ''
  };

  isSubmitting = false;
  deletingId: number | null = null;

  // Pagination
  pageNumber = 0;
  pageSize = 10;
  totalPages = 0;

  ngOnInit(): void {
    this.loadAddresses();
  }

  loadAddresses(): void {
    this.isLoading = true;
    this.addressService.findMyAddresses({ pageNumber: this.pageNumber, pageSize: this.pageSize }).pipe(
      catchError(() => {
        this.toastService.showError('Failed to load addresses.');
        this.isLoading = false;
        return of(null);
      })
    ).subscribe(res => {
      this.addresses = res?.content || [];
      this.totalPages = Math.ceil((res?.totalElement || 0) / this.pageSize);
      this.isLoading = false;
    });
  }

  prevPage(): void {
    if (this.pageNumber > 0) {
      this.pageNumber--;
      this.loadAddresses();
    }
  }

  nextPage(): void {
    if (this.pageNumber < this.totalPages - 1) {
      this.pageNumber++;
      this.loadAddresses();
    }
  }

  openAddModal(): void {
    this.isEditing = false;
    this.editingId = null;
    this.addressForm = { city: '', district: '', fullAddress: '', phoneNumber: '', zipCode: '' };
    this.showModal = true;
  }

  openEditModal(address: DtoAddress): void {
    this.isEditing = true;
    this.editingId = address.id!;
    this.addressForm = {
      city: address.city,
      district: address.district,
      fullAddress: address.fullAddress,
      phoneNumber: address.phoneNumber,
      zipCode: address.zipCode
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveAddress(): void {
    if (!this.addressForm.city || !this.addressForm.district || !this.addressForm.fullAddress || !this.addressForm.phoneNumber || !this.addressForm.zipCode) {
      this.toastService.showError('Please fill all required fields.');
      return;
    }

    this.isSubmitting = true;

    if (this.isEditing && this.editingId) {
      this.addressService.updateAddress(this.editingId, this.addressForm).pipe(
        catchError(err => {
          this.toastService.showError('Failed to update address. ' + (err.error?.exception?.message || ''));
          this.isSubmitting = false;
          return of(null);
        })
      ).subscribe(res => {
        if (res) {
          this.toastService.showSuccess('Address updated successfully.');
          this.closeModal();
          this.loadAddresses();
        }
        this.isSubmitting = false;
      });
    } else {
      this.addressService.createAddress(this.addressForm).pipe(
        catchError(err => {
          this.toastService.showError('Failed to create address. ' + (err.error?.exception?.message || ''));
          this.isSubmitting = false;
          return of(null);
        })
      ).subscribe(res => {
        if (res) {
          this.toastService.showSuccess('Address added successfully.');
          this.closeModal();
          this.loadAddresses();
        }
        this.isSubmitting = false;
      });
    }
  }

  deleteAddress(id: number): void {
    if (confirm('Are you sure you want to delete this address?')) {
      this.deletingId = id;
      this.addressService.deleteAddress(id).pipe(
        catchError(err => {
          this.toastService.showError('Failed to delete address. ' + (err.error?.exception?.message || ''));
          this.deletingId = null;
          return of(null);
        })
      ).subscribe(res => {
        if (res !== null) {
          this.toastService.showSuccess('Address deleted successfully.');
          this.loadAddresses();
        }
        this.deletingId = null;
      });
    }
  }

  goToPage(pageStr: string): void {
    const page = parseInt(pageStr, 10);
    if (!isNaN(page) && page > 0 && page <= this.totalPages) {
      this.pageNumber = page - 1;
      this.loadAddresses();
    }
  }
}
