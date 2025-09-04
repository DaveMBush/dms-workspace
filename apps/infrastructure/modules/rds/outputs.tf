# RDS PostgreSQL module outputs

output "db_instance_id" {
  description = "The RDS instance ID"
  value       = aws_db_instance.rms_postgres.id
}

output "db_instance_arn" {
  description = "The ARN of the RDS instance"
  value       = aws_db_instance.rms_postgres.arn
}

output "db_instance_endpoint" {
  description = "The RDS instance endpoint"
  value       = aws_db_instance.rms_postgres.endpoint
}

output "db_instance_hosted_zone_id" {
  description = "The canonical hosted zone ID of the DB instance"
  value       = aws_db_instance.rms_postgres.hosted_zone_id
}

output "db_instance_port" {
  description = "The database port"
  value       = aws_db_instance.rms_postgres.port
}

output "db_instance_name" {
  description = "The database name"
  value       = aws_db_instance.rms_postgres.db_name
}

output "db_instance_username" {
  description = "The master username for the database"
  value       = aws_db_instance.rms_postgres.username
  sensitive   = true
}

output "db_instance_status" {
  description = "The RDS instance status"
  value       = aws_db_instance.rms_postgres.status
}

output "db_subnet_group_name" {
  description = "The name of the DB subnet group"
  value       = aws_db_subnet_group.rms.name
}

output "db_parameter_group_name" {
  description = "The name of the DB parameter group"
  value       = aws_db_parameter_group.rms_postgres.name
}

# Parameter Store references
output "database_password_parameter_name" {
  description = "The name of the SSM parameter containing the database password"
  value       = aws_ssm_parameter.db_password.name
}

output "database_url_parameter_name" {
  description = "The name of the SSM parameter containing the database connection URL"
  value       = aws_ssm_parameter.database_url.name
}

# For application configuration
output "database_url" {
  description = "The PostgreSQL connection URL"
  value       = aws_ssm_parameter.database_url.value
  sensitive   = true
}