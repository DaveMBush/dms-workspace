# RMS Workspace

Risk Management System (RMS) - A comprehensive portfolio management application built with Angular and Node.js.

## Overview

RMS Workspace is a financial portfolio management system that helps users track and manage their investment portfolios with real-time data synchronization, universe management, and comprehensive reporting capabilities.

## Features

- **Portfolio Management**: Track and manage investment portfolios across multiple accounts
- **Universe Management**: Maintain and synchronize investment universe data with real-time screener integration
- **Risk Group Analysis**: Categorize investments by risk groups (Equities, Income, Tax Free Income)
- **Real-time Sync**: Automatic synchronization with external data sources
- **Interactive UI**: Modern Angular-based interface with icon-driven operations

## Architecture

This is an Nx monorepo containing:

- **Frontend (`apps/rms`)**: Angular 20 application with PrimeNG components
- **Backend (`apps/server`)**: Node.js/Fastify API server
- **Shared Libraries**: Common utilities and type definitions

## Quick Start

### Prerequisites
- Node.js (LTS version)
- pnpm package manager

### Development Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd rms-workspace
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Set up environment**:
   ```bash
   # Create .env file in root directory
   echo "DATABASE_URL=file:./database.db" > .env
   ```

4. **Start development servers**:
   ```bash
   # Start both frontend and backend
   pnpm nx run-many --target=serve --all

   # Or start individually
   pnpm nx serve rms      # Frontend (http://localhost:4200)
   pnpm nx serve server   # Backend (http://localhost:3000)
   ```

## Available Commands

### Development
- `pnpm nx serve rms` - Start frontend development server
- `pnpm nx serve server` - Start backend development server
- `pnpm nx run-many --target=serve --all` - Start all services

### Building
- `pnpm nx build rms` - Build frontend for production
- `pnpm nx build server` - Build backend for production
- `pnpm nx run-many --target=build --all` - Build all projects

### Testing
- `pnpm nx test rms` - Run frontend tests
- `pnpm nx test server` - Run backend tests
- `pnpm nx run-many --target=test --all` - Run all tests

### Code Quality
- `pnpm nx lint rms` - Lint frontend code
- `pnpm nx lint server` - Lint backend code
- `pnpm nx run-many --target=lint --all` - Lint all projects

## Key Features

### Universe Management
The Universe screen provides direct access to portfolio universe management through icon-based controls:

- **Update Fields** (`pi-refresh` icon): Refresh individual universe fields
- **Update Universe** (`pi-sync` icon): Perform full universe synchronization with screener data

### Portfolio Tracking
- **Accounts**: Manage multiple investment accounts
- **Positions**: Track open and sold positions
- **Risk Groups**: Categorize investments by risk profile

### Data Synchronization
- **Always-On Sync**: Universe synchronization is always enabled (no configuration required)
- **Real-time Updates**: Automatic data refresh from external screener services
- **Background Processing**: Non-blocking operations with progress indicators

## Technology Stack

### Frontend
- **Angular 20**: Latest Angular framework with signals
- **PrimeNG 20**: UI component library
- **TailwindCSS**: Utility-first CSS framework
- **TypeScript**: Type-safe development

### Backend
- **Node.js**: JavaScript runtime
- **Fastify**: Fast and efficient web framework
- **Prisma**: Database ORM
- **SQLite**: Local development database

### Development Tools
- **Nx 21.2.0**: Monorepo management and build system
- **pnpm**: Fast, disk space efficient package manager
- **Vitest**: Unit testing framework
- **ESLint**: Code linting
- **Prettier**: Code formatting

## Project Structure

```
rms-workspace/
├── apps/
│   ├── rms/           # Angular frontend application
│   └── server/        # Node.js backend application
├── docs/              # Project documentation
├── libs/              # Shared libraries (if any)
└── tools/             # Build and development tools
```

## Documentation

- [Architecture Overview](./docs/architecture.md)
- [Feature Configuration](./docs/configuration/feature-flags.md)
- [User Experience Guide](./docs/user-experience/universe-update-journeys.md)
- [Development Guidelines](./CLAUDE.md)

## Contributing

1. Create a feature branch from `main`
2. Make your changes following the coding standards in `CLAUDE.md`
3. Run tests and linting: `pnpm nx run-many --target=test,lint --all`
4. Create a pull request with a clear description

## License

[Add your license information here]
