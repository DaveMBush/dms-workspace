terraform {
  backend "s3" {
    bucket         = "dms-terraform-state"
    key            = "global/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "dms-terraform-locks"
    encrypt        = true
  }
}
