import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ShipmentService } from '../../core/services/shipment.service';
import { DtoShipment, ShipmentStatus } from '../../shared/models/shipment';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tracking.component.html',
  styleUrl: './tracking.component.css'
})
export class TrackingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private shipmentService = inject(ShipmentService);

  trackingNumber: string | null = null;
  shipment: DtoShipment | null = null;
  error: string | null = null;
  isLoading = true;

  ngOnInit(): void {
    this.trackingNumber = this.route.snapshot.paramMap.get('trackingNumber');
    if (this.trackingNumber) {
      this.loadShipment(this.trackingNumber);
    } else {
      this.error = 'No tracking number provided.';
      this.isLoading = false;
    }
  }

  loadShipment(trackingNumber: string): void {
    this.shipmentService.track(trackingNumber).pipe(
      catchError(err => {
        this.error = 'Unable to find shipment. Please check your tracking number.';
        this.isLoading = false;
        return of(null);
      })
    ).subscribe(shipment => {
      if (shipment) {
        this.shipment = shipment;
      }
      this.isLoading = false;
    });
  }

  getStepStatus(stepIndex: number): string {
    if (!this.shipment) return 'pending';

    const statuses = [
      ShipmentStatus.PENDING,
      ShipmentStatus.LABEL_CREATED,
      ShipmentStatus.IN_TRANSIT,
      ShipmentStatus.OUT_FOR_DELIVERY,
      ShipmentStatus.DELIVERED
    ];

    const currentIndex = statuses.indexOf(this.shipment.status);
    
    // Handle CANCELLED or RETURNED as exceptions
    if (this.shipment.status === ShipmentStatus.CANCELLED || this.shipment.status === ShipmentStatus.RETURNED) {
       if (stepIndex <= currentIndex) return 'completed';
       return 'pending';
    }

    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'current';
    return 'pending';
  }
}
