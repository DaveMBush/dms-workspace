# Auto-scaling configuration for ECS service

# Auto-scaling target
resource "aws_appautoscaling_target" "dms_backend" {
  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${var.ecs_cluster_name}/${var.ecs_service_name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  tags = {
    Name      = "${var.project_name}-backend-autoscaling-${var.environment}"
    Component = "compute"
  }
}

# CPU-based scaling policy
resource "aws_appautoscaling_policy" "dms_backend_cpu" {
  name               = "${var.project_name}-backend-cpu-scaling-${var.environment}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.dms_backend.resource_id
  scalable_dimension = aws_appautoscaling_target.dms_backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.dms_backend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.cpu_target_value
    scale_out_cooldown = var.scale_out_cooldown
    scale_in_cooldown  = var.scale_in_cooldown
  }

  depends_on = [aws_appautoscaling_target.dms_backend]
}

# Memory-based scaling policy
resource "aws_appautoscaling_policy" "dms_backend_memory" {
  name               = "${var.project_name}-backend-memory-scaling-${var.environment}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.dms_backend.resource_id
  scalable_dimension = aws_appautoscaling_target.dms_backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.dms_backend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = var.memory_target_value
    scale_out_cooldown = var.scale_out_cooldown
    scale_in_cooldown  = var.scale_in_cooldown
  }

  depends_on = [aws_appautoscaling_target.dms_backend]
}

# CloudWatch Alarms for monitoring scaling events
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "${var.project_name}-backend-high-cpu-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.cpu_target_value
  alarm_description   = "This metric monitors ecs cpu utilization"
  alarm_actions       = var.alarm_actions

  dimensions = {
    ServiceName = var.ecs_service_name
    ClusterName = var.ecs_cluster_name
  }

  tags = {
    Name      = "${var.project_name}-backend-high-cpu-alarm-${var.environment}"
    Component = "monitoring"
  }
}

resource "aws_cloudwatch_metric_alarm" "high_memory" {
  alarm_name          = "${var.project_name}-backend-high-memory-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.memory_target_value
  alarm_description   = "This metric monitors ecs memory utilization"
  alarm_actions       = var.alarm_actions

  dimensions = {
    ServiceName = var.ecs_service_name
    ClusterName = var.ecs_cluster_name
  }

  tags = {
    Name      = "${var.project_name}-backend-high-memory-alarm-${var.environment}"
    Component = "monitoring"
  }
}

# ALB-based scaling policy (for request-based scaling)
resource "aws_appautoscaling_policy" "dms_backend_request_count" {
  count = var.enable_request_based_scaling ? 1 : 0

  name               = "${var.project_name}-backend-request-scaling-${var.environment}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.dms_backend.resource_id
  scalable_dimension = aws_appautoscaling_target.dms_backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.dms_backend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${var.alb_arn_suffix}/${var.target_group_arn_suffix}"
    }
    target_value       = var.request_count_target_value
    scale_out_cooldown = var.scale_out_cooldown
    scale_in_cooldown  = var.scale_in_cooldown
  }

  depends_on = [aws_appautoscaling_target.dms_backend]
}
