# ECS Cluster and Service Configuration for RMS Backend

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster-${var.environment}"

  configuration {
    execute_command_configuration {
      kms_key_id = aws_kms_key.ecs_logs.arn
      logging    = "OVERRIDE"

      log_configuration {
        cloud_watch_encryption_enabled = true
        cloud_watch_log_group_name     = aws_cloudwatch_log_group.ecs_cluster.name
      }
    }
  }

  tags = {
    Name      = "${var.project_name}-ecs-cluster-${var.environment}"
    Component = "compute"
  }
}

# CloudWatch Log Group for ECS Cluster
resource "aws_cloudwatch_log_group" "ecs_cluster" {
  name              = "/ecs/cluster/${var.project_name}-${var.environment}"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.ecs_logs.arn

  tags = {
    Name      = "${var.project_name}-ecs-cluster-logs-${var.environment}"
    Component = "logging"
  }
}

# CloudWatch Log Group for RMS Backend Application
resource "aws_cloudwatch_log_group" "rms_backend" {
  name              = "/ecs/${var.project_name}/backend-${var.environment}"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.ecs_logs.arn

  tags = {
    Name      = "${var.project_name}-backend-logs-${var.environment}"
    Component = "logging"
  }
}

# KMS Key for ECS Logs Encryption
resource "aws_kms_key" "ecs_logs" {
  description             = "KMS key for ECS logs encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name      = "${var.project_name}-ecs-logs-key-${var.environment}"
    Component = "security"
  }
}

resource "aws_kms_alias" "ecs_logs" {
  name          = "alias/${var.project_name}-ecs-logs-${var.environment}"
  target_key_id = aws_kms_key.ecs_logs.key_id
}

# ECS Task Definition
resource "aws_ecs_task_definition" "rms_backend" {
  family                   = "${var.project_name}-backend-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = var.ecs_task_execution_role_arn
  task_role_arn           = var.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name  = "${var.project_name}-backend"
      image = "${var.ecr_repository_url}:${var.image_tag}"

      essential = true

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "3000"
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "LOG_LEVEL"
          value = var.log_level
        }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = var.database_url_parameter_arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.rms_backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      stopTimeout = 30

      systemControls = []
    }
  ])

  tags = {
    Name      = "${var.project_name}-backend-task-${var.environment}"
    Component = "compute"
  }
}

# ECS Service
resource "aws_ecs_service" "rms_backend" {
  name            = "${var.project_name}-backend-service-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.rms_backend.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
    deployment_circuit_breaker {
      enable   = true
      rollback = true
    }
  }

  network_configuration {
    security_groups  = [var.ecs_security_group_id]
    subnets          = var.private_subnet_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "${var.project_name}-backend"
    container_port   = 3000
  }

  service_registries {
    registry_arn = aws_service_discovery_service.rms_backend.arn
  }

  depends_on = [
    var.alb_listener_arn
  ]

  tags = {
    Name      = "${var.project_name}-backend-service-${var.environment}"
    Component = "compute"
  }
}

# Service Discovery
resource "aws_service_discovery_private_dns_namespace" "rms" {
  name        = "${var.project_name}.${var.environment}.local"
  description = "Private DNS namespace for RMS services"
  vpc         = var.vpc_id

  tags = {
    Name      = "${var.project_name}-service-discovery-${var.environment}"
    Component = "networking"
  }
}

resource "aws_service_discovery_service" "rms_backend" {
  name = "backend"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.rms.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = {
    Name      = "${var.project_name}-backend-discovery-${var.environment}"
    Component = "networking"
  }
}