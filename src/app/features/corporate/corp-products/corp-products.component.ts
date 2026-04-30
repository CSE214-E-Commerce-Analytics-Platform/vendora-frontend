import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { StoreService } from '../../../core/services/store.service';
import { CategoryService } from '../../../core/services/category.service';
import { Product, ProductRequest } from '../../../shared/models/product';
import { Store } from '../../../shared/models/store';
import { Category } from '../../../shared/models/category';

@Component({
  selector: 'app-corp-products',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './corp-products.component.html',
  styleUrl: './corp-products.component.css'
})
export class CorpProductsComponent implements OnInit {

  categories: Category[] = [];
  products: Product[] = [];
  
  selectedStoreId: number | null = null;
  isLoading: boolean = false;
  
  productForm: FormGroup;
  showProductModal: boolean = false;
  editingProductId: number | null = null;

  // Pagination
  pageNumber = 0;
  pageSize = 20;
  totalPages = 0;

  constructor(
    private productService: ProductService,
    private storeService: StoreService,
    private categoryService: CategoryService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      imageUrl: ['', Validators.required],
      sku: ['', Validators.required],
      unitPrice: [0, [Validators.required, Validators.min(0.01)]],
      stockQuantity: [0, [Validators.required, Validators.min(0)]],
      categoryId: [null, Validators.required],
      storeId: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    // Load categories
    this.categoryService.getAllCategories({ pageNumber: 0, pageSize: 100 }).subscribe({
      next: (res) => this.categories = res?.content || [],
      error: (err) => console.error("Could not load categories", err)
    });

    // Load single store (1:1)
    this.storeService.getMyStores({ pageNumber: 0, pageSize: 10 }).subscribe({
      next: (res) => {
        const stores = res?.content || [];
        if (stores.length > 0) {
          this.selectedStoreId = stores[0].id;
          this.productForm.patchValue({ storeId: this.selectedStoreId });
          this.loadProducts();
        }
      },
      error: (err) => console.error("Could not load store", err)
    });
  }

  loadProducts(): void {
    if (!this.selectedStoreId) return;
    this.isLoading = true;
    this.productService.getProductsByStoreId(this.selectedStoreId, { pageNumber: this.pageNumber, pageSize: this.pageSize }).subscribe({
      next: (res) => {
        this.products = res?.content || [];
        this.totalPages = Math.ceil((res?.totalElement || 0) / this.pageSize);
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Could not load products", err);
        this.isLoading = false;
      }
    });
  }

  prevPage(): void { if (this.pageNumber > 0) { this.pageNumber--; this.loadProducts(); } }
  nextPage(): void { if (this.pageNumber < this.totalPages - 1) { this.pageNumber++; this.loadProducts(); } }

  openProductModal(product?: Product): void {
    if (product) {
      this.editingProductId = product.id;
      // We need to map categoryName to categoryId here somehow, but we only have categoryName from Product response.
      // Usually, backend should return categoryId, but since it returns categoryName in Product response, we'll try to find its ID.
      const category = this.categories.find(c => c.name === product.categoryName);
      
      this.productForm.patchValue({
        name: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
        sku: product.sku,
        unitPrice: product.unitPrice,
        stockQuantity: product.stockQuantity,
        categoryId: category ? category.id : null,
        storeId: product.storeId
      });
    } else {
      this.editingProductId = null;
      this.productForm.reset({
        storeId: this.selectedStoreId,
        unitPrice: 0,
        stockQuantity: 0
      });
    }
    this.showProductModal = true;
  }

  closeProductModal(): void {
    this.showProductModal = false;
  }

  saveProduct(): void {
    if (this.productForm.invalid) return;

    const formValue = this.productForm.value;
    const request: ProductRequest = {
      name: formValue.name,
      description: formValue.description,
      imageUrl: formValue.imageUrl,
      sku: formValue.sku,
      unitPrice: formValue.unitPrice,
      stockQuantity: formValue.stockQuantity,
      categoryId: formValue.categoryId ? +formValue.categoryId : null,
      storeId: formValue.storeId ? +formValue.storeId : this.selectedStoreId!
    };

    if (this.editingProductId) {
      this.productService.updateProduct(this.editingProductId, request).subscribe({
        next: (updatedProduct) => {
          const index = this.products.findIndex(p => p.id === updatedProduct.id);
          if (index !== -1) {
             this.products[index] = updatedProduct;
          } else {
             this.loadProducts();
          }
          this.closeProductModal();
        },
        error: (err) => {
          console.error("Error updating product", err);
          alert("An error occurred while updating the product.");
        }
      });
    } else {
      this.productService.createProduct(request).subscribe({
        next: (newProduct) => {
          this.products.push(newProduct);
          this.closeProductModal();
        },
        error: (err) => {
          console.error("Error creating product", err);
          alert("An error occurred while creating the product.");
        }
      });
    }
  }

  deleteProduct(productId: number): void {
    if (confirm("Are you sure you want to delete this product?")) {
      this.productService.deleteProduct(productId).subscribe({
        next: () => {
          this.products = this.products.filter(p => p.id !== productId);
        },
        error: (err) => {
          console.error("Error deleting product", err);
          alert("An error occurred while deleting the product.");
        }
      });
    }
  }

  getImageUrl(url: string | null | undefined): string {
    if (!url) {
      return 'assets/placeholder-product.png';
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('assets/images/')) {
      return url;
    }
    return `assets/images/${url}`;
  }

  goToPage(pageStr: string): void {
    const page = parseInt(pageStr, 10);
    if (!isNaN(page) && page > 0 && page <= this.totalPages) {
      this.pageNumber = page - 1;
      this.loadProducts();
    }
  }
}
