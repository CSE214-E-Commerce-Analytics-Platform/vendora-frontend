import { inject } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";


export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const expectedRoles: string[] = route.data['roles'];
    const userRole = authService.getRole();

    if (userRole && expectedRoles.includes(userRole)) {
        return true;
    }

    return router.createUrlTree(['/forbidden']);
}