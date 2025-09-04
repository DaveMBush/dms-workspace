# Variables for ECR module

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "image_retention_count" {
  description = "Number of images to retain in ECR repository"
  type        = number
  default     = 10
}

variable "untagged_image_retention_days" {
  description = "Number of days to retain untagged images"
  type        = number
  default     = 1
}

variable "enable_vulnerability_scanning" {
  description = "Enable vulnerability scanning on push"
  type        = bool
  default     = true
}