import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

// Import commented out during TDD RED phase - service doesn't exist yet
// import { UpdateUniverseFieldsService } from './update-universe-fields.service';

describe.skip('UpdateUniverseFieldsService', () => {
  let service: any; // UpdateUniverseFieldsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        // UpdateUniverseFieldsService, // Uncomment in Story AL.2 (GREEN phase)
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    // uncommented during TDD RED phase - service doesn't exist yet
    // service = TestBed.inject(UpdateUniverseFieldsService); // Uncomment in Story AL.2
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

    it('should call API endpoint /api/universe/update-fields', () => {
      service.updateFields().subscribe();

      const req = httpMock.expectOne('/api/universe/update-fields');
      expect(req.request.method).toBe('POST');
      req.flush({ updated: 10 });
    });

    it('should return observable with update summary', (done) => {
      service.updateFields().subscribe((result) => {
        expect(result).toEqual({ updated: 10 });
        done();
      });

      const req = httpMock.expectOne('/api/universe/update-fields');
      req.flush({ updated: 10 });
    });

    it('should set isUpdating to false after successful update', (done) => {
      service.updateFields().subscribe(() => {
        expect(service.isUpdating()).toBe(false);
        done();
      });

      const req = httpMock.expectOne('/api/universe/update-fields');
      req.flush({ updated: 10 });
    });

    it('should set isUpdating to false after error', (done) => {
      service.updateFields().subscribe({
        error: () => {
          expect(service.isUpdating()).toBe(false);
          done();
        },
      });

      const req = httpMock.expectOne('/api/universe/update-fields');
      req.error(new ProgressEvent('error'));
    });

    it('should handle HTTP errors gracefully', (done) => {
      service.updateFields().subscribe({
        error: (error) => {
          expect(error).toBeDefined();
          done();
        },
      });

      const req = httpMock.expectOne('/api/universe/update-fields');
      req.flush('Update failed', { status: 500, statusText: 'Server Error' });
    });

    it('should validate response data', (done) => {
      service.updateFields().subscribe({
        error: (error) => {
          expect(error.message).toContain('No response');
          done();
        },
      });

      const req = httpMock.expectOne('/api/universe/update-fields');
      req.flush(null);
    });
  });
});
