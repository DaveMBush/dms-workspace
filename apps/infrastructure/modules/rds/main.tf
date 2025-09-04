# RDS PostgreSQL module for RMS application
resource "aws_db_subnet_group" "rms" {
  name       = "rms-db-subnet-group-${var.environment}"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.common_tags, {
    Name = "RMS DB Subnet Group"
  })
}

resource "aws_db_parameter_group" "rms_postgres" {
  family = "postgres15"
  name   = "rms-postgres-params-${var.environment}"

  # PostgreSQL optimizations for RMS application
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "log_statement"
    value = "mod"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "max_connections"
    value = var.max_connections
  }

  tags = var.common_tags
}

# Generate random password for database
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Store password in AWS Systems Manager Parameter Store
resource "aws_ssm_parameter" "db_password" {
  name        = "/rms/${var.environment}/database-password"
  description = "RDS PostgreSQL password for ${var.environment} environment"
  type        = "SecureString"
  value       = random_password.db_password.result

  tags = var.common_tags
}

# RDS PostgreSQL instance
resource "aws_db_instance" "rms_postgres" {
  identifier             = "rms-postgres-${var.environment}"
  allocated_storage      = var.allocated_storage
  max_allocated_storage  = var.max_allocated_storage
  storage_type           = "gp3"
  storage_encrypted      = true
  kms_key_id            = var.kms_key_id

  engine                 = "postgres"
  engine_version         = var.postgres_version
  instance_class         = var.instance_class
  
  db_name  = var.database_name
  username = var.database_username
  password = random_password.db_password.result

  vpc_security_group_ids = [var.rds_security_group_id]
  db_subnet_group_name   = aws_db_subnet_group.rms.name
  parameter_group_name   = aws_db_parameter_group.rms_postgres.name

  # Backup configuration
  backup_retention_period = var.backup_retention_period
  backup_window          = var.backup_window
  maintenance_window     = var.maintenance_window

  # Multi-AZ deployment for production
  multi_az = var.multi_az

  # Monitoring
  monitoring_interval = var.monitoring_interval
  monitoring_role_arn = var.monitoring_role_arn

  # Performance Insights
  performance_insights_enabled          = var.performance_insights_enabled
  performance_insights_retention_period = var.performance_insights_retention_period

  # Security
  deletion_protection = var.deletion_protection

  # Snapshots
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "rms-postgres-${var.environment}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  # Enable automated minor version upgrades
  auto_minor_version_upgrade = true

  # Copy tags to snapshots
  copy_tags_to_snapshot = true

  tags = merge(var.common_tags, {
    Name = "RMS PostgreSQL Database"
  })

  lifecycle {
    prevent_destroy = true
  }
}

# Store database connection URL in Parameter Store
resource "aws_ssm_parameter" "database_url" {
  name        = "/rms/${var.environment}/database-url"
  description = "PostgreSQL connection string for ${var.environment} environment"
  type        = "SecureString"
  value = "postgresql://${var.database_username}:${random_password.db_password.result}@${aws_db_instance.rms_postgres.endpoint}:5432/${var.database_name}?schema=public&sslmode=require"

  tags = var.common_tags
}

# CloudWatch alarms for monitoring
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  alarm_name          = "rms-postgres-high-cpu-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS PostgreSQL CPU utilization"
  alarm_actions       = var.alarm_actions

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.rms_postgres.id
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "database_connections" {
  alarm_name          = "rms-postgres-high-connections-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.max_connections * 0.8 # Alert at 80% of max connections
  alarm_description   = "This metric monitors RDS PostgreSQL connection count"
  alarm_actions       = var.alarm_actions

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.rms_postgres.id
  }

  tags = var.common_tags
}