import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { NotificationService } from '../../../shared/services/notification.service';
import { UniverseValidationService } from './universe-validation.service';

describe('UniverseValidationService', () => {
  let service: UniverseValidationService;
  let mockNotification: {
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockNotification = {
      error: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        UniverseValidationService,
        { provide: NotificationService, useValue: mockNotification },
      ],
    });

    service = TestBed.inject(UniverseValidationService);
  });

  describe('validateFieldValue', () => {
    it('should validate distribution field', () => {
      expect(service.validateFieldValue('distribution', 10)).toBe(true);
      expect(service.validateFieldValue('distribution', -5)).toBe(false);
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Distribution value cannot be negative'
      );
    });

    it('should validate distributions_per_year field', () => {
      expect(service.validateFieldValue('distributions_per_year', 12)).toBe(
        true
      );
      expect(service.validateFieldValue('distributions_per_year', -1)).toBe(
        false
      );
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Distributions per year cannot be negative'
      );
    });

    it('should validate ex_date field', () => {
      expect(service.validateFieldValue('ex_date', '2024-12-31')).toBe(true);
      expect(service.validateFieldValue('ex_date', 'invalid')).toBe(false);
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Invalid date format'
      );
    });

    it('should return true for unknown fields', () => {
      expect(service.validateFieldValue('unknown_field', 'any value')).toBe(
        true
      );
    });
  });

  describe('transformExDateValue', () => {
    it('should return null for null input', () => {
      expect(service.transformExDateValue(null)).toBe(null);
    });

    it('should return null for empty string', () => {
      expect(service.transformExDateValue('')).toBe(null);
    });

    it('should return INVALID_DATE for invalid Date object', () => {
      expect(service.transformExDateValue(new Date('invalid'))).toBe(
        'INVALID_DATE'
      );
    });

    it('should convert Date object to ISO DateTime string', () => {
      const date = new Date(2024, 5, 15); // June 15, 2024
      const result = service.transformExDateValue(date);
      expect(result).toBe('2024-06-15T00:00:00.000Z');
    });

    it('should return string values as-is', () => {
      expect(service.transformExDateValue('2024-12-31')).toBe('2024-12-31');
    });
  });

  describe('validateDistribution', () => {
    it('should accept positive numbers', () => {
      expect(service.validateFieldValue('distribution', 10.5)).toBe(true);
    });

    it('should accept zero', () => {
      expect(service.validateFieldValue('distribution', 0)).toBe(true);
    });

    it('should reject negative numbers', () => {
      expect(service.validateFieldValue('distribution', -5)).toBe(false);
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Distribution value cannot be negative'
      );
    });

    it('should accept non-numeric values', () => {
      expect(service.validateFieldValue('distribution', 'not a number')).toBe(
        true
      );
    });
  });

  describe('validateDistributionsPerYear', () => {
    it('should accept positive integers', () => {
      expect(service.validateFieldValue('distributions_per_year', 12)).toBe(
        true
      );
    });

    it('should accept zero', () => {
      expect(service.validateFieldValue('distributions_per_year', 0)).toBe(
        true
      );
    });

    it('should reject negative numbers', () => {
      expect(service.validateFieldValue('distributions_per_year', -1)).toBe(
        false
      );
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Distributions per year cannot be negative'
      );
    });

    it('should reject non-integer numbers', () => {
      expect(service.validateFieldValue('distributions_per_year', 10.5)).toBe(
        false
      );
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Distributions per year must be a whole number'
      );
    });

    it('should accept non-numeric values', () => {
      expect(
        service.validateFieldValue('distributions_per_year', 'not a number')
      ).toBe(true);
    });
  });

  describe('validateExDate', () => {
    it('should accept null values', () => {
      expect(service.validateFieldValue('ex_date', null)).toBe(true);
    });

    it('should accept non-string values', () => {
      expect(service.validateFieldValue('ex_date', 123)).toBe(true);
    });

    it('should accept valid YYYY-MM-DD dates', () => {
      expect(service.validateFieldValue('ex_date', '2024-12-31')).toBe(true);
      expect(service.validateFieldValue('ex_date', '2020-01-01')).toBe(true);
    });

    it('should accept valid ISO DateTime strings', () => {
      expect(
        service.validateFieldValue('ex_date', '2024-12-31T00:00:00.000Z')
      ).toBe(true);
    });

    it('should reject invalid date formats', () => {
      expect(service.validateFieldValue('ex_date', '12/31/2024')).toBe(false);
      expect(service.validateFieldValue('ex_date', '2024-13-01')).toBe(false);
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Invalid date format'
      );
    });

    it('should reject invalid dates like Feb 30', () => {
      expect(service.validateFieldValue('ex_date', '2024-02-30')).toBe(false);
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Invalid date format'
      );
    });

    it('should accept leap year dates', () => {
      expect(service.validateFieldValue('ex_date', '2024-02-29')).toBe(true);
    });

    it('should reject Feb 29 on non-leap years', () => {
      expect(service.validateFieldValue('ex_date', '2023-02-29')).toBe(false);
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Invalid date format'
      );
    });
  });
});
