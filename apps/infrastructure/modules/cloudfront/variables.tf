# Variables for CloudFront Distribution Module

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket serving as origin"
  type        = string
}

variable "s3_bucket_regional_domain_name" {
  description = "Regional domain name of the S3 bucket"
  type        = string
}

variable "domain_name" {
  description = "Custom domain name for the distribution (optional)"
  type        = string
  default     = ""
}

variable "ssl_certificate_arn" {
  description = "ARN of SSL certificate from ACM (optional)"
  type        = string
  default     = ""
}

variable "api_endpoint" {
  description = "API endpoint URL for CSP connect-src policy"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}