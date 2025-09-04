# Outputs for S3 Static Website Module

output "bucket_name" {
  description = "Name of the S3 bucket hosting the frontend"
  value       = aws_s3_bucket.rms_frontend.bucket
}

output "bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.rms_frontend.arn
}

output "website_endpoint" {
  description = "S3 website endpoint URL"
  value       = aws_s3_bucket_website_configuration.rms_frontend.website_endpoint
}

output "website_domain" {
  description = "S3 website domain"
  value       = aws_s3_bucket_website_configuration.rms_frontend.website_domain
}

output "bucket_regional_domain_name" {
  description = "Regional domain name of the bucket"
  value       = aws_s3_bucket.rms_frontend.bucket_regional_domain_name
}