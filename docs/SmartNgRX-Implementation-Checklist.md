# SmartNgRX Signals Implementation Checklist

*Step-by-step checklist for implementing SmartNgRX Signals in any project*

## Pre-Implementation Checklist

- [ ] Verify `@smarttools/smart-signals` is installed
- [ ] Confirm existing Angular app is using standalone components and signals
- [ ] Review entity relationships and data structure
- [ ] Plan normalized state structure

## 1. Global Setup

### App Configuration
- [ ] Add `provideSmartNgRX({})` to app.config.ts providers
- [ ] Set up any global mark and delete configuration if needed
- [ ] Verify NgRX Store DevTools are configured (optional but recommended)

```typescript
// app.config.ts
providers: [
  provideSmartNgRX({}),
  // ... other providers
]
```

## 2. For Each Entity

### Step 1: Define Entity Interface
- [ ] Create TypeScript interface for the entity
- [ ] Include `id: string` field
- [ ] Define all required properties
- [ ] Consider relationships to other entities

```typescript
interface MyEntity {
  id: string;
  name: string;
  // ... other properties
}
```

### Step 2: Create Effects Service
- [ ] Create injection token for the effects service
- [ ] Implement effects service extending `EffectService<T>`
- [ ] Implement required methods: `loadByIds`, `update`
- [ ] Add any additional CRUD methods needed
- [ ] Register service in providers

```typescript
// 1. Injection token
export const myEntityEffectsServiceToken = new InjectionToken<MyEntityEffectsService>('MyEntityEffectsService');

// 2. Service implementation
@Injectable()
export class MyEntityEffectsService extends EffectService<MyEntity> {
  override loadByIds = (ids: string[]): Observable<MyEntity[]> => { /* implementation */ };
  override update(newRow: MyEntity): Observable<MyEntity[]> { /* implementation */ }
}

// 3. Registration
{ provide: myEntityEffectsServiceToken, useClass: MyEntityEffectsService }
```

### Step 3: Create Entity Definition
- [ ] Create entity definition object
- [ ] Set `entityName` (should match feature name)
- [ ] Assign `effectServiceToken`
- [ ] Implement `defaultRow` function
- [ ] Add optional configurations if needed

```typescript
export const myEntityDefinition: SmartEntityDefinition<MyEntity> = {
  entityName: 'myEntities',
  effectServiceToken: myEntityEffectsServiceToken,
  defaultRow: (id) => ({ id, name: '' }),
};
```

### Step 4: Register Entity
- [ ] Add entity definition to feature registration
- [ ] Use `provideSmartFeatureSignalEntities` in appropriate module/config

```typescript
providers: [
  provideSmartFeatureSignalEntities([myEntityDefinition])
]
```

## 3. Create Selectors

### Basic Selectors
- [ ] Create basic selector using `createSmartSignal`
- [ ] Use correct feature and entity names
- [ ] Test selector in a component

```typescript
const selectMyEntities = createSmartSignal('feature', 'myEntities');
```

### Child Relationship Selectors
- [ ] Identify parent-child relationships
- [ ] Create child selectors first (bottom-up approach)
- [ ] Chain selectors properly
- [ ] Ensure all signals in chain are Smart Signals

```typescript
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

## 4. Component Integration

### Basic Component Setup
- [ ] Inject selectors using `inject()`
- [ ] Use signals directly in templates
- [ ] Add effect() for reactive logic if needed
- [ ] Test signal reactivity

```typescript
@Component({
  template: `<div *ngFor="let item of items()">{{ item.name }}</div>`
})
export class MyComponent {
  items = inject(selectMyEntities);
}
```

### CRUD Operations
- [ ] Inject effects service for write operations
- [ ] Implement create, update, delete methods
- [ ] Handle loading states and errors
- [ ] Test all CRUD operations

```typescript
export class MyComponent {
  items = inject(selectMyEntities);
  effects = inject(myEntityEffectsServiceToken);

  async createItem(data: Partial<MyEntity>) {
    // Implementation
  }
}
```

## 5. Testing Checklist

### Unit Tests
- [ ] Test effects service methods
- [ ] Test entity definition configuration
- [ ] Test selector functions
- [ ] Test component logic

### Integration Tests
- [ ] Test complete CRUD workflows
- [ ] Test parent-child relationship loading
- [ ] Test signal chaining
- [ ] Test error handling

### Manual Testing
- [ ] Verify data loads correctly
- [ ] Confirm UI updates reactively
- [ ] Test all user interactions
- [ ] Check for memory leaks

## 6. Performance Verification

### Optimization Checks
- [ ] Verify only necessary data is loaded
- [ ] Check for unnecessary re-renders
- [ ] Implement virtual scrolling for large lists if needed
- [ ] Use @Defer() decorator where appropriate

### Monitoring
- [ ] Use NgRX DevTools to monitor state changes
- [ ] Check network requests are optimized
- [ ] Verify cache behavior
- [ ] Monitor memory usage

## 7. Common Pitfalls to Avoid

- [ ] **All signals must be Smart Signals** - Don't mix with regular signals
- [ ] **Proper signal chaining** - Child selectors must reference Smart Signals
- [ ] **Correct entity names** - Must match between definition and selectors
- [ ] **Effect service registration** - Ensure injection tokens are properly provided
- [ ] **Normalized state structure** - Plan relationships carefully
- [ ] **Loading states** - Handle loading and error states in UI

## 8. Documentation

- [ ] Document entity relationships
- [ ] Add inline comments for complex selectors
- [ ] Update architecture documentation
- [ ] Create usage examples for team members

## Final Verification

- [ ] All entities are properly registered
- [ ] All selectors work correctly
- [ ] CRUD operations function as expected
- [ ] Performance is acceptable
- [ ] Tests are passing
- [ ] Code follows project conventions
- [ ] Documentation is updated

---

**Note**: This checklist should be followed for each SmartNgRX Signals implementation. Always refer to the SmartNgRX-Signals-Reference.md for detailed API information and examples.