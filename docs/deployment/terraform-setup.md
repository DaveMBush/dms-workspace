# Terraform Setup and Prerequisites

This guide covers the installation and configuration of required tools for RMS infrastructure deployment.

## Required Tools and Versions

### Core Tools

| Tool                                   | Minimum Version | Installation Link                                                                              |
| -------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------- |
| [Terraform](https://terraform.io)      | >= 1.5.0        | [Install Guide](https://learn.hashicorp.com/tutorials/terraform/install-cli)                   |
| [AWS CLI](https://aws.amazon.com/cli/) | >= 2.0          | [Install Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) |
| [Docker](https://docker.com)           | >= 20.0         | [Install Guide](https://docs.docker.com/get-docker/)                                           |
| [Node.js](https://nodejs.org)          | >= 22.0         | [Install Guide](https://nodejs.org/en/download/)                                               |
| [pnpm](https://pnpm.io)                | >= 8.0          | [Install Guide](https://pnpm.io/installation)                                                  |

### Optional but Recommended

- [jq](https://stedolan.github.io/jq/) - For JSON processing in scripts
- [AWS Session Manager Plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html) - For secure instance access

## Installation Instructions

### macOS Installation

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required tools
brew install terraform awscli docker node pnpm jq

# Start Docker
brew services start docker

# Verify installations
terraform version
aws --version
docker --version
node --version
pnpm --version
```

### Linux Installation (Ubuntu/Debian)

```bash
# Update package manager
sudo apt-get update

# Install dependencies
sudo apt-get install -y gnupg software-properties-common curl

# Install Terraform
wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt-get update && sudo apt-get install terraform

# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Verify installations
terraform version
aws --version
docker --version
node --version
pnpm --version
```

### Windows Installation

```powershell
# Install Chocolatey (if not installed)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install required tools
choco install terraform awscli docker-desktop nodejs pnpm jq

# Verify installations
terraform version
aws --version
docker --version
node --version
pnpm --version
```

## AWS Account Setup

### 1. AWS Account Creation

1. Create AWS account at [aws.amazon.com](https://aws.amazon.com)
2. Set up billing alerts and budgets
3. Enable MFA for root account

### 2. IAM User Creation

Create an IAM user with programmatic access:

```bash
# Using AWS CLI (after initial setup)
aws iam create-user --user-name rms-deploy-user

# Create access keys
aws iam create-access-key --user-name rms-deploy-user

# Attach required policies (see Required Permissions section)
```

### 3. Required AWS Permissions

The deployment user requires these IAM policies:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ec2:*", "ecs:*", "rds:*", "s3:*", "cloudfront:*", "route53:*", "iam:*", "logs:*", "cloudwatch:*", "application-autoscaling:*", "elasticloadbalancing:*", "acm:*", "sns:*", "ssm:*"],
      "Resource": "*"
    }
  ]
}
```

**Security Note**: In production, use more restrictive policies with specific resource ARNs.

## AWS CLI Configuration

### Configure AWS Credentials

```bash
# Configure default profile
aws configure

# Or create named profile for RMS
aws configure --profile rms

# Set profile as default (optional)
export AWS_PROFILE=rms
```

**Configuration Values:**

- **AWS Access Key ID**: From IAM user creation
- **AWS Secret Access Key**: From IAM user creation
- **Default region**: `us-east-1` (recommended for RMS)
- **Default output format**: `json`

### Verify AWS Configuration

```bash
# Test AWS CLI access
aws sts get-caller-identity

# Expected output:
{
    "UserId": "AIDACKCEVSQ6C2EXAMPLE",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/rms-deploy-user"
}
```

## Terraform Configuration

### Backend Configuration

RMS uses S3 for Terraform state storage with DynamoDB for locking:

1. Create S3 bucket for Terraform state:

```bash
# Create state bucket (replace with unique name)
aws s3 mb s3://rms-terraform-state-unique-suffix

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket rms-terraform-state-unique-suffix \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket rms-terraform-state-unique-suffix \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }
    ]
  }'
```

2. Create DynamoDB table for state locking:

```bash
aws dynamodb create-table \
  --table-name rms-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### Initialize Terraform

```bash
# Navigate to infrastructure directory
cd apps/infrastructure

# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Check formatting
terraform fmt -check
```

## Development Environment Setup

### Clone Repository

```bash
# Clone the RMS repository
git clone https://github.com/your-org/rms-workspace.git
cd rms-workspace

# Install dependencies
pnpm install
```

### Environment Variables

Create environment-specific variable files:

```bash
# Create environment directories
mkdir -p apps/infrastructure/environments/{dev,staging,prod}

# Copy example variables
cp apps/infrastructure/terraform.tfvars.example apps/infrastructure/environments/dev/terraform.tfvars
```

## Verification Checklist

Before proceeding with deployment, verify:

- [ ] All required tools installed and versions meet minimum requirements
- [ ] AWS CLI configured with valid credentials and appropriate permissions
- [ ] Terraform initialized successfully in infrastructure directory
- [ ] S3 bucket created for Terraform state
- [ ] DynamoDB table created for Terraform locks
- [ ] Repository cloned and dependencies installed
- [ ] Environment variables configured for target environment

## Troubleshooting

### Common Installation Issues

**Terraform not found:**

```bash
# Verify PATH includes Terraform location
echo $PATH
which terraform

# On macOS, you may need to restart terminal after brew install
```

**AWS CLI permission errors:**

```bash
# Verify credentials are configured
aws configure list

# Test with basic AWS call
aws sts get-caller-identity
```

**Docker permission issues (Linux):**

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and log back in for changes to take effect
```

### Version Compatibility

If you encounter version compatibility issues:

1. Check minimum required versions in this document
2. Update tools to latest stable versions
3. Verify Terraform provider versions in `apps/infrastructure/versions.tf`

## Next Steps

Once setup is complete, proceed to:

1. [Environment Configuration](environment-setup.md)
2. [Infrastructure Deployment](infrastructure-deployment.md)

---

**Last Updated**: 2024-12-16
**Version**: 1.0
