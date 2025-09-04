# Outputs for ALB module

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.rms_backend.arn
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.rms_backend.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.rms_backend.zone_id
}

output "target_group_arn" {
  description = "ARN of the target group"
  value       = aws_lb_target_group.rms_backend.arn
}

output "http_listener_arn" {
  description = "ARN of the HTTP listener"
  value       = aws_lb_listener.http.arn
}

output "https_listener_arn" {
  description = "ARN of the HTTPS listener"
  value       = aws_lb_listener.https.arn
}

output "alb_logs_bucket_name" {
  description = "Name of the S3 bucket for ALB logs"
  value       = aws_s3_bucket.alb_logs.bucket
}