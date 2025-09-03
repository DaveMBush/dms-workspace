terraform {
  backend "s3" {
    bucket         = "rms-terraform-state"
    key            = "global/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "rms-terraform-locks"
    encrypt        = true
  }
}