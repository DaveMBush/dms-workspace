import { Universe } from '../../store/universe/universe.interface';
import { UniverseDataService } from './universe-data.service';

/**
 * Creates edit handlers for the Global Universe component
 */
export function createEditHandlers(dataService: UniverseDataService): {
  onEditDistributionComplete(row: Universe): void;
  onEditDistributionsPerYearComplete(row: Universe): void;
  onEditDateComplete(row: Universe): void;
  onEditComplete(event: { data: Record<string, unknown>; field: string }): void;
  onEditCommit(row: Record<string, unknown>, field: string): void;
} {
  const basicHandlers = createBasicEditHandlers(dataService);
  const advancedHandlers = createAdvancedEditHandlers(dataService);

  return {
    ...basicHandlers,
    ...advancedHandlers,
  };
}

function createBasicEditHandlers(dataService: UniverseDataService): {
  onEditDistributionComplete(row: Universe): void;
  onEditDistributionsPerYearComplete(row: Universe): void;
} {
  return {
    onEditDistributionComplete: function onEditDistributionComplete(
      row: Universe
    ): void {
      const universe = dataService.findUniverseBySymbol(row.symbol);
      if (universe) {
        universe.distribution = row.distribution;
      }
    },

    onEditDistributionsPerYearComplete:
      function onEditDistributionsPerYearComplete(row: Universe): void {
        const universe = dataService.findUniverseBySymbol(row.symbol);
        if (universe) {
          universe.distributions_per_year = row.distributions_per_year;
        }
      },
  };
}

function createAdvancedEditHandlers(dataService: UniverseDataService): {
  onEditDateComplete(row: Universe): void;
  onEditComplete(event: { data: Record<string, unknown>; field: string }): void;
  onEditCommit(row: Record<string, unknown>, field: string): void;
} {
  return {
    onEditDateComplete: function onEditDateComplete(row: Universe): void {
      const universe = dataService.findUniverseBySymbol(row.symbol);
      if (universe) {
        universe.ex_date =
          typeof row.ex_date === 'object' &&
          row.ex_date !== null &&
          (row.ex_date as unknown) instanceof Date
            ? (row.ex_date as Date).toISOString()
            : row.ex_date;
      }
    },

    onEditComplete: function onEditComplete(event: {
      data: Record<string, unknown>;
      field: string;
    }): void {
      const universe = dataService.findUniverseBySymbol(
        event.data['symbol'] as string
      );
      if (universe) {
        (universe as unknown as Record<string, unknown>)[event.field] =
          event.data[event.field];
      }
    },

    onEditCommit: function onEditCommit(
      row: Record<string, unknown>,
      field: string
    ): void {
      const universe = dataService.findUniverseBySymbol(
        row['symbol'] as string
      );
      if (universe) {
        (universe as unknown as Record<string, unknown>)[field] = row[field];
      }
    },
  };
}
