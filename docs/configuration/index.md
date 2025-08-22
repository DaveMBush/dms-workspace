# Configuration Documentation

This directory contains configuration guides and documentation for the RMS workspace.

## Available Guides

- [Feature Flags](./feature-flags.md) - Feature flag configuration and management
- [Environment Setup](./environment-setup.md) - Environment configuration and setup

## Quick Start

1. **Feature Flags**: See [Feature Flags Guide](./feature-flags.md) for configuring the `USE_SCREENER_FOR_UNIVERSE` flag
2. **Environment Variables**: Configure your local development environment with a `.env` file
3. **Server Configuration**: Understand how the server reads and validates configuration

## Environment Variables Reference

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `USE_SCREENER_FOR_UNIVERSE` | `false` | Enable screener-driven universe sync | No |
| `DATABASE_URL` | `file:./database.db` | Database connection string | Yes |
| `HOST` | `localhost` | Server host binding | No |
| `PORT` | `3000` | Server port | No |

## Configuration by Environment

- **Local Development**: Use `.env` file for easy configuration
- **Development/Staging**: Set environment variables in deployment configuration
- **Production**: Use environment variables with proper rollback procedures

## Need Help?

- Check the [Troubleshooting](./feature-flags.md#troubleshooting) section
- Review the [Architecture Documentation](../architecture/index.md)
- Consult the [Rollback Runbook](../rollback-runbook.md) for emergency procedures



