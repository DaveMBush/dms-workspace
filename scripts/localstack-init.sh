#!/bin/bash

# LocalStack initialization script for RMS Workspace
# This script sets up AWS services for local development

set -e

echo "🚀 Initializing LocalStack services for RMS..."

# Wait for LocalStack to be ready
echo "⏳ Waiting for LocalStack to be ready..."
until curl -s http://localhost:4566/health | grep -q '"s3": "available"'; do
  echo "Waiting for LocalStack services..."
  sleep 2
done

echo "✅ LocalStack is ready!"

# Configure AWS CLI to use LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_ENDPOINT_URL=http://localhost:4566

# Create S3 bucket for local development
echo "📦 Creating S3 bucket..."
aws --endpoint-url=http://localhost:4566 s3 mb s3://rms-local-bucket || true
aws --endpoint-url=http://localhost:4566 s3api put-bucket-cors \
  --bucket rms-local-bucket \
  --cors-configuration '{
    "CORSRules": [
      {
        "AllowedOrigins": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedHeaders": ["*"]
      }
    ]
  }' || true

# Create SSM Parameters for local development
echo "🔧 Creating SSM Parameters..."

# Database configuration
aws --endpoint-url=http://localhost:4566 ssm put-parameter \
  --name "/rms/local/database-url" \
  --value "postgresql://rms_user:rms_password@host.docker.internal:5432/rms_local?schema=public" \
  --type "SecureString" \
  --overwrite || true

aws --endpoint-url=http://localhost:4566 ssm put-parameter \
  --name "/rms/local/database-password" \
  --value "rms_password" \
  --type "SecureString" \
  --overwrite || true

# Cognito configuration (mock values for local development)
aws --endpoint-url=http://localhost:4566 ssm put-parameter \
  --name "/rms/local/cognito-user-pool-id" \
  --value "us-east-1_LOCAL123" \
  --type "String" \
  --overwrite || true

aws --endpoint-url=http://localhost:4566 ssm put-parameter \
  --name "/rms/local/cognito-user-pool-client-id" \
  --value "local-client-id-123" \
  --type "String" \
  --overwrite || true

aws --endpoint-url=http://localhost:4566 ssm put-parameter \
  --name "/rms/local/cognito-jwt-issuer" \
  --value "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_LOCAL123" \
  --type "String" \
  --overwrite || true

aws --endpoint-url=http://localhost:4566 ssm put-parameter \
  --name "/rms/local/aws-region" \
  --value "us-east-1" \
  --type "String" \
  --overwrite || true

# Create Cognito User Pool for local testing
echo "👤 Creating Cognito User Pool..."
USER_POOL_ID=$(aws --endpoint-url=http://localhost:4566 cognito-idp create-user-pool \
  --pool-name "rms-local-pool" \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": false,
      "RequireLowercase": false,
      "RequireNumbers": false,
      "RequireSymbols": false
    }
  }' \
  --auto-verified-attributes email \
  --username-attributes email \
  --alias-attributes email \
  --query 'UserPool.Id' \
  --output text 2>/dev/null || echo "us-east-1_LOCAL123")

# Create User Pool Client
CLIENT_ID=$(aws --endpoint-url=http://localhost:4566 cognito-idp create-user-pool-client \
  --user-pool-id "$USER_POOL_ID" \
  --client-name "rms-local-client" \
  --explicit-auth-flows ADMIN_NO_SRP_AUTH USER_PASSWORD_AUTH ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --generate-secret \
  --token-validity-units '{
    "AccessToken": "hours",
    "IdToken": "hours",
    "RefreshToken": "days"
  }' \
  --access-token-validity 24 \
  --id-token-validity 24 \
  --refresh-token-validity 30 \
  --query 'UserPoolClient.ClientId' \
  --output text 2>/dev/null || echo "local-client-id-123")

# Update SSM parameters with actual Cognito values
echo "🔧 Updating SSM parameters with actual Cognito values..."
aws --endpoint-url=http://localhost:4566 ssm put-parameter \
  --name "/rms/local/cognito-user-pool-id" \
  --value "$USER_POOL_ID" \
  --type "String" \
  --overwrite || true

aws --endpoint-url=http://localhost:4566 ssm put-parameter \
  --name "/rms/local/cognito-user-pool-client-id" \
  --value "$CLIENT_ID" \
  --type "String" \
  --overwrite || true

aws --endpoint-url=http://localhost:4566 ssm put-parameter \
  --name "/rms/local/cognito-jwt-issuer" \
  --value "http://localhost:4566/cognito-idp/us-east-1/$USER_POOL_ID" \
  --type "String" \
  --overwrite || true

# Create test users for local development
echo "👥 Creating test users..."
aws --endpoint-url=http://localhost:4566 cognito-idp admin-create-user \
  --user-pool-id "$USER_POOL_ID" \
  --username "testuser@example.com" \
  --user-attributes Name=email,Value=testuser@example.com Name=email_verified,Value=true \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS \
  2>/dev/null || echo "Test user may already exist"

aws --endpoint-url=http://localhost:4566 cognito-idp admin-set-user-password \
  --user-pool-id "$USER_POOL_ID" \
  --username "testuser@example.com" \
  --password "TestPass123!" \
  --permanent \
  2>/dev/null || echo "Password setting may have failed"

echo "🎉 LocalStack initialization complete!"
echo "📋 Local AWS Services Summary:"
echo "   S3 Bucket: rms-local-bucket"
echo "   S3 Endpoint: http://localhost:4566"
echo "   SSM Endpoint: http://localhost:4566"
echo "   Cognito User Pool ID: $USER_POOL_ID"
echo "   Cognito Client ID: $CLIENT_ID"
echo ""
echo "🔗 Useful commands:"
echo "   List S3 buckets: aws --endpoint-url=http://localhost:4566 s3 ls"
echo "   List SSM parameters: aws --endpoint-url=http://localhost:4566 ssm describe-parameters"
echo "   View parameter: aws --endpoint-url=http://localhost:4566 ssm get-parameter --name '/rms/local/database-url' --with-decryption"