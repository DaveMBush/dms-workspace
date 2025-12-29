# Documentation Automation and Maintenance

This document outlines the automated processes and maintenance procedures for keeping the DMS documentation up-to-date and accurate.

## Overview

The DMS documentation system includes several automated processes to ensure documentation remains current, accurate, and easily maintainable across all environments and team changes.

## Automated Documentation Updates

### Infrastructure Documentation Sync

#### Terraform State Documentation

Automatically generate infrastructure documentation from Terraform state:

```bash
#!/bin/bash
# scripts/update-infra-docs.sh

set -e

echo "🏗️  Updating infrastructure documentation..."

# Generate current state documentation
cd apps/infrastructure
terraform output -json > ../../docs/infrastructure/current-state.json

# Generate resource inventory
terraform state list > ../../docs/infrastructure/resource-inventory.txt

# Update cost estimates
terraform plan -out=plan.out > /dev/null
terraform show -json plan.out | jq '.planned_values.root_module.resources[] | {type: .type, name: .name, values: .values}' > ../../docs/infrastructure/planned-resources.json

rm -f plan.out

echo "✅ Infrastructure documentation updated"
```

#### Service Documentation Updates

```bash
#!/bin/bash
# scripts/update-service-docs.sh

set -e

echo "📋 Updating service documentation..."

# Generate ECS service information
aws ecs describe-services \
  --cluster dms-production \
  --services $(aws ecs list-services --cluster dms-production --query 'serviceArns[]' --output text) \
  --query 'services[*].{Name:serviceName,Status:status,TaskDefinition:taskDefinition,DesiredCount:desiredCount,RunningCount:runningCount}' \
  --output table > docs/operations/current-services.txt

# Generate RDS information
aws rds describe-db-instances \
  --query 'DBInstances[*].{Identifier:DBInstanceIdentifier,Status:DBInstanceStatus,Engine:Engine,Class:DBInstanceClass,Storage:AllocatedStorage}' \
  --output table > docs/operations/current-databases.txt

# Generate ALB information
aws elbv2 describe-load-balancers \
  --query 'LoadBalancers[*].{Name:LoadBalancerName,State:State.Code,Type:Type,Scheme:Scheme}' \
  --output table > docs/operations/current-load-balancers.txt

echo "✅ Service documentation updated"
```

### Health Check Documentation

```bash
#!/bin/bash
# scripts/update-health-docs.sh

set -e

echo "🩺 Updating health check documentation..."

# Generate current health status
./scripts/daily-health-check.sh --json > docs/operations/last-health-check.json

# Update monitoring endpoints
curl -s https://api.dms.company.com/health | jq '.' > docs/operations/api-health-schema.json 2>/dev/null || echo '{"status": "unreachable"}' > docs/operations/api-health-schema.json

# Update database health schema
if [ -n "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" -c "SELECT version();" -t > docs/operations/database-version.txt 2>/dev/null || echo "Database unreachable" > docs/operations/database-version.txt
fi

echo "✅ Health check documentation updated"
```

## Automated Validation

### Documentation Linting

```bash
#!/bin/bash
# scripts/lint-docs.sh

set -e

echo "🔍 Linting documentation..."

# Check markdown files
find docs -name "*.md" -exec markdownlint {} \;

# Check for broken links
find docs -name "*.md" -exec markdown-link-check {} \;

# Check for TODO/FIXME comments
if grep -r "TODO\|FIXME\|XXX" docs/ --include="*.md"; then
  echo "⚠️  Found TODO/FIXME comments in documentation"
  exit 1
fi

echo "✅ Documentation lint passed"
```

### Content Freshness Check

```bash
#!/bin/bash
# scripts/check-doc-freshness.sh

set -e

echo "📅 Checking documentation freshness..."

# Find files older than 90 days
OLD_FILES=$(find docs -name "*.md" -mtime +90)

if [ -n "$OLD_FILES" ]; then
  echo "⚠️  The following documentation files are older than 90 days:"
  echo "$OLD_FILES"

  # Create GitHub issue for stale docs
  gh issue create \
    --title "Stale Documentation Review Required" \
    --body "The following documentation files need review and updates:\\n\\n$OLD_FILES\\n\\nPlease review and update these files or mark them as current if no changes are needed." \
    --label "documentation,maintenance"
fi

echo "✅ Documentation freshness check completed"
```

## GitHub Actions Workflows

### Documentation Update Workflow

`.github/workflows/update-docs.yml`:

```yaml
name: Update Documentation

on:
  schedule:
    - cron: '0 6 * * 1' # Every Monday at 6 AM
  workflow_dispatch:
  push:
    paths:
      - 'apps/infrastructure/**'
      - 'scripts/**'

jobs:
  update-docs:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.5.0

      - name: Update infrastructure docs
        run: ./scripts/update-infra-docs.sh

      - name: Update service docs
        run: ./scripts/update-service-docs.sh

      - name: Update health docs
        run: ./scripts/update-health-docs.sh

      - name: Lint documentation
        run: ./scripts/lint-docs.sh

      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: 'docs: automated documentation update'
          title: 'Automated Documentation Update'
          body: |
            Automated documentation update including:
            - Infrastructure state updates
            - Service configuration updates
            - Health check status updates

            This PR was automatically generated by the documentation update workflow.
          branch: automated-docs-update
          delete-branch: true
```

### Documentation Validation Workflow

`.github/workflows/validate-docs.yml`:

```yaml
name: Validate Documentation

on:
  pull_request:
    paths:
      - 'docs/**'
      - '.github/workflows/validate-docs.yml'
  push:
    branches: [main]
    paths:
      - 'docs/**'

jobs:
  validate:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install markdownlint
        run: npm install -g markdownlint-cli

      - name: Install markdown-link-check
        run: npm install -g markdown-link-check

      - name: Lint documentation
        run: ./scripts/lint-docs.sh

      - name: Check documentation freshness
        run: ./scripts/check-doc-freshness.sh
```

## Maintenance Schedules

### Daily Automated Tasks

- Health check documentation updates
- Service status documentation refresh
- Broken link checking

### Weekly Automated Tasks

- Infrastructure documentation sync
- Cost report updates
- Performance metrics documentation
- Security posture documentation

### Monthly Manual Tasks

- Review and update architecture diagrams
- Update disaster recovery procedures
- Review and update troubleshooting guides
- Validate emergency contact information

### Quarterly Manual Tasks

- Complete documentation audit
- Update capacity planning documentation
- Review and update security procedures
- Update compliance documentation

## Documentation Standards

### Markdown Standards

- Use consistent heading levels
- Include table of contents for long documents
- Use code blocks with language specification
- Include last updated dates

### Content Standards

- Keep procedures step-by-step and actionable
- Include expected outputs for commands
- Provide troubleshooting for common issues
- Use consistent terminology throughout

### Review Process

- All documentation changes require PR review
- Technical accuracy review by subject matter experts
- Usability review by team members not involved in creation
- Regular audits for accuracy and completeness

## Notification System

### Slack Integration

```bash
#!/bin/bash
# scripts/notify-doc-updates.sh

WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

send_notification() {
  local message="$1"
  local channel="${2:-#dms-devops}"

  curl -X POST -H 'Content-type: application/json' \
    --data "{\"channel\":\"$channel\",\"text\":\"$message\"}" \
    "$WEBHOOK_URL"
}

# Usage examples:
# send_notification "📚 Documentation updated: Infrastructure state sync completed"
# send_notification "⚠️  Stale documentation detected - review required" "#dms-team"
```

### Email Notifications

```bash
#!/bin/bash
# scripts/email-doc-alerts.sh

send_email() {
  local subject="$1"
  local body="$2"
  local recipients="${3:-devops@company.com}"

  aws ses send-email \
    --source "noreply@company.com" \
    --destination "ToAddresses=$recipients" \
    --message "Subject={Data='$subject'},Body={Text={Data='$body'}}"
}

# Usage:
# send_email "Documentation Alert" "Critical documentation is out of date" "team@company.com"
```

## Monitoring and Metrics

### Documentation Health Metrics

- Number of outdated documents
- Documentation coverage percentage
- Link validation success rate
- Time since last update per document

### Automated Reporting

```bash
#!/bin/bash
# scripts/doc-health-report.sh

set -e

echo "📊 Generating documentation health report..."

# Count total documents
TOTAL_DOCS=$(find docs -name "*.md" | wc -l)

# Count outdated documents (>90 days)
OUTDATED_DOCS=$(find docs -name "*.md" -mtime +90 | wc -l)

# Calculate freshness percentage
FRESHNESS_PERCENT=$((($TOTAL_DOCS - $OUTDATED_DOCS) * 100 / $TOTAL_DOCS))

# Check for broken links
BROKEN_LINKS=$(find docs -name "*.md" -exec markdown-link-check {} \; 2>&1 | grep -c "ERROR" || echo "0")

# Generate report
cat > docs/reports/documentation-health-$(date +%Y-%m-%d).md << EOF
# Documentation Health Report - $(date +%Y-%m-%d)

## Summary
- Total Documents: $TOTAL_DOCS
- Outdated Documents (>90 days): $OUTDATED_DOCS
- Freshness Score: $FRESHNESS_PERCENT%
- Broken Links: $BROKEN_LINKS

## Recommendations
$([ $OUTDATED_DOCS -gt 0 ] && echo "- Review and update $OUTDATED_DOCS outdated documents")
$([ $BROKEN_LINKS -gt 0 ] && echo "- Fix $BROKEN_LINKS broken links")
$([ $FRESHNESS_PERCENT -lt 80 ] && echo "- Improve documentation maintenance processes")

Generated automatically on $(date)
EOF

echo "✅ Documentation health report generated"
```

## Scripts Directory

All automation scripts are located in the `scripts/` directory:

```
scripts/
├── update-infra-docs.sh
├── update-service-docs.sh
├── update-health-docs.sh
├── lint-docs.sh
├── check-doc-freshness.sh
├── notify-doc-updates.sh
├── email-doc-alerts.sh
└── doc-health-report.sh
```

### Making Scripts Executable

```bash
chmod +x scripts/*.sh
```

## Best Practices

### Automation Best Practices

- Use idempotent scripts that can be run multiple times safely
- Include proper error handling and logging
- Test automation scripts in staging before production
- Use version control for all automation scripts

### Content Management

- Use templates for consistent document structure
- Maintain a style guide for documentation
- Include metadata (last updated, owner, review date)
- Regular backup of documentation to multiple locations

### Team Processes

- Assign documentation owners for each major section
- Schedule regular review cycles
- Provide training on documentation standards
- Encourage contributions from all team members

---

**Last Updated**: 2024-09-05
**Automation Owner**: DevOps Team
**Next Review**: 2024-12-05
