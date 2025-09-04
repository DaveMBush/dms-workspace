# Variables for CloudWatch Monitoring Module

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "vpc_id" {
  description = "VPC ID for flow logs"
  type        = string
}

variable "enable_vpc_flow_logs" {
  description = "Enable VPC Flow Logs"
  type        = bool
  default     = true
}

variable "alert_emails" {
  description = "List of email addresses for alerts"
  type        = list(string)
  default     = []
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  default     = ""
}

# ALB variables
variable "alb_arn_suffix" {
  description = "ALB ARN suffix for CloudWatch metrics"
  type        = string
  default     = ""
}

variable "alb_name" {
  description = "ALB name for dashboard"
  type        = string
  default     = ""
}

# ECS variables
variable "ecs_service_name" {
  description = "ECS service name for monitoring"
  type        = string
  default     = ""
}

variable "ecs_cluster_name" {
  description = "ECS cluster name for monitoring"
  type        = string
  default     = ""
}

# RDS variables
variable "rds_instance_identifier" {
  description = "RDS instance identifier for monitoring"
  type        = string
  default     = ""
}

# CloudFront variables
variable "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for monitoring"
  type        = string
  default     = ""
}