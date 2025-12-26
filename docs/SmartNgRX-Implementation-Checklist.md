# SmartNgRX Signals Implementation Checklist

_Step-by-step checklist for implementing SmartNgRX Signals in the RMS/RMS-MATERIAL applications_

## Pre-Implementation Checklist

- [ ] Verify `@smarttools/smart-signals` is installed
- [ ] Confirm existing Angular app is using standalone components and signals
- [ ] Review entity relationships and data structure
- [ ] Plan normalized state structure

## 1. Global Setup

### App Configuration

- [ ] Add `provideSmartNgRX()` (no configuration) to app.config.ts providers
- [ ] Register all effects services with their injection tokens in app.config.ts providers
- [ ] Verify NgRX Store DevTools are configured (optional but recommended)

```typescript
// app.config.ts
import { provideSmartNgRX } from '@smarttools/smart-signals';

providers: [
  provideSmartNgRX(), // No configuration object needed
  {
    provide: myEntityEffectsServiceToken,
    useClass: MyEntityEffectsService,
  },
  // ... other providers
];
```

## 2. For Each Entity

### Step 1: Define Entity Interface

- [ ] Create TypeScript interface for the entity
- [ ] Include `id: string` field (only required field)
- [ ] Define all other properties specific to your entity
- [ ] Include array fields for child relationships:
  - `string[]` for regular child ID arrays (all IDs loaded upfront)
  - `PartialArrayDefinition` for virtual arrays (IDs loaded lazily as needed)
- [ ] Field names for relationships can be anything - specified via `parentField` in selectors

```typescript
// my-entity.interface.ts
import { PartialArrayDefinition } from '@smarttools/smart-signals';

export interface MyEntity {
  id: string; // Required: unique identifier
  description: string; // Example: any property name your entity needs
  status: string; // Example: another custom property
  version: number; // Example: for optimistic concurrency
  relatedChildItems1: string[]; // Example: regular array - all IDs loaded upfront
  relatedChildItems2: PartialArrayDefinition; // Example: virtual array - IDs loaded lazily
}
```

### Step 2: Create Effects Service and Token

- [ ] Create a separate injection token file for the effects service
- [ ] Implement effects service extending `EffectService<T>`
- [ ] Inject HttpClient for API calls
- [ ] Implement required methods: `loadByIds`, `update`
- [ ] Add any additional CRUD methods needed (`add`, `delete`, `loadByIndexes`)
- [ ] Register service globally in app.config.ts providers

```typescript
// my-entity-effect-service-token.ts
import { InjectionToken } from '@angular/core';
import { MyEntityEffectsService } from './my-entity-effect.service';

export const myEntityEffectsServiceToken = new InjectionToken<MyEntityEffectsService>('MyEntityEffectsService');
```

```typescript
// my-entity-effect.service.ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EffectService, PartialArrayDefinition } from '@smarttools/smart-signals';
import { Observable } from 'rxjs';
import { MyEntity } from './my-entity.interface';

@Injectable()
export class MyEntityEffectsService extends EffectService<MyEntity> {
  apiMyEntity = './api/my-entities';
  private http = inject(HttpClient);

  override loadByIds(ids: string[]): Observable<MyEntity[]> {
    return this.http.post<MyEntity[]>(this.apiMyEntity, ids);
  }

  override update(newRow: MyEntity): Observable<MyEntity[]> {
    return this.http.put<MyEntity[]>(this.apiMyEntity, newRow);
  }

  override add(row: MyEntity): Observable<MyEntity[]> {
    return this.http.post<MyEntity[]>(this.apiMyEntity + '/add', row);
  }

  override delete(id: string): Observable<void> {
    return this.http.delete<undefined>(`${this.apiMyEntity}/${id}`);
  }

  override loadByIndexes(parentId: string, childField: string, startIndex: number, length: number): Observable<PartialArrayDefinition> {
    return this.http.post<PartialArrayDefinition>(`${this.apiMyEntity}/indexes`, { parentId, childField, startIndex, length });
  }
}
```

```typescript
// app.config.ts - Registration
{
  provide: myEntityEffectsServiceToken,
  useClass: MyEntityEffectsService,
}
```

### Step 3: Create Entity Definition

- [ ] Create entity definition const file
- [ ] Set `entityName` (plural form, matches selector usage)
- [ ] Assign `effectServiceToken`
- [ ] Implement `defaultRow` function with all required entity properties
- [ ] Include empty arrays for child relationships

```typescript
// my-entity-definition.const.ts
import { SmartEntityDefinition } from '@smarttools/smart-signals';
import { MyEntity } from './my-entity.interface';
import { myEntityEffectsServiceToken } from './my-entity-effect-service-token';

export const myEntityDefinition: SmartEntityDefinition<MyEntity> = {
  entityName: 'myEntities',
  effectServiceToken: myEntityEffectsServiceToken,
  defaultRow: function myEntityDefaultRowFunction(id) {
    return {
      id, // Required
      description: '', // Initialize all entity-specific fields
      status: 'active',
      version: 0,
      relatedChildItems1: [], // Empty array for regular child relationships
      relatedChildItems2: {
        // Empty PartialArrayDefinition for virtual arrays
        startIndex: 0,
        indexes: [],
        length: 0,
      },
    };
  },
};
```

### Step 4: Register Entity in Routes

- [ ] Add entity definition to appropriate route providers
- [ ] Use `provideSmartFeatureSignalEntities` with feature name and entity array
- [ ] Register at the parent route level where the entity will be used
- [ ] Multiple entities can be registered together in the same call

```typescript
// app.routes.ts
import { provideSmartFeatureSignalEntities } from '@smarttools/smart-signals';
import { myEntityDefinition } from './store/my-entity/my-entity-definition.const';

{
  path: 'my-route',
  loadComponent: () => import('./my-component').then(m => m.MyComponent),
  providers: [
    provideSmartFeatureSignalEntities('app', [myEntityDefinition]),
  ],
}

// Or register multiple entities at a parent route:
{
  path: '',
  loadComponent: () => import('./shell').then(m => m.ShellComponent),
  providers: [
    provideSmartFeatureSignalEntities('app', [
      entityDefinition1,
      entityDefinition2,
      entityDefinition3,
    ]),
  ],
  children: [ /* child routes */ ]
}
```

## 2a. Working with Virtual Arrays (Optional)

### What are Virtual Arrays?

Virtual Arrays (using `PartialArrayDefinition`) allow you to work with large collections of child entities without loading all their IDs upfront. Instead of returning a full array of child IDs, you return a `PartialArrayDefinition` that includes:

- `startIndex`: The starting position in the virtual array
- `indexes`: An array of IDs for a specific chunk
- `length`: The total number of items that will eventually be in the array

### When to Use Virtual Arrays

- [ ] Entity has a large number of children (hundreds or thousands)
- [ ] Loading all child IDs at once would be expensive
- [ ] You're using virtual scrolling or pagination in the UI
- [ ] Children are loaded incrementally as the user scrolls

### Implementation Steps

#### 1. Define Interface with PartialArrayDefinition

```typescript
// my-entity.interface.ts
import { PartialArrayDefinition } from '@smarttools/smart-signals';

export interface MyEntity {
  id: string;
  description: string;
  // Use PartialArrayDefinition instead of string[] for large child collections
  childItems: PartialArrayDefinition;
}
```

#### 2. Return PartialArrayDefinition from loadByIds

In your effects service, when loading the parent entity, return a `PartialArrayDefinition` for the child field instead of a full array of IDs:

```typescript
// my-entity-effect.service.ts
override loadByIds(ids: string[]): Observable<MyEntity[]> {
  return this.http.post<MyEntity[]>(this.apiMyEntity, ids).pipe(
    map(entities => entities.map(entity => ({
      ...entity,
      // Server returns PartialArrayDefinition with initial chunk of IDs
      childItems: entity.childItems as PartialArrayDefinition
    })))
  );
}
```

#### 3. Implement loadByIndexes Method

This method is called automatically by SmartNgRX when additional chunks of IDs are needed:

```typescript
// my-entity-effect.service.ts
override loadByIndexes(
  parentId: string,
  childField: string,
  startIndex: number,
  length: number
): Observable<PartialArrayDefinition> {
  return this.http.post<PartialArrayDefinition>(
    `${this.apiMyEntity}/indexes`,
    { parentId, childField, startIndex, length }
  );
}
```

#### 4. Server-Side Implementation Example

Your API endpoint needs to return the requested chunk of IDs along with the total count:

```typescript
// Server-side (NestJS example)
@Post('indexes')
async getByIndexes(
  @Body() definition: {
    parentId: string;
    childField: string;
    startIndex: number;
    length: number;
  },
): Promise<PartialArrayDefinition> {
  // Query for the requested chunk of child IDs
  const childIds = await this.prisma.childEntity.findMany({
    where: { parentId: definition.parentId },
    select: { id: true },
    orderBy: { created: 'asc' },
    skip: definition.startIndex,
    take: definition.length,
  });

  // Get total count
  const totalCount = await this.prisma.childEntity.count({
    where: { parentId: definition.parentId },
  });

  return {
    startIndex: definition.startIndex,
    indexes: childIds.map(c => c.id),
    length: totalCount,
  };
}
```

### How SmartNgRX Uses Virtual Arrays

1. **Initial Load**: When you first access a parent entity, the server returns a `PartialArrayDefinition` with the first chunk of child IDs (e.g., IDs 0-49 of 1000 total)

2. **Lazy Loading**: When your component accesses a child at an index that hasn't been loaded yet (e.g., `getIdAtIndex(100)`), SmartNgRX automatically:

   - Calls your `loadByIndexes` method with the appropriate range
   - Receives the next chunk of IDs
   - Updates the internal state seamlessly

3. **Virtual Scrolling Integration**: This works perfectly with Angular CDK's virtual scrolling:

```typescript
// Component with virtual scrolling
private loadVisibleRange(start: number, end: number): void {
  const items = this.items$(); // SmartArray backed by PartialArrayDefinition
  const visible: MyEntity[] = [];

  // Accessing items[i] triggers automatic loading via loadByIndexes if needed
  for (let i = start; i <= end && i < items.length; i++) {
    visible.push(items[i]); // SmartNgRX loads IDs on-demand
  }

  this.visibleItems$.set(visible);
}
```

### Key Benefits

- **Performance**: Only load IDs that are actually needed
- **Memory**: Reduced memory footprint for large collections
- **Scalability**: Handle thousands of child entities efficiently
- **Transparency**: Component code remains simple - SmartNgRX handles the complexity

### Important Notes

- [ ] Virtual arrays work with SmartArray's `getIdAtIndex(index)` method
- [ ] Initial `PartialArrayDefinition` should include at least the first visible chunk
- [ ] The `length` property must always reflect the total count
- [ ] Use consistent ordering in your database queries to ensure stable results
- [ ] Consider server-side caching for frequently accessed index ranges

## 3. Create Selectors

### Basic Entity Selector

- [ ] Create basic entity selector file using `createSmartSignal`
- [ ] Use feature name and entity name (must match definition)
- [ ] Export as a const function
- [ ] One selector file per entity

```typescript
// selectors/select-my-entity-entity.function.ts
import { createSmartSignal } from '@smarttools/smart-signals';
import { MyEntity } from '../my-entity.interface';

export const selectMyEntityEntity = createSmartSignal<MyEntity>('app', 'myEntities');
```

### Parent-Child Relationship Selectors

- [ ] Identify parent-child relationships in your entities
- [ ] Create entity selectors for both parent and children first
- [ ] Create a separate selector file for the relationship
- [ ] Use `createSmartSignal` with parent selector and child configurations
- [ ] Ensure all referenced selectors are Smart Signals
- [ ] One relationship per selector file

```typescript
// selectors/select-top-my-entities.function.ts
import { createSmartSignal } from '@smarttools/smart-signals';
import { selectTopEntities } from '../../top/selectors/select-top-entities.function';
import { selectMyEntityEntity } from './select-my-entity-entity.function';

export const selectTopMyEntities = createSmartSignal(selectTopEntities, [
  {
    childFeature: 'app',
    childEntity: 'myEntities',
    parentField: 'myEntities', // MUST match field name in parent interface
    parentFeature: 'app',
    parentEntity: 'top',
    childSelector: selectMyEntityEntity,
  },
]);
```

### Multi-Child Relationship Selectors

- [ ] For entities with multiple child types, pass array of relationship configs
- [ ] Specify proper TypeScript types for parent and all child types

```typescript
// selectors/select-my-entity-children.function.ts
import { createSmartSignal } from '@smarttools/smart-signals';
import { MyEntity } from '../my-entity.interface';
import { selectMyEntityEntity } from './select-my-entity-entity.function';
import { ChildType1 } from '../../child-type1/child-type1.interface';
import { ChildType2 } from '../../child-type2/child-type2.interface';
import { selectChildType1Entity } from '../../child-type1/selectors/select-child-type1-entity.function';
import { selectChildType2Entity } from '../../child-type2/selectors/select-child-type2-entity.function';

export const selectMyEntityChildren = createSmartSignal<MyEntity, ChildType1 | ChildType2>(selectMyEntityEntity, [
  {
    childFeature: 'app',
    childEntity: 'childType1',
    parentField: 'relatedChildItems1', // MUST match field in MyEntity interface
    parentFeature: 'app',
    parentEntity: 'myEntities',
    childSelector: selectChildType1Entity,
  },
  {
    childFeature: 'app',
    childEntity: 'childType2',
    parentField: 'relatedChildItems2', // MUST match field in MyEntity interface
    parentFeature: 'app',
    parentEntity: 'myEntities',
    childSelector: selectChildType2Entity,
  },
]);
```

### Helper Selectors for Child Arrays

- [ ] For top-level entity access, create helper using `getTopChildRows`
- [ ] This extracts the child array from parent-child selector
- [ ] Returns a SmartArray that can be used directly in components

```typescript
// selectors/select-my-entities.function.ts
import { getTopChildRows } from '@smarttools/smart-signals';
import { Top } from '../../top/top.interface';
import { MyEntity } from '../my-entity.interface';
import { selectTopMyEntities } from './select-top-my-entities.function';

export const selectMyEntities = getTopChildRows<Top, MyEntity>(
  selectTopMyEntities,
  'myEntities' // Field name from Top interface that contains MyEntity IDs
);
```

## 4. Component Integration

### Understanding SmartArray

**Important**: SmartArray is NOT a regular JavaScript array. It only provides these specific members:

- `length: number` - The number of items
- `addToStore(newRow, parent)` - Add an entity to the store
- `add(newRow, parent)` - Alias for addToStore
- `removeFromStore(row, parent)` - Remove an entity from the store
- `getIdAtIndex(index)` - Get the ID at a specific index without retrieving the data associated with the ID. Used for lazy loading of data.

Do NOT use standard array methods like `.map()`, `.filter()`, `.forEach()`, etc. directly on SmartArray.

**Converting SmartArray to regular array**:

- SmartArray does NOT have an iterator, so you cannot use spread operator `[...smartArray]` or `Array.from()`
- To convert to a regular array, iterate using index-based access:

  ```typescript
  const regularArray: MyEntity[] = [];
  for (let i = 0; i < smartArray.length; i++) {
    regularArray.push(smartArray[i]);
  }
  ```

- Only convert when necessary (e.g., for third-party libraries that require actual arrays)

### Virtual Scrolling with SmartArray

For optimal performance with large datasets, implement virtual scrolling using Angular CDK's `CdkVirtualScrollViewport`. SmartArray is specifically designed to support lazy loading - it only fetches data for items that are actually being displayed.

**Key Concepts:**

- Use `getIdAtIndex(index)` to check if data exists without fetching it
- Only access `smartArray[index]` for items in the visible viewport range
- This triggers data loading only for visible items

**Implementation Pattern:**

```typescript
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { Component, ViewChild, AfterViewInit, signal } from '@angular/core';
import { debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  template: `
    <cdk-virtual-scroll-viewport itemSize="50" class="viewport">
      @for (item of visibleItems$(); track $index) {
      <div class="item">{{ item.name }}</div>
      }
    </cdk-virtual-scroll-viewport>
  `,
  imports: [ScrollingModule],
})
export class MyVirtualScrollComponent implements AfterViewInit {
  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;

  items$ = selectMyEntities as Signal<MyEntity[] & SmartArray<Top, MyEntity>>;
  visibleItems$ = signal<MyEntity[]>([]);

  ngAfterViewInit(): void {
    // Watch for scroll events and update visible range
    this.viewport.renderedRangeStream.pipe(debounceTime(100), takeUntilDestroyed(this.destroyRef)).subscribe((range) => {
      this.loadVisibleRange(range.start, range.end);
    });
  }

  private loadVisibleRange(start: number, end: number): void {
    const items = this.items$();
    const visible: MyEntity[] = [];

    // Only access items in visible range - this triggers lazy loading
    for (let i = start; i <= end && i < items.length; i++) {
      // Accessing items[i] here triggers data fetch only if not already loaded
      visible.push(items[i]);
    }

    this.visibleItems$.set(visible);
  }
}
```

**For Complex Hierarchical Data (Trees):**

When working with expandable tree structures, the pattern is more complex:

```typescript
private buildFlatTree(
  smartArray: SmartArray<Parent, Child>,
  startRange: number,
  endRange: number
): FlatNode[] {
  const result: FlatNode[] = [];

  for (let i = 0; i < smartArray.length; i++) {
    // Check if this index is in visible range OR if it has expanded children
    const isInRange = startRange <= result.length && result.length <= endRange;
    const isExpanded = this.isNodeExpanded(i);

    if (isInRange || isExpanded) {
      // Only access the actual data if needed
      const node = smartArray[i];
      result.push(this.toFlatNode(node));

      // Recursively build children if expanded
      if (isExpanded && node.children) {
        const childNodes = this.buildFlatTree(
          node.children,
          startRange - result.length,
          endRange - result.length
        );
        result.push(...childNodes);
      }
    } else {
      // Item not in range and not expanded - just increment length
      // This avoids fetching data we don't need to display
      result.length++;
    }
  }

  return result;
}
```

**Key Benefits:**

- Data is only loaded for visible items
- Automatic caching - once loaded, data stays in store
- Optimal performance even with thousands of items
- Memory efficient - items outside viewport aren't loaded

**Reference Implementation:**

See the SmartNgRX demo tree component for a complete working example:

- [Tree Component](https://github.com/DaveMBush/SmartNgRX/blob/main/apps/demo-ngrx-signals/src/app/shared/components/tree/tree.component.ts) (lines 93 and 191)
- [Tree Service](https://github.com/DaveMBush/SmartNgRX/blob/main/apps/demo-ngrx-signals/src/app/shared/components/tree/tree-component.service.ts)

### Basic Component Setup

- [ ] Call selectors as functions directly (not injected)
- [ ] Store selector results in component properties
- [ ] Use selector signals directly in templates
- [ ] Use `computed()` for derived state (not `effect()`)
- [ ] Type selector results appropriately with SmartArray when needed

```typescript
import { Component, Signal, computed } from '@angular/core';
import { SmartArray } from '@smarttools/smart-signals';
import { selectMyEntities } from './store/my-entity/selectors/select-my-entities.function';
import { selectTopEntities } from './store/top/selectors/select-top-entities.function';
import { MyEntity } from './store/my-entity/my-entity.interface';
import { Top } from './store/top/top.interface';

@Component({
  template: `
    @for (item of itemsArray$(); track item.id) {
    <div>{{ item.description }}</div>
    }
  `,
})
export class MyComponent {
  // Call selector as function, store result
  items$ = selectMyEntities as Signal<MyEntity[] & SmartArray<Top, MyEntity>>;

  top = selectTopEntities().entities;

  // Use computed for derived state
  // Convert SmartArray to regular array for template iteration
  itemsArray$ = computed(() => {
    const items = this.items$();
    const result: MyEntity[] = [];
    for (let i = 0; i < items.length; i++) {
      result.push(items[i]);
    }
    return result;
  });

  // Access SmartArray methods directly
  get itemsSmartArray(): SmartArray<Top, MyEntity> {
    return this.items$() as SmartArray<Top, MyEntity>;
  }
}
```

### CRUD Operations with Component Services

- [ ] Create a dedicated component service for business logic
- [ ] Access SmartArray methods directly on selector results
- [ ] Use `addToStore!` for adding entities
- [ ] Use `RowProxyDelete` interface for delete operations
- [ ] Component service holds reference to component for state access

```typescript
// my-component.service.ts
import { Injectable } from '@angular/core';
import { RowProxyDelete, SmartArray } from '@smarttools/smart-signals';
import { MyEntity } from '../store/my-entity/my-entity.interface';
import { Top } from '../store/top/top.interface';
import { MyComponent } from './my.component';

@Injectable()
export class MyComponentService {
  private component!: MyComponent;

  init(component: MyComponent): void {
    this.component = component;
  }

  addEntity(): void {
    const newEntity: MyEntity = {
      id: 'new',
      description: 'New Entity',
      status: 'draft',
      version: 0,
      relatedChildItems1: [],
      relatedChildItems2: [],
    };

    // Access SmartArray method directly
    this.component.items$().addToStore!(
      newEntity,
      this.component.top['1']! // Parent entity
    );
  }

  deleteEntity(entity: MyEntity & RowProxyDelete): void {
    entity.markForDeletion();
  }

  updateEntity(entity: MyEntity, updates: Partial<MyEntity>): void {
    // Direct property updates on entities
    Object.assign(entity, updates);
  }
}
```

```typescript
// my.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { MyComponentService } from './my-component.service';

@Component({
  viewProviders: [MyComponentService],
  // ...
})
export class MyComponent implements OnInit {
  private service = inject(MyComponentService);

  ngOnInit(): void {
    this.service.init(this);
  }

  onAddClick(): void {
    this.service.addEntity();
  }
}
```

## 5. Testing Checklist

### Unit Tests

- [ ] Test effects service methods (loadByIds, update, add, delete)
- [ ] Test entity definition configuration
- [ ] Test selector function calls return correct types
- [ ] Test component service business logic
- [ ] Mock HttpClient for effects service tests

### Integration Tests

- [ ] Test complete CRUD workflows through component services
- [ ] Test parent-child relationship loading and hydration
- [ ] Test selector chaining returns correct data
- [ ] Test error handling in effects services
- [ ] Test SmartArray methods (addToStore, markForDeletion)

### Manual Testing

- [ ] Verify data loads correctly from API
- [ ] Confirm UI updates reactively when entities change
- [ ] Test all user interactions (add, edit, delete)
- [ ] Verify parent-child relationships display correctly
- [ ] Check for memory leaks in long-running sessions

## 6. Performance Verification

### Optimization Checks

- [ ] Verify only necessary data is loaded (lazy loading via selectors)
- [ ] Check for unnecessary re-renders using Angular DevTools
- [ ] Implement virtual scrolling for large lists if needed
- [ ] Use computed signals for derived state instead of effect()
- [ ] Verify route-based entity registration loads only when needed

### Monitoring

- [ ] Use NgRX DevTools to monitor state changes
- [ ] Check network requests are batched appropriately
- [ ] Verify cache behavior (entities only loaded once)
- [ ] Monitor memory usage in browser DevTools
- [ ] Check that deleted entities are removed from store

## 7. Common Pitfalls to Avoid

- [ ] **Call selectors as functions, don't inject them** - Use `selectMyEntities` directly, not `inject(selectMyEntities)`
- [ ] **All signals must be Smart Signals** - Don't mix with regular Angular signals in selector chains
- [ ] **Proper signal chaining** - Child selectors must reference Smart Signals from parent
- [ ] **Correct entity names** - Must match exactly between definition (`entityName`) and selectors
- [ ] **Effects service registration** - Must be registered globally in app.config.ts, not in routes
- [ ] **Entity registration in routes** - Use `provideSmartFeatureSignalEntities` at parent route level
- [ ] **Normalized state structure** - Store arrays of child IDs, not full child objects
- [ ] **parentField must match interface** - The `parentField` in ChildDefinition must exactly match the array field name in the parent interface
- [ ] **SmartArray is NOT a regular array** - Don't assume array methods like `.map()`, `.filter()`, `.find()` are available. SmartArray only has specific methods: `addToStore()`, `removeFromStore()`, `add()`, `getIdAtIndex()`, and `length` property. SmartArray does NOT have an iterator - you cannot use spread `[...]` or `Array.from()`. Convert using index-based loop when needed for third-party libraries
- [ ] **SmartArray type casting** - Use `as Signal<MyEntity[] & SmartArray<Parent, Child>>` when accessing methods
- [ ] **defaultRow completeness** - Include all entity properties with appropriate defaults
- [ ] **Use computed() not effect()** - For derived state, use computed signals
- [ ] **Component service pattern** - Keep business logic in services, not components

## 8. File Organization Pattern

Follow this consistent file structure for each entity:

```text
store/
  my-entity/
    my-entity.interface.ts              # Entity interface
    my-entity-definition.const.ts       # SmartEntityDefinition
    my-entity-effect.service.ts         # EffectService implementation
    my-entity-effect-service-token.ts   # InjectionToken
    selectors/
      select-my-entity-entity.function.ts     # Base entity selector
      select-top-my-entities.function.ts      # Parent-child selector
      select-my-entities.function.ts          # Helper using getTopChildRows
      select-my-entity-children.function.ts   # Multi-child selector (if needed)
```

## 9. Documentation

- [ ] Document entity relationships and hierarchies
- [ ] Add inline comments for complex selectors
- [ ] Update architecture documentation with new entities
- [ ] Document API endpoints in effects services
- [ ] Create usage examples for team members
- [ ] Document any custom business logic in component services

## Final Verification

- [ ] All entities are properly registered in routes
- [ ] All effects services are registered in app.config.ts
- [ ] All selectors work correctly when called as functions
- [ ] CRUD operations function through component services
- [ ] Performance is acceptable
- [ ] Tests are passing
- [ ] Code follows project file organization pattern
- [ ] Documentation is updated
- [ ] No regular Angular signals mixed with Smart Signals

---

**Note**: This checklist is specific to the RMS application's SmartNgRX Signals implementation patterns. Always refer to existing entity implementations in the codebase as examples.
