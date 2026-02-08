import { inject, Injectable } from '@angular/core';

import { NotificationService } from '../../../shared/services/notification.service';

@Injectable({
  providedIn: 'root',
})
export class UniverseValidationService {
  private readonly notification = inject(NotificationService);

  validateFieldValue(field: string, value: unknown): boolean {
    if (field === 'distribution') {
      return this.validateDistribution(value);
    }
    if (field === 'distributions_per_year') {
      return this.validateDistributionsPerYear(value);
    }
    if (field === 'ex_date') {
      return this.validateExDate(value);
    }
    return true;
  }

  transformExDateValue(value: unknown): unknown {
    // Handle null explicitly
    if (value === null) {
      return null;
    }

    // Handle empty string - convert to null
    if (value === '') {
      return null;
    }

    // Handle Date objects
    if (value instanceof Date) {
      // Check if date is valid
      if (isNaN(value.getTime())) {
        // Return a string that will fail validation
        // This triggers the error in validateExDate
        return 'INVALID_DATE';
      }
      // Convert to ISO DateTime string for Prisma
      // Use UTC midnight to avoid timezone issues
      const utcDate = new Date(
        Date.UTC(
          value.getFullYear(),
          value.getMonth(),
          value.getDate(),
          0,
          0,
          0,
          0
        )
      );
      return utcDate.toISOString();
    }

    // Return string values as-is for validation
    return value;
  }

  private validateDistribution(value: unknown): boolean {
    if (typeof value === 'number' && value < 0) {
      this.notification.error('Distribution value cannot be negative');
      return false;
    }
    return true;
  }

  private validateDistributionsPerYear(value: unknown): boolean {
    if (typeof value !== 'number') {
      return true;
    }
    if (value < 0) {
      this.notification.error('Distributions per year cannot be negative');
      return false;
    }
    if (!Number.isInteger(value)) {
      this.notification.error('Distributions per year must be a whole number');
      return false;
    }
    return true;
  }

  private validateExDate(value: unknown): boolean {
    // Allow null values to clear the date
    if (value === null) {
      return true;
    }

    if (typeof value !== 'string') {
      return true;
    }

    // Accept both YYYY-MM-DD and ISO DateTime formats
    const isoDateRegex =
      /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)?$/;

    if (!isoDateRegex.test(value)) {
      this.notification.error('Invalid date format');
      return false;
    }

    return this.validateDateComponents(value);
  }

  private validateDateComponents(value: string): boolean {
    // Extract date components
    const datePart = value.split('T')[0];
    const parts = datePart.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    // Create Date object based on format
    const isUTC = value.includes('T') && value.endsWith('Z');
    const date = isUTC ? new Date(value) : new Date(year, month - 1, day);

    if (isNaN(date.getTime())) {
      this.notification.error('Invalid date value');
      return false;
    }

    // Verify parsed date matches input
    const parsedYear = isUTC ? date.getUTCFullYear() : date.getFullYear();
    const parsedMonth = isUTC ? date.getUTCMonth() + 1 : date.getMonth() + 1;
    const parsedDay = isUTC ? date.getUTCDate() : date.getDate();

    if (parsedYear !== year || parsedMonth !== month || parsedDay !== day) {
      this.notification.error('Invalid date format');
      return false;
    }

    return true;
  }
}
