# Story AA.1: Generate New Angular Application dms-material

## Story

**As a** developer migrating from PrimeNG to Angular Material
**I want** a new Angular application scaffolded with proper Nx configuration
**So that** I have a clean foundation for building the Material-based frontend

## Context

**Current System:**

- Location: `apps/dms/` - Existing PrimeNG-based application
- Technology: Angular 20, PrimeNG 20, TailwindCSS, SmartNgRX Signals
- Port: 4200 for development server

**New Application:**

- Location: `apps/dms-material/` - New Material-based application
- Technology: Angular 20, Angular Material, TailwindCSS, SmartNgRX Signals
- Port: 4201 for development server

## Acceptance Criteria

### Functional Requirements

- [ ] New Angular application generated at `apps/dms-material/`
- [ ] Application uses `dms` prefix for component selectors
- [ ] SCSS configured as stylesheet format
- [ ] Routing enabled
- [ ] Application serves on port 4201

### Technical Requirements

- [ ] `project.json` configured with proper Nx targets:
  - `build` - Production and development configurations
  - `serve` - Development server on port 4201
  - `test` - Vitest configuration
  - `lint` - ESLint configuration
- [ ] `tsconfig.app.json` configured properly
- [ ] `tsconfig.spec.json` configured for testing
- [ ] Proxy configuration created for API calls to backend

### Configuration Requirements

- [ ] Development server configuration:
  ```json
  {
    "serve": {
      "options": {
        "port": 4201,
        "proxyConfig": "apps/dms-material/proxy.conf.json"
      }
    }
  }
  ```
- [ ] Proxy configuration mirrors existing DMS proxy:
  ```json
  {
    "/api": {
      "target": "http://localhost:3000",
      "secure": false
    }
  }
  ```

### Validation Requirements

- [ ] `pnpm nx run dms-material:serve` starts without errors
- [ ] `pnpm nx run dms-material:build` completes successfully
- [ ] `pnpm nx run dms-material:lint` passes
- [ ] Application accessible at `http://localhost:4201`

## Technical Approach

### Step 1: Generate Application

```bash
nx g @nx/angular:application dms-material \
  --directory=apps/dms-material \
  --style=scss \
  --routing=true \
  --prefix=dms \
  --standalone
```

### Step 2: Update project.json

Modify `apps/dms-material/project.json` to configure port 4201:

```json
{
  "name": "dms-material",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "projectType": "application",
  "prefix": "dms",
  "sourceRoot": "apps/dms-material/src",
  "tags": [],
  "targets": {
    "build": {
      "executor": "@angular/build:application",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/apps/dms-material",
        "browser": "apps/dms-material/src/main.ts",
        "polyfills": [],
        "tsConfig": "apps/dms-material/tsconfig.app.json",
        "inlineStyleLanguage": "scss",
        "assets": [
          {
            "glob": "**/*",
            "input": "apps/dms-material/public"
          }
        ],
        "styles": ["apps/dms-material/src/styles.scss"]
      },
      "configurations": {
        "production": {
          "budgets": [
            {
              "type": "initial",
              "maximumWarning": "2mb",
              "maximumError": "5mb"
            },
            {
              "type": "anyComponentStyle",
              "maximumWarning": "4kb",
              "maximumError": "8kb"
            }
          ],
          "outputHashing": "all",
          "sourceMap": false,
          "namedChunks": false,
          "extractLicenses": true,
          "optimization": true,
          "fileReplacements": [
            {
              "replace": "apps/dms-material/src/environments/environment.ts",
              "with": "apps/dms-material/src/environments/environment.prod.ts"
            }
          ]
        },
        "development": {
          "optimization": false,
          "extractLicenses": false,
          "sourceMap": true
        }
      },
      "defaultConfiguration": "production"
    },
    "serve": {
      "continuous": true,
      "executor": "@angular/build:dev-server",
      "configurations": {
        "production": {
          "buildTarget": "dms-material:build:production"
        },
        "development": {
          "buildTarget": "dms-material:build:development"
        }
      },
      "defaultConfiguration": "development",
      "options": {
        "port": 4201,
        "proxyConfig": "apps/dms-material/proxy.conf.json"
      }
    },
    "extract-i18n": {
      "executor": "@angular/build:extract-i18n",
      "options": {
        "buildTarget": "dms-material:build"
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint"
    },
    "test": {
      "executor": "@nx/vite:test",
      "outputs": ["{options.reportsDirectory}"],
      "options": {
        "reportsDirectory": "../../coverage/apps/dms-material",
        "passWithNoTests": true
      }
    },
    "serve-static": {
      "continuous": true,
      "executor": "@nx/web:file-server",
      "options": {
        "buildTarget": "dms-material:build",
        "port": 4201,
        "staticFilePath": "dist/apps/dms-material/browser",
        "spa": true
      }
    }
  }
}
```

### Step 3: Create Proxy Configuration

Create `apps/dms-material/proxy.conf.json`:

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false
  }
}
```

### Step 4: Create Public Directory

Create `apps/dms-material/public/.gitkeep` for static assets.

### Step 5: Verify Generation

Run the following commands to verify:

```bash
# Serve the application
pnpm nx run dms-material:serve

# Build the application
pnpm nx run dms-material:build

# Lint the application
pnpm nx run dms-material:lint
```

## Files Created

| File                                         | Purpose                               |
| -------------------------------------------- | ------------------------------------- |
| `apps/dms-material/project.json`             | Nx project configuration              |
| `apps/dms-material/tsconfig.json`            | Base TypeScript configuration         |
| `apps/dms-material/tsconfig.app.json`        | App-specific TypeScript configuration |
| `apps/dms-material/tsconfig.spec.json`       | Test TypeScript configuration         |
| `apps/dms-material/proxy.conf.json`          | API proxy configuration               |
| `apps/dms-material/src/main.ts`              | Application entry point               |
| `apps/dms-material/src/index.html`           | HTML template                         |
| `apps/dms-material/src/styles.scss`          | Global styles (placeholder)           |
| `apps/dms-material/src/app/app.component.ts` | Root component                        |
| `apps/dms-material/src/app/app.config.ts`    | App configuration                     |
| `apps/dms-material/src/app/app.routes.ts`    | Routing configuration                 |
| `apps/dms-material/public/.gitkeep`          | Static assets directory               |

## Definition of Done

- [ ] Application generated with all required files
- [ ] project.json configured with port 4201
- [ ] Proxy configuration created
- [ ] Application serves without errors
- [ ] Application builds without errors
- [ ] Lint passes
- [ ] Application accessible at http://localhost:4201

## Notes

- This is the first story in the migration - all other stories depend on this
- The generated application will be minimal; subsequent stories add Material, theming, and infrastructure
- Keep the existing DMS application unchanged and functional
