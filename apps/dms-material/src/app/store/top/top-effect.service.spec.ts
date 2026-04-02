import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { PartialArrayDefinition } from '@smarttools/smart-signals';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { Top } from './top.interface';
import { TopEffectsService } from './top-effect.service';

describe('TopEffectsService', () => {
  let service: TopEffectsService;
  let httpMock: { post: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    httpMock = {
      post: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        TopEffectsService,
        { provide: HttpClient, useValue: httpMock },
      ],
    });
    service = TestBed.inject(TopEffectsService);
  });

  describe('loadByIds', () => {
    it('should call POST /api/top with ids', () => {
      const mockResponse: Top[] = [];
      httpMock.post.mockReturnValue(of(mockResponse));

      let result: Top[] | undefined;
      service.loadByIds(['1']).subscribe(function handleResult(r) {
        result = r;
      });

      expect(httpMock.post).toHaveBeenCalledWith('./api/top', ['1']);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('loadByIndexes', () => {
    it('should call POST /api/top/indexes with correct body', () => {
      const mockResponse: PartialArrayDefinition = {
        startIndex: 50,
        indexes: ['uni-51', 'uni-52'],
        length: 100,
      };
      httpMock.post.mockReturnValue(of(mockResponse));

      let result: PartialArrayDefinition | undefined;
      service
        .loadByIndexes('1', 'universes', 50, 20)
        .subscribe(function handleResult(r) {
          result = r;
        });

      expect(httpMock.post).toHaveBeenCalledWith('./api/top/indexes', {
        parentId: '1',
        childField: 'universes',
        startIndex: 50,
        length: 20,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should pass different startIndex and length values', () => {
      httpMock.post.mockReturnValue(
        of({ startIndex: 0, indexes: [], length: 0 })
      );

      service.loadByIndexes('1', 'universes', 0, 50).subscribe();

      expect(httpMock.post).toHaveBeenCalledWith('./api/top/indexes', {
        parentId: '1',
        childField: 'universes',
        startIndex: 0,
        length: 50,
      });
    });
  });

  describe('update', () => {
    it('should return empty array', () => {
      let result: Top[] | undefined;
      service.update({ id: '1' } as Top).subscribe(function handleResult(r) {
        result = r;
      });
      expect(result).toEqual([]);
    });
  });

  describe('add', () => {
    it('should return empty array', () => {
      let result: Top[] | undefined;
      service.add({ id: '1' } as Top).subscribe(function handleResult(r) {
        result = r;
      });
      expect(result).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should complete without error', () => {
      let completed = false;
      service.delete('1').subscribe({
        complete: function handleComplete() {
          completed = true;
        },
      });
      expect(completed).toBe(true);
    });
  });
});
