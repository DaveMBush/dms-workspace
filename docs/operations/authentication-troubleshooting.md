# RMS Authentication Troubleshooting Guide

## Table of Contents

1. [Common Issues and Solutions](#common-issues-and-solutions)
2. [Error Code Reference](#error-code-reference)
3. [Diagnostic Procedures](#diagnostic-procedures)
4. [Performance Issues](#performance-issues)
5. [Security Incidents](#security-incidents)
6. [Network and Connectivity Issues](#network-and-connectivity-issues)
7. [Token and Session Issues](#token-and-session-issues)
8. [Emergency Procedures](#emergency-procedures)

## Common Issues and Solutions

### User Cannot Log In

#### Issue: "Incorrect username or password" Error

**Symptoms:**

- Valid credentials rejected
- Error message displayed on login form
- User unable to access application

**Diagnostic Steps:**

1. Verify user account exists in AWS Cognito User Pool
2. Check if account is locked or disabled
3. Verify password meets complexity requirements
4. Check for typos in email address
5. Confirm user is using correct environment (dev/staging/prod)

**Solutions:**

```bash
# Check user status in Cognito
aws cognito-idp admin-get-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username user@example.com

# Reset user password (admin)
aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username user@example.com \
  --password "NewPassword123!" \
  --permanent

# Unlock user account
aws cognito-idp admin-enable-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username user@example.com
```

#### Issue: Account Locked After Multiple Failed Attempts

**Symptoms:**

- User receives account locked message
- Unable to log in even with correct credentials
- Security event logged in system

**Diagnostic Steps:**

1. Check CloudWatch logs for authentication failures
2. Verify user's IP address and location
3. Review security alerts for suspicious activity
4. Confirm user identity before unlocking

**Solutions:**

```bash
# Check failed login attempts
aws logs filter-log-events \
  --log-group-name "/aws/cognito/userpool" \
  --filter-pattern "SignIn_Failure" \
  --start-time $(date -d "1 hour ago" +%s)000

# Unlock user account
aws cognito-idp admin-enable-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username user@example.com

# Reset failed attempt counter
aws cognito-idp admin-reset-user-password \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username user@example.com
```

### Session Expiration Issues

#### Issue: Frequent "Session Expired" Messages

**Symptoms:**

- User logged out unexpectedly
- Session expires faster than expected
- Frequent re-authentication required

**Diagnostic Steps:**

1. Check token expiration settings in Cognito
2. Verify browser cookie settings
3. Review network connectivity issues
4. Check for browser extensions blocking cookies

**Solutions:**

```javascript
// Check current token expiration (browser console)
const token = sessionStorage.getItem('accessToken');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token expires:', new Date(payload.exp * 1000));
  console.log('Current time:', new Date());
}

// Clear browser storage and retry
sessionStorage.clear();
localStorage.clear();
```

**Configuration Fix:**

```typescript
// Extend token lifetime in Cognito App Client settings
const tokenConfig = {
  AccessTokenValidity: 60, // 60 minutes
  IdTokenValidity: 60, // 60 minutes
  RefreshTokenValidity: 129600, // 90 days
  TokenValidityUnits: {
    AccessToken: 'minutes',
    IdToken: 'minutes',
    RefreshToken: 'minutes',
  },
};
```

### Application Loading Issues

#### Issue: Blank Page After Login

**Symptoms:**

- Successful login but application doesn't load
- White screen or loading spinner
- No error messages displayed

**Diagnostic Steps:**

1. Check browser console for JavaScript errors
2. Verify network requests in browser DevTools
3. Check if API endpoints are accessible
4. Review browser compatibility

**Solutions:**

```bash
# Check application health endpoint
curl -X GET https://api.rms.company.com/health

# Verify authentication token
curl -X GET https://api.rms.company.com/api/profile \
  -H "Authorization: Bearer <token>"

# Clear browser cache and cookies
# Browser DevTools > Application > Storage > Clear Storage
```

**Common Fixes:**

- Clear browser cache and cookies
- Disable browser extensions
- Try incognito/private browsing mode
- Update browser to latest version

## Error Code Reference

### HTTP Status Codes

#### 401 Unauthorized

**Meaning:** Invalid or expired authentication token

**Common Causes:**

- Expired access token
- Invalid token signature
- Token for wrong application
- Missing Authorization header

**Resolution:**

```javascript
// Token refresh logic
if (response.status === 401) {
  try {
    await authService.refreshToken();
    // Retry original request
    return retry(originalRequest);
  } catch (error) {
    // Redirect to login
    router.navigate(['/auth/login']);
  }
}
```

#### 403 Forbidden

**Meaning:** Valid token but insufficient permissions

**Common Causes:**

- User lacks required permissions
- Resource access denied
- Role-based access control restriction

**Resolution:**

- Check user's assigned roles and groups
- Verify resource permissions
- Contact administrator for access

#### 429 Too Many Requests

**Meaning:** Rate limit exceeded

**Common Causes:**

- Too many authentication attempts
- API rate limit exceeded
- DDoS protection triggered

**Resolution:**

```bash
# Check rate limit status
redis-cli get "rate_limit:user@example.com"

# Reset rate limit (admin only)
redis-cli del "rate_limit:user@example.com"
```

### Cognito Error Codes

#### NotAuthorizedException

**Meaning:** Invalid username or password

**Troubleshooting:**

1. Verify user exists in correct User Pool
2. Check password complexity
3. Confirm account is enabled
4. Verify MFA requirements

#### UserNotConfirmedException

**Meaning:** User account not verified

**Resolution:**

```bash
# Confirm user account (admin)
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username user@example.com
```

#### PasswordResetRequiredException

**Meaning:** User must reset password

**Resolution:**

```bash
# Set permanent password (admin)
aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username user@example.com \
  --password "NewPassword123!" \
  --permanent
```

## Diagnostic Procedures

### Authentication Flow Debugging

#### Step 1: Client-Side Debugging

**Browser Console Commands:**

```javascript
// Check authentication state
console.log('Auth State:', authService.isAuthenticated());
console.log('Current User:', authService.currentUser());

// Examine stored tokens
console.log('Access Token:', sessionStorage.getItem('accessToken'));
console.log('Refresh Token:', document.cookie);

// Verify token payload
const token = sessionStorage.getItem('accessToken');
if (token) {
  const [header, payload, signature] = token.split('.');
  console.log('Token Header:', JSON.parse(atob(header)));
  console.log('Token Payload:', JSON.parse(atob(payload)));
}
```

#### Step 2: Network Request Analysis

**Check Request Headers:**

```javascript
// Monitor network requests
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.name.includes('/api/')) {
      console.log('API Request:', entry.name, entry.duration);
    }
  });
});
observer.observe({ entryTypes: ['resource'] });
```

#### Step 3: Server-Side Debugging

**Check Server Logs:**

```bash
# View authentication logs
tail -f /var/log/rms/auth.log | grep ERROR

# Search for specific user
grep "user@example.com" /var/log/rms/auth.log

# Monitor real-time authentication attempts
journalctl -u rms-api -f | grep auth
```

### Performance Diagnostics

#### Authentication Latency Analysis

**Measure Login Performance:**

```javascript
// Time login process
const loginStart = performance.now();
await authService.signIn(credentials);
const loginEnd = performance.now();
console.log(`Login took ${loginEnd - loginStart} milliseconds`);

// Measure token refresh
const refreshStart = performance.now();
await authService.refreshToken();
const refreshEnd = performance.now();
console.log(`Token refresh took ${refreshEnd - refreshStart} milliseconds`);
```

**Server Performance Metrics:**

```bash
# Check response times
curl -w "@curl-format.txt" \
  -X POST https://api.rms.company.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# Monitor resource usage
htop -p $(pgrep -f "rms-api")
```

## Performance Issues

### Slow Login Response

#### Symptoms:

- Login takes longer than 5 seconds
- Timeout errors during authentication
- Poor user experience

#### Diagnostic Steps:

1. **Measure Authentication Components:**

   ```bash
   # Test Cognito response time
   time aws cognito-idp initiate-auth \
     --auth-flow USER_SRP_AUTH \
     --auth-parameters USERNAME=test,SRP_A=test \
     --client-id XXXXXXXXXXXXXXXXXXXXXXXXXX

   # Test API response time
   time curl -X GET https://api.rms.company.com/health
   ```

2. **Check Network Latency:**

   ```bash
   # Ping Cognito endpoints
   ping cognito-idp.us-east-1.amazonaws.com

   # Trace route to API
   traceroute api.rms.company.com
   ```

3. **Monitor Resource Usage:**

   ```bash
   # CPU and memory usage
   iostat -x 1
   free -h

   # Database connections
   netstat -an | grep :5432 | wc -l
   ```

#### Solutions:

- **Optimize Cognito Configuration:**

  - Reduce password complexity if appropriate
  - Enable connection pooling
  - Use regional endpoints

- **Improve API Performance:**

  - Add response caching
  - Optimize database queries
  - Implement connection pooling

- **Frontend Optimizations:**
  - Add loading indicators
  - Implement request timeouts
  - Use service workers for caching

### High Memory Usage

#### Symptoms:

- Server memory consumption increasing
- Application slowdown over time
- Out of memory errors

#### Diagnostic Commands:

```bash
# Monitor memory usage
watch -n 1 'free -h'

# Check process memory
ps aux --sort=-%mem | head -20

# Node.js memory analysis
node --inspect-brk=0.0.0.0:9229 dist/main.js
```

#### Solutions:

```javascript
// Implement token cleanup
setInterval(() => {
  // Clear expired tokens from memory
  tokenCache.cleanup();
}, 60000); // Every minute

// Monitor memory leaks
if (process.memoryUsage().heapUsed > 500 * 1024 * 1024) {
  console.warn('High memory usage detected');
  // Trigger garbage collection
  if (global.gc) global.gc();
}
```

## Security Incidents

### Suspicious Login Activity

#### Detection Indicators:

- Multiple failed login attempts from same IP
- Logins from unusual geographic locations
- Rapid succession of login attempts
- Access attempts outside business hours

#### Investigation Steps:

1. **Gather Evidence:**

   ```bash
   # Extract suspicious login attempts
   aws logs filter-log-events \
     --log-group-name "/aws/cognito/userpool" \
     --filter-pattern "{ $.eventName = SignIn_Failure }" \
     --start-time $(date -d "24 hours ago" +%s)000

   # Check IP geolocation
   curl "http://ip-api.com/json/192.168.1.100"
   ```

2. **User Account Analysis:**

   ```bash
   # Check user's recent activity
   aws cognito-idp admin-list-user-auth-events \
     --user-pool-id us-east-1_XXXXXXXXX \
     --username user@example.com \
     --max-items 50
   ```

3. **Response Actions:**

   ```bash
   # Temporarily disable user account
   aws cognito-idp admin-disable-user \
     --user-pool-id us-east-1_XXXXXXXXX \
     --username user@example.com

   # Block suspicious IP address
   iptables -A INPUT -s 192.168.1.100 -j DROP
   ```

### Potential Brute Force Attack

#### Detection:

- Rate limit violations
- Automated login patterns
- Dictionary attack signatures

#### Response Procedure:

1. **Immediate Actions:**

   ```bash
   # Enable enhanced monitoring
   aws logs put-metric-filter \
     --log-group-name "/aws/cognito/userpool" \
     --filter-name "BruteForceAttempts" \
     --filter-pattern "SignIn_Failure" \
     --metric-transformations \
       metricName=FailedLogins,metricNamespace=Security,metricValue=1

   # Temporarily increase rate limits
   redis-cli set "rate_limit:global" 1000 EX 3600
   ```

2. **Analysis and Documentation:**

   ```bash
   # Generate security report
   aws logs filter-log-events \
     --log-group-name "/aws/cognito/userpool" \
     --filter-pattern "SignIn_Failure" \
     --start-time $(date -d "6 hours ago" +%s)000 \
     > security_incident_$(date +%Y%m%d_%H%M).json
   ```

3. **Long-term Mitigation:**
   - Implement CAPTCHA for repeated failures
   - Add geographic IP blocking
   - Enable MFA for all users
   - Regular security awareness training

## Network and Connectivity Issues

### AWS Service Outages

#### Symptoms:

- Cognito authentication failures
- CloudWatch metrics unavailable
- Regional service degradation

#### Detection:

```bash
# Check AWS service status
curl -s https://status.aws.amazon.com/ | grep -i cognito

# Monitor Cognito endpoints
for endpoint in cognito-idp.us-east-1.amazonaws.com \
                cognito-identity.us-east-1.amazonaws.com; do
  echo "Testing $endpoint:"
  nc -zv $endpoint 443
done
```

#### Response:

1. **Activate Backup Procedures:**

   ```bash
   # Enable emergency access mode
   echo "maintenance" > /var/www/rms/status

   # Redirect to backup authentication
   nginx -s reload
   ```

2. **User Communication:**
   - Post status page update
   - Send notification emails
   - Update application banner

### DNS Resolution Issues

#### Symptoms:

- "Cannot resolve hostname" errors
- Intermittent authentication failures
- Geographic access issues

#### Diagnostic Commands:

```bash
# Test DNS resolution
nslookup cognito-idp.us-east-1.amazonaws.com

# Check DNS propagation
dig @8.8.8.8 cognito-idp.us-east-1.amazonaws.com
dig @1.1.1.1 cognito-idp.us-east-1.amazonaws.com

# Test from different locations
for server in 8.8.8.8 1.1.1.1 208.67.222.222; do
  echo "Testing DNS server $server:"
  dig @$server api.rms.company.com
done
```

#### Solutions:

```bash
# Flush DNS cache
sudo systemctl flush-dns
# or
sudo dscacheutil -flushcache

# Update /etc/hosts temporarily
echo "54.230.1.1 cognito-idp.us-east-1.amazonaws.com" >> /etc/hosts

# Configure alternative DNS servers
echo "nameserver 8.8.8.8" > /etc/resolv.conf
echo "nameserver 1.1.1.1" >> /etc/resolv.conf
```

## Token and Session Issues

### Token Refresh Failures

#### Common Causes:

- Expired refresh token
- Invalid token signature
- Network connectivity issues
- Server-side validation errors

#### Diagnostic Steps:

```javascript
// Check refresh token validity
const refreshToken = getCookie('refreshToken');
if (refreshToken) {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    console.log('Refresh response:', response.status);
  } catch (error) {
    console.error('Refresh failed:', error);
  }
}
```

#### Solutions:

```typescript
// Implement robust refresh logic
async refreshToken(): Promise<void> {
  try {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.cognitoAuth.initiateAuth({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      AuthParameters: {
        REFRESH_TOKEN: refreshToken
      }
    }).promise();

    this.storeTokens(response.AuthenticationResult);
  } catch (error) {
    console.error('Token refresh failed:', error);
    this.logout();
    throw error;
  }
}
```

### Cross-Domain Session Issues

#### Symptoms:

- Authentication works on main domain but fails on subdomains
- Session lost when navigating between related applications
- CORS errors in browser console

#### Solutions:

```typescript
// Configure cookie domain for subdomains
const cookieConfig = {
  domain: '.company.com', // Allow all subdomains
  secure: true, // HTTPS only
  sameSite: 'strict', // CSRF protection
  httpOnly: true, // XSS protection
};

// CORS configuration
const corsOptions = {
  origin: ['https://rms.company.com', 'https://admin.company.com', 'https://*.company.com'],
  credentials: true,
};
```

## Emergency Procedures

### Complete Authentication Failure

#### When to Use:

- All users unable to authenticate
- Cognito service completely unavailable
- Critical system compromise

#### Emergency Response:

1. **Activate Emergency Access:**

   ```bash
   # Enable emergency admin access
   export EMERGENCY_MODE=true
   export ADMIN_OVERRIDE_TOKEN=$(openssl rand -hex 32)

   # Restart services with emergency configuration
   systemctl restart rms-api
   ```

2. **User Communication:**

   ```bash
   # Update status page
   curl -X POST https://status.company.com/api/incidents \
     -H "Authorization: Bearer $STATUS_TOKEN" \
     -d '{"title":"Authentication Service Outage","status":"investigating"}'

   # Send emergency notification
   aws sns publish \
     --topic-arn "arn:aws:sns:us-east-1:123456789:emergency-alerts" \
     --message "RMS authentication system is experiencing an outage"
   ```

3. **Implement Workaround:**

   ```nginx
   # Emergency nginx configuration
   location /auth {
     return 503 "Authentication service temporarily unavailable";
   }

   location /emergency {
     auth_basic "Emergency Access";
     auth_basic_user_file /etc/nginx/.emergency_htpasswd;
     proxy_pass http://localhost:3001;
   }
   ```

### Data Breach Response

#### Immediate Actions:

1. **Isolate Affected Systems:**

   ```bash
   # Disconnect from network
   iptables -P INPUT DROP
   iptables -P FORWARD DROP
   iptables -P OUTPUT DROP

   # Preserve evidence
   dd if=/dev/sda of=/mnt/backup/system_image_$(date +%Y%m%d_%H%M).img
   ```

2. **Revoke All Tokens:**

   ```bash
   # Mass token revocation
   aws cognito-idp admin-user-global-sign-out \
     --user-pool-id us-east-1_XXXXXXXXX \
     --username "*"

   # Clear Redis cache
   redis-cli FLUSHALL
   ```

3. **Force Password Reset:**
   ```bash
   # Require password reset for all users
   aws cognito-idp admin-reset-user-password \
     --user-pool-id us-east-1_XXXXXXXXX \
     --username user@example.com
   ```

### Recovery Checklist

After resolving authentication issues:

- [ ] Verify all services are operational
- [ ] Test authentication flow end-to-end
- [ ] Check token refresh functionality
- [ ] Validate API endpoint access
- [ ] Monitor error rates and performance
- [ ] Review security logs for anomalies
- [ ] Update incident documentation
- [ ] Conduct post-incident review
- [ ] Implement preventive measures
- [ ] Update monitoring and alerting

---

_This troubleshooting guide should be reviewed and updated quarterly based on new issues and system changes. For complex issues not covered here, escalate to the security team or AWS support._
