# Outputs for CloudWatch Monitoring Module

output "sns_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = aws_sns_topic.alerts.arn
}

output "sns_topic_name" {
  description = "Name of the SNS topic for alerts"
  value       = aws_sns_topic.alerts.name
}

output "log_group_names" {
  description = "Map of log group names"
  value = {
    ecs_application      = aws_cloudwatch_log_group.ecs_application.name
    alb_access          = aws_cloudwatch_log_group.alb_access.name
    rds_performance     = aws_cloudwatch_log_group.rds_performance.name
    cloudfront_access   = aws_cloudwatch_log_group.cloudfront_access.name
    vpc_flow_logs       = aws_cloudwatch_log_group.vpc_flow_logs.name
  }
}

output "dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}

output "budget_name" {
  description = "Name of the AWS budget"
  value       = aws_budgets_budget.monthly_cost.name
}

output "cost_anomaly_detector_arn" {
  description = "ARN of the cost anomaly detector"
  value       = aws_ce_anomaly_detector.cost_anomaly.arn
}