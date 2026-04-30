import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { Router } from "@angular/router";

@Component({
    selector: 'app-forbidden',
    imports: [CommonModule],
    templateUrl: './forbidden.component.html',
    styleUrl: './forbidden.component.css'
})
export class ForbiddenComponent {

    constructor(private router: Router) { }

    goBack(): void {
        window.history.back();
    }

    goHome(): void {
        this.router.navigate(['/products']);
    }
}