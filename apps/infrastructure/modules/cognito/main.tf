resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-user-pool-${var.environment}"

  # Password policy configuration
  password_policy {
    minimum_length    = 8
    require_uppercase = true
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    temporary_password_validity_days = 7
  }

  # User attributes
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # MFA configuration
  mfa_configuration = "OPTIONAL"

  # Software token MFA configuration
  software_token_mfa_configuration {
    enabled = true
  }

  # Account recovery settings
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Verification message template
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "DMS Account Verification Code"
    email_message        = "Your DMS verification code is {####}. Please enter this code to complete your account setup."
  }

  # User pool add-ons
  user_pool_add_ons {
    advanced_security_mode = "ENFORCED"
  }

  # Device configuration
  device_configuration {
    challenge_required_on_new_device      = true
    device_only_remembered_on_user_prompt = false
  }

  # Admin create user configuration
  admin_create_user_config {
    allow_admin_create_user_only = true

    invite_message_template {
      email_subject = "Welcome to DMS - Your temporary password"
      email_message = "Your DMS username is {username} and temporary password is {####}. Please sign in and change your password."
    }
  }

  # Lambda triggers (placeholder for future use)
  # lambda_config {
  #   pre_sign_up = ""
  #   post_confirmation = ""
  # }

  tags = var.common_tags
}

resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.project_name}-angular-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id

  # Client configuration
  generate_secret = false

  # Token validity
  access_token_validity  = 60   # 1 hour
  id_token_validity     = 60   # 1 hour
  refresh_token_validity = 30   # 30 days

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # Refresh token rotation
  enable_token_revocation                = true
  prevent_user_existence_errors         = "ENABLED"
  enable_propagate_additional_user_context_data = false

  # OAuth configuration
  allowed_oauth_flows = ["code"]
  allowed_oauth_scopes = [
    "openid",
    "email",
    "profile",
    "aws.cognito.signin.user.admin"
  ]
  allowed_oauth_flows_user_pool_client = true

  # Callback and logout URLs
  callback_urls = [
    "http://localhost:4200",
    "http://localhost:4200/auth/callback",
    var.production_domain != "" ? "https://${var.production_domain}" : "https://placeholder.com",
    var.production_domain != "" ? "https://${var.production_domain}/auth/callback" : "https://placeholder.com/auth/callback"
  ]

  logout_urls = [
    "http://localhost:4200",
    "http://localhost:4200/auth/signout",
    var.production_domain != "" ? "https://${var.production_domain}" : "https://placeholder.com",
    var.production_domain != "" ? "https://${var.production_domain}/auth/signout" : "https://placeholder.com/auth/signout"
  ]

  # Supported identity providers
  supported_identity_providers = ["COGNITO"]

  # Authentication flows
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  # Read and write attributes
  read_attributes = [
    "email",
    "email_verified",
    "preferred_username"
  ]

  write_attributes = [
    "email",
    "preferred_username"
  ]

  depends_on = [aws_cognito_user_pool.main]
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project_name}-auth-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id
}

# Create admin user
resource "aws_cognito_user" "admin" {
  user_pool_id = aws_cognito_user_pool.main.id
  username     = var.admin_email

  attributes = {
    email          = var.admin_email
    email_verified = "true"
  }

  temporary_password = var.admin_temp_password
  message_action     = "SUPPRESS"

  lifecycle {
    ignore_changes = [
      temporary_password,
      password
    ]
  }
}
