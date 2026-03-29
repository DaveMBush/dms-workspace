import { TestBed } from '@angular/core/testing';

import { StatePersistenceService } from './state-persistence.service';

describe('StatePersistenceService', () => {
  let service: StatePersistenceService;
  let mockGetItem: ReturnType<typeof vi.fn>;
  let mockSetItem: ReturnType<typeof vi.fn>;
  let mockRemoveItem: ReturnType<typeof vi.fn>;

  const STORAGE_KEY = 'dms-ui-state';

  beforeEach(() => {
    mockGetItem = vi.fn();
    mockSetItem = vi.fn();
    mockRemoveItem = vi.fn();

    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: mockGetItem,
        setItem: mockSetItem,
        removeItem: mockRemoveItem,
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(StatePersistenceService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('saveState', () => {
    it('should exist as a method', () => {
      expect(service.saveState).toBeDefined();
    });

    it('should save state to localStorage under the storage key', () => {
      mockGetItem.mockReturnValue(JSON.stringify({}));

      service.saveState('test-key', 'test-value');

      expect(mockSetItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify({ 'test-key': 'test-value' })
      );
    });

    it('should merge with existing state when saving', () => {
      mockGetItem.mockReturnValue(
        JSON.stringify({ 'existing-key': 'existing-value' })
      );

      service.saveState('new-key', 'new-value');

      expect(mockSetItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify({
          'existing-key': 'existing-value',
          'new-key': 'new-value',
        })
      );
    });

    it('should overwrite existing key when saving same key', () => {
      mockGetItem.mockReturnValue(JSON.stringify({ 'test-key': 'old-value' }));

      service.saveState('test-key', 'new-value');

      expect(mockSetItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify({ 'test-key': 'new-value' })
      );
    });

    it('should serialize complex objects to JSON', () => {
      mockGetItem.mockReturnValue(JSON.stringify({}));
      const complexValue = { nested: { data: [1, 2, 3] }, flag: true };

      service.saveState('complex-key', complexValue);

      expect(mockSetItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify({ 'complex-key': complexValue })
      );
    });

    it('should handle save when localStorage has corrupted data', () => {
      mockGetItem.mockReturnValue('not-valid-json{{{');

      service.saveState('test-key', 'test-value');

      expect(mockSetItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify({ 'test-key': 'test-value' })
      );
    });

    it('should not throw when localStorage.setItem throws', () => {
      mockGetItem.mockReturnValue(JSON.stringify({}));
      mockSetItem.mockImplementation(function throwOnSetItem() {
        throw new Error('QuotaExceededError');
      });

      expect(() => {
        service.saveState('test-key', 'test-value');
      }).not.toThrow();
    });
  });

  describe('loadState', () => {
    it('should exist as a method', () => {
      expect(service.loadState).toBeDefined();
    });

    it('should load state from localStorage', () => {
      mockGetItem.mockReturnValue(
        JSON.stringify({ 'test-key': 'saved-value' })
      );

      const result = service.loadState('test-key', 'default');

      expect(result).toBe('saved-value');
    });

    it('should return default value when key does not exist', () => {
      mockGetItem.mockReturnValue(JSON.stringify({}));

      const result = service.loadState('missing-key', 'default-value');

      expect(result).toBe('default-value');
    });

    it('should return default value when no saved state exists', () => {
      mockGetItem.mockReturnValue(null);

      const result = service.loadState('any-key', 42);

      expect(result).toBe(42);
    });

    it('should deserialize complex objects from JSON', () => {
      const complexValue = { nested: { data: [1, 2, 3] }, flag: true };
      mockGetItem.mockReturnValue(
        JSON.stringify({ 'complex-key': complexValue })
      );

      const result = service.loadState('complex-key', {});

      expect(result).toEqual(complexValue);
    });

    it('should return default value when localStorage has invalid JSON', () => {
      mockGetItem.mockReturnValue('this is not json');

      const result = service.loadState('test-key', 'fallback');

      expect(result).toBe('fallback');
    });

    it('should return default value when localStorage has corrupted data', () => {
      mockGetItem.mockReturnValue('{corrupted: data}}}');

      const result = service.loadState('test-key', 'safe-default');

      expect(result).toBe('safe-default');
    });

    it('should handle numeric default values', () => {
      mockGetItem.mockReturnValue(JSON.stringify({ 'tab-index': 2 }));

      const result = service.loadState('tab-index', 0);

      expect(result).toBe(2);
    });

    it('should handle boolean default values', () => {
      mockGetItem.mockReturnValue(JSON.stringify({ expanded: true }));

      const result = service.loadState('expanded', false);

      expect(result).toBe(true);
    });

    it('should return default when stored data is a JSON array', () => {
      mockGetItem.mockReturnValue('[1, 2, 3]');

      const result = service.loadState('test-key', 'fallback');

      expect(result).toBe('fallback');
    });
  });

  describe('clearState', () => {
    it('should exist as a method', () => {
      expect(service.clearState).toBeDefined();
    });

    it('should remove specific key from localStorage state', () => {
      mockGetItem.mockReturnValue(
        JSON.stringify({ 'key-a': 'value-a', 'key-b': 'value-b' })
      );

      service.clearState('key-a');

      expect(mockSetItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify({ 'key-b': 'value-b' })
      );
    });

    it('should remove all state when no key is provided', () => {
      service.clearState();

      expect(mockRemoveItem).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('should handle clearing a key that does not exist', () => {
      mockGetItem.mockReturnValue(JSON.stringify({ 'existing-key': 'value' }));

      service.clearState('non-existent-key');

      expect(mockSetItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify({ 'existing-key': 'value' })
      );
    });

    it('should handle clearing when localStorage has corrupted data', () => {
      mockGetItem.mockReturnValue('invalid json!!!');

      expect(() => {
        service.clearState('some-key');
      }).not.toThrow();
    });

    it('should not throw when localStorage.removeItem throws', () => {
      mockRemoveItem.mockImplementation(function throwOnRemoveItem() {
        throw new Error('Storage error');
      });

      expect(() => {
        service.clearState();
      }).not.toThrow();
    });
  });
});
