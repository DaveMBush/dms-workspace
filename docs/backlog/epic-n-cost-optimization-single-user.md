# Epic N: Cost Optimization for Single-User Deployment

Goal: Optimize the AWS deployment architecture to minimize costs for single-user access while maintaining functionality and reliability.

## Context

The current infrastructure was designed for a multi-user, production-scale deployment. For a single-user scenario, several components are over-provisioned and unnecessarily expensive:

**Current High-Cost Components:**

- **NAT Gateways**: 2x NAT Gateways across AZs = ~$65/month each = $130/month
- **Multi-AZ ECS Deployment**: Running in 2 AZs for high availability
- **RDS Multi-AZ**: Planned PostgreSQL with multi-AZ redundancy
- **Load Balancer**: ALB for single backend instance = ~$16-25/month
- **CloudWatch Logs**: Multiple log groups with long retention

**Estimated Monthly Savings Potential: $100-150/month**

## Target Single-User Architecture

**Optimized Architecture:**

- **No NAT Gateway**: Use ECS with public subnets and security groups
- **Single AZ Deployment**: Deploy everything in one AZ (us-east-1a)
- **Serverless Database**: Use RDS Serverless v2 or Aurora Serverless
- **Alternative to ALB**: Use CloudFront → ECS directly or API Gateway
- **Minimal Logging**: Reduce log retention and consolidate log groups
- **Spot Instances**: Use Fargate Spot for 70% cost reduction

## Story N1: Eliminate NAT Gateway Dependency

Description: Modify ECS deployment to use public subnets with proper security groups, eliminating the need for NAT Gateways.

Acceptance Criteria:

- Deploy ECS tasks in public subnets with `assign_public_ip = true`
- Configure security groups to restrict inbound traffic to ALB only
- Ensure outbound internet access for container image pulls and API calls
- Remove NAT Gateway and associated EIP resources from Terraform
- Update route tables to use Internet Gateway directly
- **Cost Savings: ~$90-100/month**

Dependencies: None

## Story N2: Single AZ Deployment Configuration

Description: Modify infrastructure to deploy in single AZ to reduce redundancy costs while maintaining basic functionality.

Acceptance Criteria:

- Configure VPC with subnets in single AZ (us-east-1a only)
- Update ECS service to run in single AZ
- Modify RDS to single AZ deployment (no Multi-AZ)
- Update load balancer to single AZ configuration
- Ensure backup and recovery procedures for single AZ risks
- **Cost Savings: ~$20-30/month**

Dependencies: Story N1

## Story N3: Implement Serverless Database Solution

Description: Replace planned RDS PostgreSQL with Aurora Serverless v2 or RDS Serverless for automatic scaling based on usage.

Acceptance Criteria:

- Configure Aurora Serverless v2 cluster with auto-pause capability
- Set minimum capacity to 0.5 ACU (Aurora Capacity Units)
- Configure auto-pause after 5 minutes of inactivity for single-user scenario
- Update connection pooling to handle serverless cold starts
- Migrate data from SQLite to serverless PostgreSQL
- **Cost Savings: ~$50-80/month compared to standard RDS**

Dependencies: Stories N1, N2

## Story N4: Replace ALB with CloudFront Direct Integration

Description: Eliminate ALB costs by routing CloudFront directly to ECS public IP or using API Gateway.

Acceptance Criteria:

- Configure CloudFront to route API calls directly to ECS public endpoint
- Implement service discovery to update CloudFront origins when ECS IP changes
- Add Lambda@Edge function for intelligent routing if needed
- Maintain HTTPS termination and security headers via CloudFront
- Remove ALB, target groups, and associated resources
- **Cost Savings: ~$16-25/month**

Dependencies: Stories N1, N2

## Story N5: Implement Fargate Spot for Additional Savings

Description: Use Fargate Spot pricing for ECS tasks to achieve 70% cost reduction on compute.

Acceptance Criteria:

- Configure ECS service to use Fargate Spot capacity provider
- Implement graceful handling of spot interruptions
- Add ECS task restart automation for spot interruptions
- Monitor spot availability and pricing in us-east-1a
- Configure mixed capacity strategy (50% spot, 50% on-demand) for reliability
- **Cost Savings: ~50-70% on ECS compute costs**

Dependencies: Stories N1, N2

## Story N6: Optimize CloudWatch Logs and Monitoring

Description: Reduce logging costs by optimizing log retention, consolidating log groups, and implementing cost-effective monitoring.

Acceptance Criteria:

- Reduce log retention to 7 days for application logs, 30 days for security logs
- Consolidate multiple log groups into fewer groups with structured logging
- Use CloudWatch Logs Insights instead of creating custom dashboards
- Implement basic CloudWatch alarms only for critical metrics
- Use AWS Free Tier monitoring limits effectively
- **Cost Savings: ~$10-20/month**

Dependencies: All previous stories

## Story N7: Development vs Production Environment Strategy

Description: Create a minimal development environment and optimize production for single-user access.

Acceptance Criteria:

- Configure development environment with even more aggressive cost optimization
- Use development environment for testing cost optimizations
- Implement infrastructure cost monitoring and alerting
- Document cost optimization decisions and trade-offs
- Create runbook for scaling up infrastructure if user base grows
- **Cost Savings: ~$30-50/month for dev environment**

Dependencies: Stories N1-N6

## Technical Notes

**Infrastructure Changes Required:**

```
Before (Multi-User Architecture):
├── VPC with 2 AZs
├── 2x NAT Gateways (~$90/month)
├── ALB (~$20/month)
├── RDS Multi-AZ (~$100/month)
├── ECS Fargate On-Demand (~$30/month)
└── Total: ~$240/month

After (Single-User Optimized):
├── VPC with 1 AZ
├── No NAT Gateway ($0)
├── CloudFront → ECS Direct (~$1/month)
├── Aurora Serverless v2 (~$20/month)
├── ECS Fargate Spot (~$10/month)
└── Total: ~$31/month + data transfer
```

**Risk Mitigation:**

- Single AZ deployment reduces availability but acceptable for single user
- Spot instances may be interrupted but can restart automatically
- No NAT Gateway requires careful security group configuration
- Serverless database has cold start latency but acceptable for single user

**Scaling Strategy:**

- Document configuration changes needed to scale back to multi-user
- Implement infrastructure versioning for easy rollback
- Monitor usage patterns to determine when scaling is needed

**Cost Monitoring:**

- Set up AWS Budget alerts for monthly spending limits
- Implement cost anomaly detection
- Regular monthly cost reviews with optimization recommendations

## Cost Summary

**Total Estimated Monthly Savings: $150-200/month**
**Final Estimated Monthly Cost: $30-50/month** (vs current $200-250/month)

**Break-even Analysis:**

- NAT Gateway elimination: Immediate $90/month savings
- Single AZ deployment: $20-30/month savings
- Serverless database: $50-80/month savings
- ALB elimination: $16-25/month savings
- Fargate Spot: 50-70% of compute costs
