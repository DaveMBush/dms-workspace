# Outputs for ECR module

output "repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.rms_backend.repository_url
}

output "repository_name" {
  description = "Name of the ECR repository"
  value       = aws_ecr_repository.rms_backend.name
}

output "repository_arn" {
  description = "ARN of the ECR repository"
  value       = aws_ecr_repository.rms_backend.arn
}

output "registry_id" {
  description = "Registry ID where the repository was created"
  value       = aws_ecr_repository.rms_backend.registry_id
}