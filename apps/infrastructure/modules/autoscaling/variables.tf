# Variables for auto-scaling module

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
}

variable "ecs_service_name" {
  description = "Name of the ECS service"
  type        = string
}

variable "min_capacity" {
  description = "Minimum capacity for auto-scaling"
  type        = number
  default     = 1
}

variable "max_capacity" {
  description = "Maximum capacity for auto-scaling"
  type        = number
  default     = 10
}

variable "cpu_target_value" {
  description = "Target CPU utilization percentage"
  type        = number
  default     = 70.0
}

variable "memory_target_value" {
  description = "Target memory utilization percentage"
  type        = number
  default     = 80.0
}

variable "scale_out_cooldown" {
  description = "Cooldown period in seconds after scaling out"
  type        = number
  default     = 300
}

variable "scale_in_cooldown" {
  description = "Cooldown period in seconds after scaling in"
  type        = number
  default     = 300
}

variable "alarm_actions" {
  description = "List of actions to execute when alarm triggers"
  type        = list(string)
  default     = []
}

variable "enable_request_based_scaling" {
  description = "Enable request-based auto-scaling"
  type        = bool
  default     = false
}

variable "request_count_target_value" {
  description = "Target request count per target for scaling"
  type        = number
  default     = 1000
}

variable "alb_arn_suffix" {
  description = "ALB ARN suffix for request-based scaling"
  type        = string
  default     = ""
}

variable "target_group_arn_suffix" {
  description = "Target group ARN suffix for request-based scaling"
  type        = string
  default     = ""
}