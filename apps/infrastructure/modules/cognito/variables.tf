variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "admin_email" {
  description = "Email address for the admin user"
  type        = string
  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.admin_email))
    error_message = "Admin email must be a valid email address."
  }
}

variable "admin_temp_password" {
  description = "Temporary password for admin user (will be required to change on first login)"
  type        = string
  sensitive   = true
  validation {
    condition     = length(var.admin_temp_password) >= 8
    error_message = "Temporary password must be at least 8 characters long."
  }
}

variable "production_domain" {
  description = "Production domain for callback URLs (optional)"
  type        = string
  default     = ""
}

variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
  default     = {}
}