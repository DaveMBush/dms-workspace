# Variables for S3 Static Website Module

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "access_logging_bucket" {
  description = "S3 bucket for access logging (optional)"
  type        = string
  default     = ""
}