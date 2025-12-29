# Outputs for CloudFront Distribution Module

output "distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.dms_frontend.id
}

output "distribution_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.dms_frontend.arn
}

output "distribution_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.dms_frontend.domain_name
}

output "distribution_hosted_zone_id" {
  description = "CloudFront distribution hosted zone ID"
  value       = aws_cloudfront_distribution.dms_frontend.hosted_zone_id
}
