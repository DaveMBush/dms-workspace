terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "rms-terraform-state-prod"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "rms-terraform-locks"
    encrypt        = true
  }
}

module "rms_infrastructure" {
  source = "../.."

  project_name       = "rms"
  environment        = "prod"
  aws_region         = "us-east-1"
  vpc_cidr           = "10.2.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
  enable_nat_gateway = true
}