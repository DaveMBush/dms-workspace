# S3 Static Website Module for DMS Frontend
# Provides secure, scalable hosting for Angular SPA

resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

resource "aws_s3_bucket" "dms_frontend" {
  bucket = "dms-frontend-${var.environment}-${random_string.bucket_suffix.result}"

  tags = var.common_tags
}

resource "aws_s3_bucket_website_configuration" "dms_frontend" {
  bucket = aws_s3_bucket.dms_frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "dms_frontend" {
  bucket = aws_s3_bucket.dms_frontend.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "dms_frontend" {
  bucket = aws_s3_bucket.dms_frontend.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.dms_frontend.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.dms_frontend]
}

resource "aws_s3_bucket_versioning" "dms_frontend" {
  bucket = aws_s3_bucket.dms_frontend.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "dms_frontend" {
  bucket = aws_s3_bucket.dms_frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_logging" "dms_frontend" {
  count = var.access_logging_bucket != "" ? 1 : 0

  bucket = aws_s3_bucket.dms_frontend.id

  target_bucket = var.access_logging_bucket
  target_prefix = "s3-access-logs/dms-frontend/"
}

resource "aws_s3_bucket_lifecycle_configuration" "dms_frontend" {
  bucket = aws_s3_bucket.dms_frontend.id

  rule {
    id     = "delete_old_versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  rule {
    id     = "delete_incomplete_uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}
