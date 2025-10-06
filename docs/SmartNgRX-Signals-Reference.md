# SmartNgRX Signals Reference Guide

*Complete API reference and implementation patterns for @smarttools/smart-signals*

## Table of Contents
1. [Core Concepts](#core-concepts)
2. [Installation & Setup](#installation--setup)
3. [Entity Definitions](#entity-definitions)
4. [Effects Services](#effects-services)
5. [Smart Signals](#smart-signals)
6. [Global Registration](#global-registration)
7. [Component Integration](#component-integration)
8. [Demo App Patterns](#demo-app-patterns)
9. [Quick Reference](#quick-reference)

## Core Concepts

SmartNgRX Signals is built on NgRX SignalStore and provides:

- **Normalized State Management**: Efficient data handling with quick lookups
- **Selective Data Loading**: Only loads data when needed or requested
- **Intelligent Data Refreshing**: Automatic data updates via expiration and WebSocket events
- **Performance Optimization**: Virtual scrolling, @Defer() decorators, minimal data loading

### Key Principles
- Structure data to minimize unnecessary loading
- Use virtual scrolling for large datasets
- Only load data when absolutely necessary
- Consider splitting complex entities into related tables

## Installation & Setup

```bash
npm install @smarttools/smart-signals
```

## Entity Definitions

Entity definitions configure how entities are managed in the SmartNgRX Signal Store.

### API Structure
```typescript
interface SmartEntityDefinition<T> {
  entityName: string;                    // Feature name for reducers and actions
  effectServiceToken: InjectionToken<EffectService<T>>;
  defaultRow: (id: string) => T;         // Function returning default row
  selectId?: (entity: T) => string;      // Optional ID selector
  markAndDelete?: MarkAndDeleteConfig;   // Optional mark/delete configuration
  isInitialRow?: boolean;                // Indicates top-level rows for initial data
}
```

### Implementation Example
```typescript
// user.definition.ts
export const usersDefinition: SmartEntityDefinition<User> = {
  entityName: 'users',
  effectServiceToken: userEffectsServiceToken,
  defaultRow: (id) => ({
    id,
    name: '',
    children: [],
  }),
};
```

### Best Practices
- Create entity definitions in separate files
- Import and register using `provideSmartFeatureSignalEntities`
- Use descriptive entity names that match your domain

## Effects Services

Effects Services handle CRUD operations against the server.

### API Structure
```typescript
abstract class EffectService<T> {
  abstract loadByIds(ids: string[]): Observable<T[]>;
  abstract update(newRow: T): Observable<T[]>;
  // Additional methods as needed
}
```

### Implementation Example
```typescript
@Injectable()
export class UserEffectsService extends EffectService<User> {
  constructor(private http: HttpClient) {
    super();
  }

  override loadByIds = (ids: string[]): Observable<User[]> => {
    return this.http.get<User[]>(`/api/users?ids=${ids.join(',')}`);
  };

  override update(newRow: User): Observable<User[]> {
    return this.http.put<User[]>(`/api/users/${newRow.id}`, newRow);
  }
}
```

### Service Registration
```typescript
// Create injection token
export const userEffectsServiceToken = new InjectionToken<UserEffectsService>('UserEffectsService');

// Register in providers
providers: [
  { provide: userEffectsServiceToken, useClass: UserEffectsService }
]
```

## Smart Signals

Smart Signals create selectors for retrieving child entities from parent entities.

### API Structure
```typescript
// Basic signal creation
const rawSignal = createSmartSignal('feature', 'entity');

// Complex signal with child relationships
const selectUserChildren = createSmartSignal(selectUser, [
  {
    childFeature: 'shared',
    childEntity: 'roles',
    parentField: 'roles',
    parentFeature: 'shared',
    parentEntity: 'users',
    childSelector: selectRoles,
  },
]);
```

### Important Rules
1. All signals used in a SmartSignal must be SmartSignals
2. Signals need to be "chained" - child selectors must point to smart signals
3. Complex nested relationships require proper signal chaining

### Usage in Components
```typescript
export class UserComponent {
  users = selectUsers();
  userChildren = selectUserChildren();

  constructor() {
    // Signals are automatically reactive
    effect(() => {
      console.log('Users updated:', this.users());
    });
  }
}
```

## Global Registration

Set up SmartNgRX in your application configuration.

### Basic Setup
```typescript
// app.config.ts
import { provideSmartNgRX } from '@smarttools/smart-signals';

export const appConfig: ApplicationConfig = {
  providers: [
    provideSmartNgRX({}), // Empty config for basic setup
    // ... other providers
  ],
};
```

### With Mark and Delete Configuration
```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideSmartNgRX({
      // MarkAndDeleteInit configuration
      markAndDeleteInit: {
        // Configuration options
      }
    }),
    // ... other providers
  ],
};
```

### Entity Registration
```typescript
// Register entities at the feature level
providers: [
  provideSmartFeatureSignalEntities([
    usersDefinition,
    departmentsDefinition,
    // ... other entity definitions
  ])
]
```

## Component Integration

### Injecting and Using Signals
```typescript
@Component({
  selector: 'app-user-list',
  template: `
    <div *ngFor="let user of users()">
      {{ user.name }}
    </div>
  `
})
export class UserListComponent {
  users = inject(selectUsers);
  selectedUser = signal<User | null>(null);

  constructor() {
    // React to signal changes
    effect(() => {
      const currentUsers = this.users();
      console.log('Users updated:', currentUsers);
    });
  }

  selectUser(user: User) {
    this.selectedUser.set(user);
  }
}
```

### CRUD Operations
```typescript
export class UserManagementComponent {
  users = inject(selectUsers);
  userEffects = inject(userEffectsServiceToken);

  async addUser(userData: Partial<User>) {
    const newUser = { id: crypto.randomUUID(), ...userData };
    await this.userEffects.update(newUser).toPromise();
  }

  async updateUser(user: User) {
    await this.userEffects.update(user).toPromise();
  }
}
```

## Demo App Patterns

Based on the demo app at `/apps/demo-ngrx-signals`:

### App Configuration Pattern
```typescript
// From demo app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideSmartNgRX({}),
    // Multiple effects services registration
    { provide: topEffectsServiceToken, useClass: TopEffectsService },
    { provide: departmentEffectsServiceToken, useClass: DepartmentEffectsService },
    { provide: departmentChildEffectsServiceToken, useClass: DepartmentChildEffectsService },
    { provide: locationEffectsServiceToken, useClass: LocationEffectsService },
    // ... other providers
  ],
};
```

### Shared Directory Structure
```
shared/
├── entities/           # Entity definitions
├── departments/        # Department-specific code
├── locations/          # Location-specific code
├── components/         # Shared components
├── functions/          # Utility functions
└── socket.service.ts   # WebSocket integration
```

## Quick Reference

### Common Tasks

#### 1. Create a New Entity
```typescript
// 1. Define the entity interface
interface MyEntity {
  id: string;
  name: string;
}

// 2. Create injection token
export const myEntityEffectsServiceToken = new InjectionToken<MyEntityEffectsService>('MyEntityEffectsService');

// 3. Create effects service
@Injectable()
export class MyEntityEffectsService extends EffectService<MyEntity> {
  // Implementation
}

// 4. Create entity definition
export const myEntityDefinition: SmartEntityDefinition<MyEntity> = {
  entityName: 'myEntities',
  effectServiceToken: myEntityEffectsServiceToken,
  defaultRow: (id) => ({ id, name: '' }),
};

// 5. Register in providers
{ provide: myEntityEffectsServiceToken, useClass: MyEntityEffectsService }
```

#### 2. Create a Selector
```typescript
// Basic selector
const selectMyEntities = createSmartSignal('feature', 'myEntities');

// Selector with children
const selectMyEntitiesWithChildren = createSmartSignal(selectMyEntities, [
  {
    childFeature: 'feature',
    childEntity: 'childEntities',
    parentField: 'children',
    parentFeature: 'feature',
    parentEntity: 'myEntities',
    childSelector: selectChildEntities,
  },
]);
```

#### 3. Use in Components
```typescript
@Component({
  template: `
    <div *ngFor="let item of items()">
      {{ item.name }}
    </div>
  `
})
export class MyComponent {
  items = inject(selectMyEntities);
}
```

### Key APIs Summary

| Function | Purpose | Usage |
|----------|---------|-------|
| `provideSmartNgRX()` | Global setup | App configuration |
| `createSmartSignal()` | Create selectors | Signal creation |
| `EffectService<T>` | Base effects class | Service inheritance |
| `SmartEntityDefinition<T>` | Entity configuration | Entity setup |
| `provideSmartFeatureSignalEntities()` | Register entities | Feature providers |

### Common Patterns

- **Entity**: Interface → Effects Service → Entity Definition → Registration
- **Selector**: Basic signal → Add children → Chain relationships
- **Component**: Inject signals → Use in template → React with effects
- **CRUD**: Inject effects service → Call methods → Handle observables

---

*This reference guide should be consulted whenever implementing SmartNgRX Signals functionality. Always prefer the Signals version over classic NgRX patterns.*