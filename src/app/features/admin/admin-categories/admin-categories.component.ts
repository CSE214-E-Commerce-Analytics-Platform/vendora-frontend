import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../../core/services/category.service';
import { Category, CategoryRequest } from '../../../shared/models/category';
import { extractErrorMessage } from '../../../core/utils/error.util';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-categories.component.html',
  styleUrl: './admin-categories.component.css',
  encapsulation: ViewEncapsulation.None
})
export class AdminCategoriesComponent implements OnInit {

  categories: Category[] = [];
  isLoading = true;
  errorMessage = '';
  successMessage = '';

  // Modal state
  showModal = false;
  isSaving = false;
  modalError = '';
  editingCategoryId: number | null = null;

  // Form fields (plain ngModel, no ReactiveFormsModule needed)
  formName = '';
  formParentId: number | null = null;

  constructor(private categoryService: CategoryService) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.categoryService.getAllCategories({ pageNumber: 0, pageSize: 100 }).subscribe({
      next: (res) => {
        this.categories = res?.content || [];
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, 'Failed to load categories.');
        this.isLoading = false;
      }
    });
  }

  openCreateModal(): void {
    this.editingCategoryId = null;
    this.formName = '';
    this.formParentId = null;
    this.modalError = '';
    this.showModal = true;
  }

  openEditModal(category: Category): void {
    this.editingCategoryId = category.id;
    this.formName = category.name;
    this.formParentId = category.parentId;
    this.modalError = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.modalError = '';
  }

  saveCategory(): void {
    if (!this.formName.trim()) {
      this.modalError = 'Category name cannot be empty.';
      return;
    }

    this.isSaving = true;
    this.modalError = '';

    const request: CategoryRequest = {
      name: this.formName.trim(),
      parentId: this.formParentId ? Number(this.formParentId) : null
    };

    if (this.editingCategoryId !== null) {
      this.categoryService.updateCategoryById(this.editingCategoryId, request).subscribe({
        next: (updated) => {
          const idx = this.categories.findIndex(c => c.id === updated.id);
          if (idx !== -1) this.categories[idx] = updated;
          this.isSaving = false;
          this.closeModal();
          this.showSuccess('Category updated successfully.');
        },
        error: (err) => {
          this.modalError = extractErrorMessage(err, 'Failed to update category.');
          this.isSaving = false;
        }
      });
    } else {
      this.categoryService.createCategory(request).subscribe({
        next: (created) => {
          this.categories.push(created);
          this.isSaving = false;
          this.closeModal();
          this.showSuccess('Category created successfully.');
        },
        error: (err) => {
          this.modalError = extractErrorMessage(err, 'Failed to create category.');
          this.isSaving = false;
        }
      });
    }
  }

  deleteCategory(id: number): void {
    if (!confirm('Are you sure you want to delete this category? Products using it may be affected.')) return;
    this.categoryService.deleteCategoryById(id).subscribe({
      next: () => {
        this.categories = this.categories.filter(c => c.id !== id);
        this.showSuccess('Category deleted.');
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, 'Failed to delete category. It might be in use.');
      }
    });
  }

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 3500);
  }
}
