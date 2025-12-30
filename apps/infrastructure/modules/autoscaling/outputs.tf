# Outputs for auto-scaling module

output "autoscaling_target_resource_id" {
  description = "Resource ID of the auto-scaling target"
  value       = aws_appautoscaling_target.dms_backend.resource_id
}

output "cpu_scaling_policy_arn" {
  description = "ARN of the CPU-based scaling policy"
  value       = aws_appautoscaling_policy.dms_backend_cpu.arn
}

output "memory_scaling_policy_arn" {
  description = "ARN of the memory-based scaling policy"
  value       = aws_appautoscaling_policy.dms_backend_memory.arn
}

output "request_scaling_policy_arn" {
  description = "ARN of the request-based scaling policy"
  value       = var.enable_request_based_scaling ? aws_appautoscaling_policy.dms_backend_request_count[0].arn : null
}

output "high_cpu_alarm_arn" {
  description = "ARN of the high CPU alarm"
  value       = aws_cloudwatch_metric_alarm.high_cpu.arn
}

output "high_memory_alarm_arn" {
  description = "ARN of the high memory alarm"
  value       = aws_cloudwatch_metric_alarm.high_memory.arn
}
