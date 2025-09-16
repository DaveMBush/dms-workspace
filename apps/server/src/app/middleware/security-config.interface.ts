export interface SecurityConfig {
  csp: {
    directives: Record<string, string[]>;
    reportUri?: string;
    reportOnly: boolean;
  };
  hsts: {
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
}
