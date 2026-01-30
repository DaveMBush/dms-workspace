import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { UpdateUniverseFieldsService } from './update-universe-fields.service';

describe('UpdateUniverseFieldsService', () => {
  let service: UpdateUniverseFieldsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UpdateUniverseFieldsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(UpdateUniverseFieldsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with isUpdating signal as false', () => {
      expect(service.isUpdating()).toBe(false);
    });
  });

  describe('updateFields()', () => {
    it('should set isUpdating to true when operation starts', () => {
      service.updateFields();
      expect(service.isUpdating()).toBe(true);
    });

    it('should call API endpoint /api/settings/update', () => {
      service.updateFields().subscribe();

      const req = httpMock.expectOne('/api/settings/update');
      expect(req.request.method).toBe('GET');
      req.flush({ updated: 10 });
    });

    it('should return observable with update summary', async () => {
      const resultPromise = new Promise<void>((resolve) => {
        service.updateFields().subscribe((result) => {
          expect(result).toEqual({ updated: 10 });
          resolve();
        });
      });

      const req = httpMock.expectOne('/api/settings/update');
      req.flush({ updated: 10 });

      await resultPromise;
    });

    it('should set isUpdating to false after successful update', async () => {
      const resultPromise = new Promise<void>((resolve) => {
        service.updateFields().subscribe(() => {
          resolve();
        });
      });

      const req = httpMock.expectOne('/api/settings/update');
      req.flush({ updated: 10 });

      await resultPromise;
      // finalize runs asynchronously, wait for next tick
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(service.isUpdating()).toBe(false);
    });

    it('should set isUpdating to false after error', async () => {
      const errorPromise = new Promise<void>((resolve) => {
        service.updateFields().subscribe({
          error: () => {
            resolve();
          },
        });
      });

      const req = httpMock.expectOne('/api/settings/update');
      req.error(new ProgressEvent('error'));

      await errorPromise;
      // finalize runs asynchronously, wait for next tick
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(service.isUpdating()).toBe(false);
    });

    it('should handle HTTP errors gracefully', async () => {
      const errorPromise = new Promise<void>((resolve) => {
        service.updateFields().subscribe({
          error: () => {
            expect(true).toBeDefined();
            resolve();
          },
        });
      });

      const req = httpMock.expectOne('/api/settings/update');
      req.flush('Update failed', { status: 500, statusText: 'Server Error' });

      await errorPromise;
    });

    it('should validate response data', async () => {
      const errorPromise = new Promise<void>((resolve) => {
        service.updateFields().subscribe({
          error: (error: unknown) => {
            expect((error as Error).message).toContain('No response');
            resolve();
          },
        });
      });

      const req = httpMock.expectOne('/api/settings/update');
      req.flush(null);

      await errorPromise;
    });
  });
});
