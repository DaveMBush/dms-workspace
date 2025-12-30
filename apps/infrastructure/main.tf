provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      Application = "dms"
    }
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

module "vpc" {
  source = "./modules/vpc"

  project_name         = var.project_name
  environment          = var.environment
  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  enable_nat_gateway   = var.enable_nat_gateway
  enable_vpn_gateway   = var.enable_vpn_gateway
  enable_dns_hostnames = var.enable_dns_hostnames
  enable_dns_support   = var.enable_dns_support
}

module "security" {
  source = "./modules/security"

  project_name     = var.project_name
  environment      = var.environment
  vpc_id           = module.vpc.vpc_id
  vpc_cidr_block   = module.vpc.vpc_cidr_block
}

module "ecr" {
  source = "./modules/ecr"

  project_name = var.project_name
  environment  = var.environment
}

module "s3_website" {
  source = "./modules/s3-website"

  environment = var.environment
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Application = "dms"
  }
}

module "cloudfront" {
  source = "./modules/cloudfront"

  environment                      = var.environment
  s3_bucket_name                   = module.s3_website.bucket_name
  s3_bucket_regional_domain_name   = module.s3_website.bucket_regional_domain_name
  api_endpoint                     = var.api_endpoint != "" ? var.api_endpoint : "https://api.dms-app.com"
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Application = "dms"
  }
}

module "cognito" {
  source = "./modules/cognito"

  project_name        = var.project_name
  environment         = var.environment
  admin_email         = var.admin_email
  admin_temp_password = var.admin_temp_password
  production_domain   = var.production_domain
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Application = "dms"
  }
}

module "monitoring" {
  source = "./modules/monitoring"

  environment                 = var.environment
  aws_region                 = var.aws_region
  vpc_id                     = module.vpc.vpc_id
  enable_vpc_flow_logs       = true
  alert_emails               = var.alert_emails
  slack_webhook_url          = var.slack_webhook_url
  alb_arn_suffix             = try(module.alb.arn_suffix, "")
  alb_name                   = try(module.alb.name, "")
  ecs_service_name           = try(module.ecs.service_name, "")
  ecs_cluster_name           = try(module.ecs.cluster_name, "")
  rds_instance_identifier    = try(module.rds.instance_identifier, "")
  cloudfront_distribution_id = module.cloudfront.distribution_id
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Application = "dms"
  }
}
