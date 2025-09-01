import { Directive, inject, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';

@Directive()
export abstract class BaseRouteComponent implements OnInit, OnDestroy {
  protected router = inject(Router);
  protected routeSubscription?: Subscription;

  abstract updateSelectionFromRoute(url: string): void;

  ngOnInit(): void {
    // Set initial selection based on current route
    this.updateSelectionFromRoute(this.router.url);

    // Listen for route changes
    const self = this;
    this.routeSubscription = this.router.events
      .pipe(
        filter(function filterNavigationEnd(event) {
          return event instanceof NavigationEnd;
        })
      )
      .subscribe(function routeChangeSubscription() {
        self.updateSelectionFromRoute(self.router.url);
      });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }
}
