output "user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  description = "ARN of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.arn
}

output "user_pool_client_id" {
  description = "ID of the Cognito User Pool Client"
  value       = aws_cognito_user_pool_client.main.id
}

output "user_pool_client_secret" {
  description = "Secret of the Cognito User Pool Client (empty for public clients)"
  value       = aws_cognito_user_pool_client.main.client_secret
  sensitive   = true
}

output "user_pool_domain" {
  description = "Domain of the Cognito User Pool"
  value       = aws_cognito_user_pool_domain.main.domain
}

output "user_pool_hosted_ui_url" {
  description = "Hosted UI URL for the Cognito User Pool"
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${data.aws_region.current.name}.amazoncognito.com"
}

output "admin_username" {
  description = "Username of the admin user"
  value       = aws_cognito_user.admin.username
}

output "jwt_issuer" {
  description = "JWT issuer URL for token validation"
  value       = "https://cognito-idp.${data.aws_region.current.name}.amazonaws.com/${aws_cognito_user_pool.main.id}"
}

output "cognito_config" {
  description = "Complete Cognito configuration for applications"
  value = {
    region                = data.aws_region.current.name
    userPoolId            = aws_cognito_user_pool.main.id
    userPoolWebClientId   = aws_cognito_user_pool_client.main.id
    domain                = "${aws_cognito_user_pool_domain.main.domain}.auth.${data.aws_region.current.name}.amazoncognito.com"
    hostedUIUrl           = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${data.aws_region.current.name}.amazoncognito.com"
    jwtIssuer            = "https://cognito-idp.${data.aws_region.current.name}.amazonaws.com/${aws_cognito_user_pool.main.id}"
    adminUsername        = aws_cognito_user.admin.username
  }
  sensitive = false
}

# Data sources
data "aws_region" "current" {}