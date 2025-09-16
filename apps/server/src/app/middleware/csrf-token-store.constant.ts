import { CSRFTokenData } from './csrf-token-data.interface';

// In-memory storage (use Redis in production)
export const csrfTokenStore = new Map<string, CSRFTokenData>();
