# AWS Cognito Setup Guide for RMS Application

This guide provides step-by-step instructions for setting up AWS Cognito authentication for the RMS application.

## Overview

AWS Cognito provides enterprise-grade authentication for the RMS application with the following components:

- **User Pool**: Central user directory and authentication service
- **App Client**: Application registration with OAuth 2.0 configuration
- **Hosted UI**: Pre-built authentication interface
- **Custom Domain**: Professional branded login experience

## Prerequisites

- AWS CLI configured with appropriate permissions
- Terraform installed (version 1.0 or later)
- Valid email address for admin account
- Production domain (optional, for production deployment)

## Required AWS Permissions

The AWS user/role deploying this infrastructure needs the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["cognito-idp:*", "ssm:GetParameter", "ssm:GetParameters", "ssm:PutParameter"],
      "Resource": "*"
    }
  ]
}
```

## Infrastructure Deployment

### 1. Configure Terraform Variables

Create or update your Terraform variables file (e.g., `terraform.tfvars`):

```hcl
# Required variables
environment = "dev"  # or "staging", "prod"
admin_email = "admin@yourcompany.com"
admin_temp_password = "TempPassword123!"  # Min 8 chars, must include uppercase, lowercase, numbers, symbols

# Optional variables
production_domain = "app.yourcompany.com"  # For production callback URLs
project_name = "rms"
aws_region = "us-east-1"
```

**Important Security Notes:**

- Never commit `terraform.tfvars` to version control
- Use secure password generation for `admin_temp_password`
- Admin will be forced to change password on first login

### 2. Deploy Infrastructure

```bash
# Navigate to infrastructure directory
cd apps/infrastructure

# Initialize Terraform
terraform init

# Plan deployment (review changes)
terraform plan

# Apply changes
terraform apply

# Note down the outputs
terraform output
```

### 3. Save Terraform Outputs

After successful deployment, save the following outputs for application configuration:

```bash
# Get all Cognito-related outputs
terraform output cognito_config

# Individual outputs
terraform output cognito_user_pool_id
terraform output cognito_user_pool_client_id
terraform output cognito_user_pool_domain
terraform output cognito_hosted_ui_url
terraform output cognito_jwt_issuer
```

## Application Configuration

### Frontend Configuration (Angular)

1. **Update Environment Files**

   Replace placeholder values in the environment files with actual Terraform outputs:

   ```typescript
   // apps/rms/src/environments/environment.cognito.ts
   export const cognitoConfigDev: CognitoConfig = {
     region: 'us-east-1',
     userPoolId: 'us-east-1_XXXXXXXXX', // From terraform output
     userPoolWebClientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX', // From terraform output
     domain: 'rms-auth-dev.auth.us-east-1.amazoncognito.com', // From terraform output
     redirectSignIn: 'http://localhost:4200',
     redirectSignOut: 'http://localhost:4200/auth/signout',
     scopes: ['openid', 'email', 'profile', 'aws.cognito.signin.user.admin'],
     hostedUIUrl: 'https://rms-auth-dev.auth.us-east-1.amazoncognito.com', // From terraform output
     jwtIssuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX', // From terraform output
   };
   ```

### Backend Configuration (Fastify)

1. **Environment Variables**

   Set the following environment variables for the server:

   ```bash
   # Development (.env.local)
   NODE_ENV=development
   AWS_REGION=us-east-1
   COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
   COGNITO_USER_POOL_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
   COGNITO_JWT_ISSUER=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX
   ```

2. **Production Parameter Store**

   For production environments, store configuration in AWS Systems Manager Parameter Store:

   ```bash
   # Store parameters (replace with actual values from terraform output)
   aws ssm put-parameter \
     --name "/rms/prod/cognito-user-pool-id" \
     --value "us-east-1_XXXXXXXXX" \
     --type "String"

   aws ssm put-parameter \
     --name "/rms/prod/cognito-user-pool-client-id" \
     --value "XXXXXXXXXXXXXXXXXXXXXXXXXX" \
     --type "String"

   aws ssm put-parameter \
     --name "/rms/prod/cognito-jwt-issuer" \
     --value "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX" \
     --type "String"

   aws ssm put-parameter \
     --name "/rms/prod/aws-region" \
     --value "us-east-1" \
     --type "String"
   ```

## User Management

### Admin User Setup

1. **First Login**

   The admin user is created with a temporary password and must be changed on first login:

   ```bash
   # Get admin username (usually the email address)
   terraform output cognito_admin_username
   ```

2. **Login Process**

   - Navigate to the Hosted UI URL
   - Login with admin email and temporary password
   - Complete password change process
   - Verify email if prompted

### Password Policy

The configured password policy requires:

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 symbol
- Temporary passwords valid for 7 days

### MFA Configuration

MFA is configured as **OPTIONAL**. Users can enable:

- SMS-based MFA
- Time-based One-Time Password (TOTP) using authenticator apps

## Security Configuration

### Token Configuration

- **Access Token**: 1 hour validity
- **ID Token**: 1 hour validity
- **Refresh Token**: 30 days validity
- **Token Rotation**: Enabled for enhanced security

### OAuth 2.0 Settings

- **Flow**: Authorization Code Grant with PKCE
- **Scopes**: openid, email, profile, aws.cognito.signin.user.admin
- **Client Type**: Public (no client secret required)

### Advanced Security

- **Advanced Security Mode**: ENFORCED
- **Device Tracking**: Enabled with challenge on new devices
- **Account Recovery**: Email-based password reset

## Testing and Validation

### Manual Testing Checklist

- [ ] Admin user can be created successfully
- [ ] Password policy is enforced during password change
- [ ] Hosted UI loads correctly
- [ ] Login flow works with admin credentials
- [ ] JWT tokens are issued with correct claims
- [ ] Token expiration matches configuration
- [ ] Logout functionality works
- [ ] Password reset email is received

### Integration Testing

```bash
# Test Cognito configuration loading
npm run test -- --grep "cognito config"

# Test JWT validation
npm run test -- --grep "jwt validation"
```

## Monitoring and Logging

### CloudTrail Integration

Enable CloudTrail to monitor Cognito API calls:

```json
{
  "eventVersion": "1.08",
  "userIdentity": {
    "type": "Root"
  },
  "eventTime": "2024-01-01T12:00:00Z",
  "eventSource": "cognito-idp.amazonaws.com",
  "eventName": "AdminCreateUser",
  "sourceIPAddress": "192.168.1.1",
  "userAgent": "aws-cli/2.0.0"
}
```

### CloudWatch Metrics

Monitor the following Cognito metrics:

- Sign-in success/failure rates
- Token generation counts
- MFA challenge completion rates
- User pool size growth

## Backup and Recovery

### Configuration Backup

The Terraform state file contains all configuration. Ensure it's backed up:

```bash
# Upload state to S3 backend (recommended)
terraform {
  backend "s3" {
    bucket = "your-terraform-state-bucket"
    key    = "rms/cognito/terraform.tfstate"
    region = "us-east-1"
  }
}
```

### User Data Backup

Cognito user data can be exported via AWS CLI:

```bash
# List all users
aws cognito-idp list-users --user-pool-id us-east-1_XXXXXXXXX

# Export user attributes
aws cognito-idp admin-get-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username admin@yourcompany.com
```

## Disaster Recovery

### User Pool Recreation

If the User Pool is accidentally deleted:

1. Run `terraform plan` to see what needs to be recreated
2. Run `terraform apply` to recreate resources
3. Recreate admin user with new temporary password
4. Update application configuration with new IDs

### Domain Recovery

If the custom domain is lost:

1. The domain will be automatically recreated by Terraform
2. Update DNS settings if using custom domain
3. Update callback URLs in applications

## Cost Management

### Pricing Structure

- **Monthly Active Users (MAU)**: $0.0055 per MAU
- **Single User Cost**: ~$0.01 per month
- **Free Tier**: 50,000 MAUs per month
- **JWT Validation**: No additional AWS costs

### Cost Optimization

- Use the free tier for development and testing
- Monitor MAU usage in CloudWatch
- Consider federated identity for cost reduction at scale

## Troubleshooting

### Common Issues

1. **"User does not exist" error**

   - Check if user pool ID is correct
   - Verify user was created successfully
   - Check if user is confirmed

2. **"Invalid redirect URI" error**

   - Verify callback URLs in App Client settings
   - Ensure URLs match exactly (including protocol)
   - Check for trailing slashes

3. **JWT validation fails**

   - Verify JWT issuer URL is correct
   - Check token has not expired
   - Validate audience (client ID) matches

4. **Parameter Store errors**
   - Verify IAM permissions for SSM access
   - Check parameter names match exactly
   - Ensure parameters exist in correct region

### Debug Commands

```bash
# Test AWS credentials
aws sts get-caller-identity

# Verify Cognito User Pool
aws cognito-idp describe-user-pool --user-pool-id us-east-1_XXXXXXXXX

# Test Parameter Store access
aws ssm get-parameter --name "/rms/dev/cognito-user-pool-id"

# Validate JWT token (using jwt.io or jwt-cli)
jwt decode eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...
```

## Support and Resources

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [OAuth 2.0 with PKCE Specification](https://tools.ietf.org/html/rfc7636)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Terraform AWS Provider - Cognito](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool)

---

**Security Note**: This configuration is designed for a single-user application. For multi-user scenarios, review and adjust security settings, user management processes, and cost implications accordingly.
