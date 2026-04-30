import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { User, UserRequest } from '../../../shared/models/user';
import { AuthService } from '../../../core/services/auth.service';

type RoleFilter = 'ALL' | 'INDIVIDUAL' | 'CORPORATE' | 'ADMIN';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.css'
})
export class AdminUsersComponent implements OnInit {

  users: User[] = [];
  isLoading = true;
  errorMessage = '';
  currentUserEmail: string | null = null;

  selectedRole: RoleFilter = 'ALL';

  // Pagination
  pageNumber = 0;
  pageSize = 20;
  totalPages = 0;

  constructor(
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUserEmail = this.authService.getCurrentUserEmail();
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const paginationReq = { pageNumber: this.pageNumber, pageSize: this.pageSize };
    const req$ = this.selectedRole === 'ALL'
      ? this.userService.findAllUsers(paginationReq)
      : this.userService.findAllUsersByRole(this.selectedRole, paginationReq);

    req$.subscribe({
      next: (res) => {
        this.users = res?.content || [];
        this.totalPages = Math.ceil((res?.totalElement || 0) / this.pageSize);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading users', err);
        this.errorMessage = 'Failed to load users.';
        this.isLoading = false;
      }
    });
  }

  setRoleFilter(role: RoleFilter): void {
    this.selectedRole = role;
    this.pageNumber = 0;
    this.loadUsers();
  }

  prevPage(): void { if (this.pageNumber > 0) { this.pageNumber--; this.loadUsers(); } }
  nextPage(): void { if (this.pageNumber < this.totalPages - 1) { this.pageNumber++; this.loadUsers(); } }

  toggleUserStatus(user: User): void {
    const currentState = user.active !== undefined ? user.active : user.isActive;
    const request: UserRequest = {
      active: !currentState,
      isActive: !currentState
    };

    this.userService.updateUserById(user.id, request).subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex(u => u.id === updatedUser.id);
        if (index !== -1) {
          this.users[index] = updatedUser;
        }
      },
      error: (err) => {
        console.error('Error updating user', err);
        alert('Failed to update user status.');
      }
    });
  }

  deleteUser(id: number): void {
    if(confirm('Are you sure you want to completely delete this user?')) {
      this.userService.deleteUserById(id).subscribe({
        next: () => {
          this.users = this.users.filter(u => u.id !== id);
        },
        error: (err) => {
          console.error('Error deleting user', err);
          alert('Failed to delete user.');
        }
      });
    }
  }

  getRoleIcon(role: string): string {
    switch (role) {
      case 'ADMIN': return '👑';
      case 'CORPORATE': return '🏢';
      case 'INDIVIDUAL': return '👤';
      default: return '❓';
    }
  }

  isUserActive(user: User): boolean {
    return user.active !== undefined ? !!user.active : !!user.isActive;
  }

  goToPage(pageStr: string): void {
    const page = parseInt(pageStr, 10);
    if (!isNaN(page) && page > 0 && page <= this.totalPages) {
      this.pageNumber = page - 1;
      this.loadUsers();
    }
  }
}
