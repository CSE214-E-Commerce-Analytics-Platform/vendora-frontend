import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerProfileService } from '../../../core/services/customer-profile.service';
import { ToastService } from '../../../core/services/toast.service';
import { DtoCustomerProfile, DtoCustomerProfileRequest, MembershipType } from '../../../shared/models/customer-profile';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-ind-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './ind-profile.component.html',
  styleUrl: './ind-profile.component.css'
})
export class IndProfileComponent implements OnInit {
  private profileService = inject(CustomerProfileService);
  private toastService = inject(ToastService);

  MembershipType = MembershipType;

  profile: DtoCustomerProfile | null = null;
  isLoading = true;
  isEditing = false;
  isSaving = false;
  isUpgrading = false;

  editForm: DtoCustomerProfileRequest = {};

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.profileService.getMyProfile().pipe(
      catchError(() => {
        this.isLoading = false;
        return of(null);
      })
    ).subscribe(profile => {
      this.profile = profile;
      this.isLoading = false;
    });
  }

  startEdit(): void {
    this.editForm = {
      age: this.profile?.age,
      city: this.profile?.city,
      state: this.profile?.state,
      country: this.profile?.country
    };
    this.isEditing = true;
  }

  cancelEdit(): void {
    this.isEditing = false;
  }

  saveProfile(): void {
    this.isSaving = true;
    this.profileService.updateMyProfile(this.editForm).pipe(
      catchError(err => {
        this.toastService.showError('Failed to update profile. ' + (err.error?.exception?.message || ''));
        this.isSaving = false;
        return of(null);
      })
    ).subscribe(updated => {
      if (updated) {
        this.profile = updated;
        this.toastService.showSuccess('Profile updated successfully.');
        this.isEditing = false;
      }
      this.isSaving = false;
    });
  }

  showUpgradeModal = false;

  openUpgradeModal(): void {
    this.showUpgradeModal = true;
  }

  closeUpgradeModal(): void {
    this.showUpgradeModal = false;
  }

  upgradeMembership(newType: MembershipType): void {
    this.isUpgrading = true;
    this.profileService.upgradeMembership(newType).pipe(
      catchError(err => {
        this.toastService.showError('Upgrade failed. ' + (err.error?.exception?.message || ''));
        this.isUpgrading = false;
        return of(null);
      })
    ).subscribe(updated => {
      if (updated) {
        this.profile = updated;
        this.toastService.showSuccess('Membership upgraded to ' + updated.membershipType + '!');
        this.closeUpgradeModal();
      }
      this.isUpgrading = false;
    });
  }

  getMembershipClass(type: MembershipType | undefined): string {
    switch (type) {
      case MembershipType.PREMIUM: return 'membership-premium';
      case MembershipType.VIP:     return 'membership-vip';
      default:                      return 'membership-standard';
    }
  }

  getMembershipIcon(type: MembershipType | undefined): string {
    switch (type) {
      case MembershipType.PREMIUM: return '💎';
      case MembershipType.VIP:     return '👑';
      default:                      return '🥉';
    }
  }

  canUpgrade(type: MembershipType | undefined): boolean {
    return type !== MembershipType.VIP;
  }

  getAvailableUpgrades(): MembershipType[] {
    const current = this.profile?.membershipType || MembershipType.STANDARD;
    if (current === MembershipType.STANDARD) {
      return [MembershipType.PREMIUM, MembershipType.VIP];
    } else if (current === MembershipType.PREMIUM) {
      return [MembershipType.VIP];
    }
    return [];
  }
}
