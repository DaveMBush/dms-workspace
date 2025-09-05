/**
 * Terraform Configuration Validation Tests
 *
 * This file contains tests to validate the Cognito Terraform configuration
 * using Node.js testing framework to ensure infrastructure-as-code quality.
 */

const fs = require('fs');
const path = require('path');

describe('Cognito Terraform Configuration', () => {
  let terraformContent;
  let variablesContent;
  let outputsContent;

  beforeAll(() => {
    const moduleDir = path.resolve(__dirname);
    terraformContent = fs.readFileSync(path.join(moduleDir, 'main.tf'), 'utf8');
    variablesContent = fs.readFileSync(
      path.join(moduleDir, 'variables.tf'),
      'utf8'
    );
    outputsContent = fs.readFileSync(
      path.join(moduleDir, 'outputs.tf'),
      'utf8'
    );
  });

  describe('User Pool Configuration', () => {
    it('should define aws_cognito_user_pool resource', () => {
      expect(terraformContent).toContain(
        'resource "aws_cognito_user_pool" "main"'
      );
    });

    it('should configure password policy with security requirements', () => {
      expect(terraformContent).toContain('password_policy');
      expect(terraformContent).toContain('minimum_length    = 8');
      expect(terraformContent).toContain('require_uppercase = true');
      expect(terraformContent).toContain('require_lowercase = true');
      expect(terraformContent).toContain('require_numbers   = true');
      expect(terraformContent).toContain('require_symbols   = true');
      expect(terraformContent).toContain(
        'temporary_password_validity_days = 7'
      );
    });

    it('should configure email as username attribute', () => {
      expect(terraformContent).toContain(
        'username_attributes      = ["email"]'
      );
      expect(terraformContent).toContain(
        'auto_verified_attributes = ["email"]'
      );
    });

    it('should enable optional MFA', () => {
      expect(terraformContent).toContain('mfa_configuration = "OPTIONAL"');
      expect(terraformContent).toContain('software_token_mfa_configuration');
    });

    it('should configure account recovery via email', () => {
      expect(terraformContent).toContain('account_recovery_setting');
      expect(terraformContent).toContain('name     = "verified_email"');
      expect(terraformContent).toContain('priority = 1');
    });

    it('should enable advanced security mode', () => {
      expect(terraformContent).toContain('user_pool_add_ons');
      expect(terraformContent).toContain('advanced_security_mode = "ENFORCED"');
    });

    it('should configure admin-only user creation', () => {
      expect(terraformContent).toContain('admin_create_user_config');
      expect(terraformContent).toContain('allow_admin_create_user_only = true');
    });
  });

  describe('App Client Configuration', () => {
    it('should define aws_cognito_user_pool_client resource', () => {
      expect(terraformContent).toContain(
        'resource "aws_cognito_user_pool_client" "main"'
      );
    });

    it('should disable client secret for SPA', () => {
      expect(terraformContent).toContain('generate_secret = false');
    });

    it('should configure correct token validity', () => {
      expect(terraformContent).toContain('access_token_validity  = 60');
      expect(terraformContent).toContain('id_token_validity     = 60');
      expect(terraformContent).toContain('refresh_token_validity = 30');
    });

    it('should configure token validity units', () => {
      expect(terraformContent).toContain('token_validity_units');
      expect(terraformContent).toContain('access_token  = "minutes"');
      expect(terraformContent).toContain('id_token      = "minutes"');
      expect(terraformContent).toContain('refresh_token = "days"');
    });

    it('should enable token revocation', () => {
      expect(terraformContent).toContain(
        'enable_token_revocation                = true'
      );
    });

    it('should configure OAuth flows correctly', () => {
      expect(terraformContent).toContain('allowed_oauth_flows = ["code"]');
      expect(terraformContent).toContain(
        'allowed_oauth_flows_user_pool_client = true'
      );
    });

    it('should include required OAuth scopes', () => {
      expect(terraformContent).toContain('allowed_oauth_scopes = [');
      expect(terraformContent).toContain('"openid"');
      expect(terraformContent).toContain('"email"');
      expect(terraformContent).toContain('"profile"');
      expect(terraformContent).toContain('"aws.cognito.signin.user.admin"');
    });

    it('should configure callback and logout URLs', () => {
      expect(terraformContent).toContain('callback_urls = [');
      expect(terraformContent).toContain('logout_urls = [');
      expect(terraformContent).toContain('http://localhost:4200');
    });

    it('should configure authentication flows', () => {
      expect(terraformContent).toContain('explicit_auth_flows = [');
      expect(terraformContent).toContain('"ALLOW_USER_SRP_AUTH"');
      expect(terraformContent).toContain('"ALLOW_REFRESH_TOKEN_AUTH"');
    });
  });

  describe('Domain Configuration', () => {
    it('should define aws_cognito_user_pool_domain resource', () => {
      expect(terraformContent).toContain(
        'resource "aws_cognito_user_pool_domain" "main"'
      );
    });

    it('should use project and environment in domain name', () => {
      expect(terraformContent).toContain(
        'domain       = "${var.project_name}-auth-${var.environment}"'
      );
    });
  });

  describe('Admin User Configuration', () => {
    it('should define aws_cognito_user resource', () => {
      expect(terraformContent).toContain('resource "aws_cognito_user" "admin"');
    });

    it('should configure admin user with email', () => {
      expect(terraformContent).toContain('username     = var.admin_email');
      expect(terraformContent).toContain('email          = var.admin_email');
      expect(terraformContent).toContain('email_verified = "true"');
    });

    it('should suppress invitation message', () => {
      expect(terraformContent).toContain('message_action     = "SUPPRESS"');
    });

    it('should ignore password changes in lifecycle', () => {
      expect(terraformContent).toContain('lifecycle');
      expect(terraformContent).toContain('ignore_changes = [');
      expect(terraformContent).toContain('temporary_password');
      expect(terraformContent).toContain('password');
    });
  });

  describe('Variables Configuration', () => {
    it('should define required variables', () => {
      expect(variablesContent).toContain('variable "project_name"');
      expect(variablesContent).toContain('variable "environment"');
      expect(variablesContent).toContain('variable "admin_email"');
      expect(variablesContent).toContain('variable "admin_temp_password"');
    });

    it('should validate admin email format', () => {
      expect(variablesContent).toContain('validation');
      expect(variablesContent).toContain(
        'can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$", var.admin_email))'
      );
      expect(variablesContent).toContain(
        'Admin email must be a valid email address'
      );
    });

    it('should validate password length', () => {
      expect(variablesContent).toContain(
        'length(var.admin_temp_password) >= 8'
      );
      expect(variablesContent).toContain(
        'Temporary password must be at least 8 characters long'
      );
    });

    it('should mark sensitive variables', () => {
      expect(variablesContent).toContain('sensitive   = true');
    });

    it('should provide optional production domain', () => {
      expect(variablesContent).toContain('variable "production_domain"');
      expect(variablesContent).toContain('default     = ""');
    });
  });

  describe('Outputs Configuration', () => {
    it('should define required outputs', () => {
      expect(outputsContent).toContain('output "user_pool_id"');
      expect(outputsContent).toContain('output "user_pool_client_id"');
      expect(outputsContent).toContain('output "user_pool_domain"');
      expect(outputsContent).toContain('output "user_pool_hosted_ui_url"');
      expect(outputsContent).toContain('output "jwt_issuer"');
    });

    it('should provide complete cognito_config output', () => {
      expect(outputsContent).toContain('output "cognito_config"');
      expect(outputsContent).toContain(
        'region                = data.aws_region.current.name'
      );
      expect(outputsContent).toContain(
        'userPoolId            = aws_cognito_user_pool.main.id'
      );
      expect(outputsContent).toContain(
        'userPoolWebClientId   = aws_cognito_user_pool_client.main.id'
      );
    });

    it('should mark sensitive outputs appropriately', () => {
      expect(outputsContent).toContain('sensitive   = true');
    });

    it('should include data source for current region', () => {
      expect(outputsContent).toContain('data "aws_region" "current"');
    });
  });

  describe('Security Validation', () => {
    it('should not contain hardcoded secrets', () => {
      expect(terraformContent).not.toContain('password');
      expect(terraformContent).not.toContain('secret');
      expect(terraformContent).not.toContain('key');
    });

    it('should use variables for sensitive inputs', () => {
      expect(terraformContent).toContain('var.admin_email');
      expect(terraformContent).toContain('var.admin_temp_password');
    });

    it('should configure HTTPS URLs only', () => {
      const httpsPattern = /https:\/\//g;
      const httpPattern = /[^s]http:\/\/(?!localhost)/g; // Allow http://localhost

      expect(terraformContent.match(httpPattern)).toBeNull();
    });
  });

  describe('Tagging Configuration', () => {
    it('should apply common tags to resources', () => {
      expect(terraformContent).toContain('tags = var.common_tags');
    });

    it('should define common_tags variable', () => {
      expect(variablesContent).toContain('variable "common_tags"');
      expect(variablesContent).toContain('map(string)');
    });
  });

  describe('Resource Dependencies', () => {
    it('should define proper dependencies between resources', () => {
      expect(terraformContent).toContain(
        'depends_on = [aws_cognito_user_pool.main]'
      );
    });

    it('should reference resources correctly', () => {
      expect(terraformContent).toContain(
        'user_pool_id = aws_cognito_user_pool.main.id'
      );
      expect(terraformContent).toContain(
        'aws_cognito_user_pool_domain.main.domain'
      );
    });
  });
});
