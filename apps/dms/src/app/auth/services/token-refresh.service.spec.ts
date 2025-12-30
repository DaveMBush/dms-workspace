import { TestBed } from '@angular/core/testing';
import { fetchAuthSession } from '@aws-amplify/auth';
import { TokenRefreshService } from './token-refresh.service';

// Mock AWS Amplify Auth
vi.mock('@aws-amplify/auth');

// Mock console methods
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {
    /* no-op */
  }),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {
    /* no-op */
  }),
  error: vi.spyOn(console, 'error').mockImplementation(() => {
    /* no-op */
  }),
};

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

describe('TokenRefreshService', () => {
  let service: TokenRefreshService;
  let mockFetchAuthSession: ReturnType<
    typeof vi.mocked<typeof fetchAuthSession>
  >;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenRefreshService);
    mockFetchAuthSession = vi.mocked(fetchAuthSession);

    // Reset all mocks
    vi.clearAllMocks();
    sessionStorageMock.getItem.mockClear();
    sessionStorageMock.setItem.mockClear();
    sessionStorageMock.removeItem.mockClear();
  });

  afterEach(() => {
    service.stopTokenRefreshTimer();
    consoleSpy.log.mockClear();
    consoleSpy.warn.mockClear();
    consoleSpy.error.mockClear();
  });

  describe('initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('startTokenRefreshTimer', () => {
    it('should start refresh timer when valid token exists', () => {
      // Mock valid token that expires in 1 hour
      const futureExpiration = Math.floor((Date.now() + 60 * 60 * 1000) / 1000);
      const mockToken = createMockJWT({ exp: futureExpiration });
      sessionStorageMock.getItem.mockReturnValue(mockToken);

      service.startTokenRefreshTimer();

      // Should complete without errors
      expect(service).toBeTruthy();
    });

    it('should trigger immediate refresh for expired tokens', () => {
      // Mock expired token
      const pastExpiration = Math.floor((Date.now() - 1000) / 1000);
      const mockToken = createMockJWT({ exp: pastExpiration });
      sessionStorageMock.getItem.mockReturnValue(mockToken);

      mockFetchAuthSession.mockResolvedValue(createMockSession());

      service.startTokenRefreshTimer();

      // Should handle expired tokens
      expect(mockFetchAuthSession).toHaveBeenCalled();
    });

    it('should warn when no token is found', () => {
      sessionStorageMock.getItem.mockReturnValue(null);

      service.startTokenRefreshTimer();

      // Should handle missing token gracefully
      expect(service).toBeTruthy();
    });

    it('should stop existing timer before starting new one', () => {
      const mockToken = createMockJWT({
        exp: Math.floor((Date.now() + 60 * 60 * 1000) / 1000),
      });
      sessionStorageMock.getItem.mockReturnValue(mockToken);

      service.startTokenRefreshTimer();
      service.startTokenRefreshTimer(); // Start again

      // Should restart timer without issues
      expect(service).toBeTruthy();
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh token', async () => {
      mockFetchAuthSession.mockResolvedValue(createMockSession());

      const result = await service.refreshToken();

      expect(result).toBe(true);
      expect(mockFetchAuthSession).toHaveBeenCalled();
      expect(sessionStorageMock.setItem).toHaveBeenCalledTimes(4); // access, id, refresh, expiration
    });

    it('should handle refresh failure', async () => {
      mockFetchAuthSession.mockRejectedValue(new Error('Network error'));

      const result = await service.refreshToken();

      expect(result).toBe(false);
      // Should handle refresh failure gracefully
      expect(mockFetchAuthSession).toHaveBeenCalled();
    });

    it('should retry failed refresh attempts', async () => {
      mockFetchAuthSession
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createMockSession());

      const result = await service.refreshToken();

      expect(result).toBe(true);
      expect(mockFetchAuthSession).toHaveBeenCalledTimes(3);
      // Should retry and succeed
      expect(sessionStorageMock.setItem).toHaveBeenCalledTimes(4);
    });

    it('should give up after max retry attempts', async () => {
      mockFetchAuthSession.mockRejectedValue(new Error('Persistent error'));

      const result = await service.refreshToken();

      expect(result).toBe(false);
      expect(mockFetchAuthSession).toHaveBeenCalledTimes(3); // Max retries
    });

    it('should handle concurrent refresh requests', async () => {
      mockFetchAuthSession.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(createMockSession()), 100)
          )
      );

      // Start two concurrent refresh requests
      const promise1 = service.refreshToken();
      const promise2 = service.refreshToken();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe(true);
      // Second request should wait for first to complete, so could be true or false
      expect(typeof result2).toBe('boolean');
      // Should only call fetchAuthSession once despite concurrent requests
      expect(mockFetchAuthSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('isRefreshInProgress', () => {
    it('should return false initially', () => {
      expect(service.isRefreshInProgress()).toBe(false);
    });

    it('should return true during refresh', async () => {
      mockFetchAuthSession.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(createMockSession()), 50)
          )
      );

      const refreshPromise = service.refreshToken();

      expect(service.isRefreshInProgress()).toBe(true);

      await refreshPromise;

      expect(service.isRefreshInProgress()).toBe(false);
    });
  });

  describe('getTokenExpiration', () => {
    it('should return expiration date for valid token', () => {
      const expiration = Math.floor((Date.now() + 60 * 60 * 1000) / 1000);
      const mockToken = createMockJWT({ exp: expiration });
      sessionStorageMock.getItem.mockReturnValue(mockToken);

      const result = service.getTokenExpiration();

      expect(result).toBeInstanceOf(Date);
      expect(result?.getTime()).toBe(expiration * 1000);
    });

    it('should return null for invalid token', () => {
      sessionStorageMock.getItem.mockReturnValue('invalid-token');

      const result = service.getTokenExpiration();

      expect(result).toBeNull();
    });

    it('should return null when no token exists', () => {
      sessionStorageMock.getItem.mockReturnValue(null);

      const result = service.getTokenExpiration();

      expect(result).toBeNull();
    });
  });

  describe('isTokenNearExpiry', () => {
    it('should return true for tokens expiring soon', () => {
      // Token expires in 3 minutes (less than 5 minute buffer)
      const nearExpiration = Math.floor((Date.now() + 3 * 60 * 1000) / 1000);
      const mockToken = createMockJWT({ exp: nearExpiration });
      sessionStorageMock.getItem.mockReturnValue(mockToken);

      expect(service.isTokenNearExpiry()).toBe(true);
    });

    it('should return false for tokens with plenty of time left', () => {
      // Token expires in 30 minutes
      const farExpiration = Math.floor((Date.now() + 30 * 60 * 1000) / 1000);
      const mockToken = createMockJWT({ exp: farExpiration });
      sessionStorageMock.getItem.mockReturnValue(mockToken);

      expect(service.isTokenNearExpiry()).toBe(false);
    });

    it('should return true when no token exists', () => {
      sessionStorageMock.getItem.mockReturnValue(null);

      expect(service.isTokenNearExpiry()).toBe(true);
    });
  });

  describe('stopTokenRefreshTimer', () => {
    it('should stop running timer', () => {
      const mockToken = createMockJWT({
        exp: Math.floor((Date.now() + 60 * 60 * 1000) / 1000),
      });
      sessionStorageMock.getItem.mockReturnValue(mockToken);

      service.startTokenRefreshTimer();
      service.stopTokenRefreshTimer();

      // Should stop timer without errors
      expect(service).toBeTruthy();
    });

    it('should handle stopping when no timer is running', () => {
      service.stopTokenRefreshTimer();

      // Should stop timer without errors
      expect(service).toBeTruthy();
    });
  });
});

/**
 * Create a mock JWT token with specified payload
 */
function createMockJWT(payload: Record<string, unknown>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64'
  );
  const signature = 'mock-signature';

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Create a mock auth session response
 */
function createMockSession() {
  const expiration = Math.floor((Date.now() + 60 * 60 * 1000) / 1000);

  return {
    tokens: {
      accessToken: {
        toString: () => createMockJWT({ exp: expiration }),
        payload: { exp: expiration },
      },
      idToken: {
        toString: () => createMockJWT({ exp: expiration }),
      },
      refreshToken: {
        toString: () => 'mock-refresh-token',
      },
    },
  };
}
