import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

// Auth sayfaları — eager (ilk yüklemede gerekli)
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';
import { VerifyEmailComponent } from './features/auth/verify-email/verify-email.component';
import { ForbiddenComponent } from './features/auth/forbidden/forbidden.component';
import { OAuth2CallbackComponent } from './features/auth/oauth2-callback/oauth2-callback.component';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'forgot-password', component: ForgotPasswordComponent },
    { path: 'reset-password', component: ResetPasswordComponent },
    { path: 'verify-email', component: VerifyEmailComponent },
    { path: 'oauth2/callback', component: OAuth2CallbackComponent },

    // ── Individual Paneli ──────────────────────────────────────────────────────
    {
        path: 'individual',
        loadComponent: () => import('./features/individual/individual-layout/individual-layout.component')
            .then(m => m.IndividualLayoutComponent),
        canActivate: [authGuard, roleGuard],
        data: { roles: ['INDIVIDUAL'] },
        children: [
            {
                path: 'products',
                loadComponent: () => import('./features/individual/ind-products/ind-products.component')
                    .then(m => m.IndProductsComponent)
            },
            {
                path: 'products/:id',
                loadComponent: () => import('./features/products/product-detail/product-detail.component')
                    .then(m => m.ProductDetailComponent)
            },
            {
                path: 'stores',
                loadComponent: () => import('./features/individual/ind-stores/ind-stores.component')
                    .then(m => m.IndStoresComponent)
            },
            {
                path: 'stores/:id',
                loadComponent: () => import('./features/individual/ind-store-detail/ind-store-detail.component')
                    .then(m => m.IndStoreDetailComponent)
            },
            {
                path: 'cart',
                loadComponent: () => import('./features/individual/ind-cart/ind-cart.component')
                    .then(m => m.IndCartComponent)
            },
            {
                path: 'orders',
                loadComponent: () => import('./features/individual/ind-orders/ind-orders.component')
                    .then(m => m.IndOrdersComponent)
            },
            {
                path: 'orders/:id',
                loadComponent: () => import('./features/individual/ind-order-detail/ind-order-detail.component')
                    .then(m => m.IndOrderDetailComponent)
            },
            {
                path: 'history',
                loadComponent: () => import('./features/individual/ind-history/ind-history.component')
                    .then(m => m.IndHistoryComponent)
            },
            {
                path: 'reviews',
                loadComponent: () => import('./features/individual/ind-reviews/ind-reviews.component')
                    .then(m => m.IndReviewsComponent)
            },
            {
                path: 'analytics',
                loadComponent: () => import('./features/individual/ind-analytics/ind-analytics.component')
                    .then(m => m.IndAnalyticsComponent)
            },
            {
                path: 'profile',
                loadComponent: () => import('./features/individual/ind-profile/ind-profile.component')
                    .then(m => m.IndProfileComponent)
            },
            {
                path: 'addresses',
                loadComponent: () => import('./features/individual/ind-addresses/ind-addresses.component')
                    .then(m => m.IndAddressesComponent)
            },
            {
                path: 'become-corporate',
                loadComponent: () => import('./features/individual/ind-corporate-apply/ind-corporate-apply.component')
                    .then(m => m.IndCorporateApplyComponent)
            },
            { path: '', redirectTo: 'products', pathMatch: 'full' }
        ]
    },

    // ── Admin Paneli ───────────────────────────────────────────────────────────
    {
        path: 'admin',
        loadComponent: () => import('./features/admin/admin-layout/admin-layout.component')
            .then(m => m.AdminLayoutComponent),
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN'] },
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./features/admin/admin-dashboard/admin-dashboard.component')
                    .then(m => m.AdminDashboardComponent)
            },
            {
                path: 'users',
                loadComponent: () => import('./features/admin/admin-users/admin-users.component')
                    .then(m => m.AdminUsersComponent)
            },
            {
                path: 'carts',
                loadComponent: () => import('./features/admin/admin-carts/admin-carts.component')
                    .then(m => m.AdminCartsComponent)
            },
            {
                path: 'stores',
                loadComponent: () => import('./features/admin/admin-stores/admin-stores.component')
                    .then(m => m.AdminStoresComponent)
            },
            {
                path: 'stores/:id',
                loadComponent: () => import('./features/individual/ind-store-detail/ind-store-detail.component')
                    .then(m => m.IndStoreDetailComponent)
            },
            {
                path: 'products/:id',
                loadComponent: () => import('./features/products/product-detail/product-detail.component')
                    .then(m => m.ProductDetailComponent)
            },
            {
                path: 'categories',
                loadComponent: () => import('./features/admin/admin-categories/admin-categories.component')
                    .then(m => m.AdminCategoriesComponent)
            },
            {
                path: 'settings',
                loadComponent: () => import('./features/admin/admin-settings/admin-settings.component')
                    .then(m => m.AdminSettingsComponent)
            },
            {
                path: 'audit-logs',
                loadComponent: () => import('./features/admin/admin-audit-logs/admin-audit-logs.component')
                    .then(m => m.AdminAuditLogsComponent)
            },
            {
                path: 'corporate-requests',
                loadComponent: () => import('./features/admin/admin-corporate-requests/admin-corporate-requests.component')
                    .then(m => m.AdminCorporateRequestsComponent)
            },
            {
                path: 'orders',
                loadComponent: () => import('./features/admin/admin-orders/admin-orders.component')
                    .then(m => m.AdminOrdersComponent)
            },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
    },

    // ── Corporate Paneli ───────────────────────────────────────────────────────
    {
        path: 'corporate',
        loadComponent: () => import('./features/corporate/corporate-layout/corporate-layout.component')
            .then(m => m.CorporateLayoutComponent),
        canActivate: [authGuard, roleGuard],
        data: { roles: ['CORPORATE'] },
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./features/corporate/corp-dashboard/corp-dashboard.component')
                    .then(m => m.CorpDashboardComponent)
            },
            {
                path: 'products',
                loadComponent: () => import('./features/corporate/corp-products/corp-products.component')
                    .then(m => m.CorpProductsComponent)
            },
            {
                path: 'inventory',
                loadComponent: () => import('./features/corporate/corp-inventory/corp-inventory.component')
                    .then(m => m.CorpInventoryComponent)
            },
            {
                path: 'orders',
                loadComponent: () => import('./features/corporate/corp-orders/corp-orders.component')
                    .then(m => m.CorpOrdersComponent)
            },
            {
                path: 'analytics',
                loadComponent: () => import('./features/corporate/corp-analytics/corp-analytics.component')
                    .then(m => m.CorpAnalyticsComponent)
            },
            {
                path: 'reviews',
                loadComponent: () => import('./features/corporate/corp-reviews/corp-reviews.component')
                    .then(m => m.CorpReviewsComponent)
            },
            {
                path: 'shipments',
                loadComponent: () => import('./features/corporate/corp-shipments/corp-shipments.component')
                    .then(m => m.CorpShipmentsComponent)
            },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
    },

    // ── Diğer ─────────────────────────────────────────────────────────────────
    { 
        path: 'track/:trackingNumber', 
        loadComponent: () => import('./features/tracking/tracking.component').then(m => m.TrackingComponent) 
    },
    { path: 'forbidden', component: ForbiddenComponent },
    { path: '**', redirectTo: 'login' }
];
