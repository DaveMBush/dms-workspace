# CloudWatch Monitoring Module for RMS
# Provides comprehensive monitoring, logging, and alerting infrastructure

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "ecs_application" {
  name              = "/aws/ecs/rms-backend-${var.environment}"
  retention_in_days = var.environment == "prod" ? 90 : 7

  tags = var.common_tags
}

resource "aws_cloudwatch_log_group" "alb_access" {
  name              = "/aws/applicationloadbalancer/rms-alb-${var.environment}"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = var.common_tags
}

resource "aws_cloudwatch_log_group" "rds_performance" {
  name              = "/aws/rds/instance/rms-postgres-${var.environment}/postgresql"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = var.common_tags
}

resource "aws_cloudwatch_log_group" "cloudfront_access" {
  name              = "/aws/cloudfront/rms-frontend-${var.environment}"
  retention_in_days = var.environment == "prod" ? 14 : 7

  tags = var.common_tags
}

resource "aws_cloudwatch_log_group" "vpc_flow_logs" {
  name              = "/aws/vpc/flowlogs/rms-${var.environment}"
  retention_in_days = var.environment == "prod" ? 14 : 7

  tags = var.common_tags
}

# VPC Flow Logs
resource "aws_flow_log" "vpc_flow_logs" {
  count           = var.enable_vpc_flow_logs ? 1 : 0
  iam_role_arn    = aws_iam_role.flow_logs[0].arn
  log_destination = aws_cloudwatch_log_group.vpc_flow_logs.arn
  traffic_type    = "ALL"
  vpc_id          = var.vpc_id

  tags = var.common_tags
}

resource "aws_iam_role" "flow_logs" {
  count = var.enable_vpc_flow_logs ? 1 : 0
  name  = "rms-vpc-flow-logs-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy" "flow_logs" {
  count = var.enable_vpc_flow_logs ? 1 : 0
  name  = "rms-vpc-flow-logs-policy-${var.environment}"
  role  = aws_iam_role.flow_logs[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

# SNS Topics for Alerts
resource "aws_sns_topic" "alerts" {
  name = "rms-alerts-${var.environment}"

  tags = var.common_tags
}

resource "aws_sns_topic_subscription" "email_alerts" {
  count     = length(var.alert_emails)
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_emails[count.index]
}

resource "aws_sns_topic_subscription" "slack_alerts" {
  count     = var.slack_webhook_url != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "https"
  endpoint  = var.slack_webhook_url
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "rms-high-error-rate-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "High error rate detected in ALB"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "high_response_time" {
  alarm_name          = "rms-high-response-time-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = "2.0"
  alarm_description   = "High response time detected in ALB"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  alarm_name          = "rms-ecs-cpu-high-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "ECS CPU utilization is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = var.ecs_service_name
    ClusterName = var.ecs_cluster_name
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "ecs_memory_high" {
  alarm_name          = "rms-ecs-memory-high-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "ECS memory utilization is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = var.ecs_service_name
    ClusterName = var.ecs_cluster_name
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "rms-rds-cpu-high-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "RDS CPU utilization is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_identifier
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "rds_connections_high" {
  alarm_name          = "rms-rds-connections-high-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "RDS connection count is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_identifier
  }

  tags = var.common_tags
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "RMS-${var.environment}-Overview"

  dashboard_body = templatefile("${path.module}/dashboard.json.tpl", {
    environment           = var.environment
    aws_region           = var.aws_region
    alb_name             = var.alb_name
    ecs_service_name     = var.ecs_service_name
    ecs_cluster_name     = var.ecs_cluster_name
    rds_instance_id      = var.rds_instance_identifier
    cloudfront_distribution_id = var.cloudfront_distribution_id
  })
}

# Cost Monitoring
resource "aws_budgets_budget" "monthly_cost" {
  name         = "rms-monthly-budget-${var.environment}"
  budget_type  = "COST"
  limit_amount = var.environment == "prod" ? "100" : "20"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"
  time_period_start = formatdate("YYYY-MM-DD", timestamp())

  cost_filters = {
    Service = [
      "Amazon Elastic Compute Cloud - Compute",
      "Amazon Relational Database Service",
      "Amazon Simple Storage Service",
      "Amazon CloudFront"
    ]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = var.alert_emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.alert_emails
  }

  depends_on = [aws_sns_topic.alerts]
}

resource "aws_ce_anomaly_detector" "cost_anomaly" {
  name     = "rms-cost-anomaly-${var.environment}"
  type     = "DIMENSIONAL"
  frequency = "DAILY"

  dimension_key = "SERVICE"
  match_options = ["EQUALS"]
  values        = ["EC2-Instance", "RDS", "S3", "CloudFront"]

  tags = var.common_tags
}

resource "aws_ce_anomaly_monitor" "cost_monitor" {
  name         = "rms-cost-monitor-${var.environment}"
  monitor_type = "DIMENSIONAL"

  specification = jsonencode({
    Dimension = "SERVICE"
    Key       = "SERVICE"
    Values    = ["EC2-Instance", "RDS", "S3", "CloudFront"]
    MatchOptions = ["EQUALS"]
  })

  tags = var.common_tags
}

resource "aws_ce_anomaly_subscription" "cost_subscription" {
  name      = "rms-cost-alerts-${var.environment}"
  frequency = "DAILY"
  
  monitor_arn_list = [
    aws_ce_anomaly_monitor.cost_monitor.arn
  ]

  subscriber {
    type    = "EMAIL"
    address = var.alert_emails[0]
  }

  threshold_expression {
    and {
      dimension {
        key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
        values        = ["10"]
        match_options = ["GREATER_THAN_OR_EQUAL"]
      }
    }
  }

  tags = var.common_tags
}