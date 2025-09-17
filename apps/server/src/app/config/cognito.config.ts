import { CognitoConfig } from '../types/cognito-config.interface';
import { createFallbackConfig } from './create-fallback-config.function';

// Legacy synchronous export - will use environment variables as fallback
export const cognitoConfig: CognitoConfig = createFallbackConfig();
