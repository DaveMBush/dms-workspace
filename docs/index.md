# RMS Workspace Documentation

Welcome to the RMS workspace documentation. This documentation covers the architecture, configuration, and operational procedures for the RMS system.

## 📚 Documentation Sections

### 🏗️ Architecture
- [Architecture Overview](./architecture.md) - High-level system architecture
- [Frontend Architecture](./frontend-architecture.md) - Frontend system design
- [Frontend Specifications](./front-end-spec.md) - UI/UX specifications

### ⚙️ Configuration
- [Configuration Guide](./configuration/index.md) - System configuration and setup
- [Feature Flags](./configuration/feature-flags.md) - Feature flag management
- [Environment Setup](./configuration/environment-setup.md) - Environment configuration

### 🚀 Operations
- [Rollback Runbook](./rollback-runbook.md) - Emergency rollback procedures
- [Logging and Metrics](./logging-metrics-extraction.md) - System monitoring and logging
- [Documentation Sync Process](./documentation-sync-process.md) - Keeping architecture and backlog synchronized

### 📋 Product & Planning
- [Product Requirements](./prd.md) - Product requirements document
- [Backlog](./backlog.md) - Development backlog and roadmap

## 🚀 Quick Start

1. **Setup**: See [Environment Setup](./configuration/environment-setup.md) for local development
2. **Configuration**: Configure feature flags via [Feature Flags Guide](./configuration/feature-flags.md)
3. **Development**: Use the [Architecture Overview](./architecture.md) to understand the system
4. **Operations**: Refer to [Rollback Runbook](./rollback-runbook.md) for emergency procedures

## 🔧 Key Features

- **Feature Flags**: Dynamic feature toggling via environment variables
- **Universe Management**: Manual and screener-driven universe synchronization
- **Risk Management**: Comprehensive rollback and monitoring procedures
- **Multi-Environment**: Support for local, development, staging, and production

## 📖 Feature Flag System

The RMS workspace uses a feature flag system to control the rollout of new features:

- **`USE_SCREENER_FOR_UNIVERSE`**: Controls screener-driven universe synchronization
- **Default Behavior**: Manual universe management (flag = `false`)
- **Safe Toggling**: Feature can be enabled/disabled without data loss
- **Environment Support**: Works across local, development, staging, and production

For detailed configuration, see the [Feature Flags Guide](./configuration/feature-flags.md).

## 🆘 Need Help?

- **Configuration Issues**: Check [Troubleshooting](./configuration/feature-flags.md#troubleshooting)
- **Architecture Questions**: Review [Architecture Documentation](./architecture.md)
- **Emergency Procedures**: Consult [Rollback Runbook](./rollback-runbook.md)
- **Development Setup**: See [Environment Setup](./configuration/environment-setup.md)

## 🔄 Recent Updates

- **Story F2**: Documentation synchronization process implemented
- **Story B1**: Feature flag configuration and documentation completed
- **Epic A**: Universe sync from screener feature implemented
- **Feature Flags**: Comprehensive configuration and operational guides added



