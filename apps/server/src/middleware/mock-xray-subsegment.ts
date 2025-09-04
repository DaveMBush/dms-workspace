/* eslint-disable @typescript-eslint/restrict-template-expressions, @smarttools/one-exported-item-per-file -- Infrastructure monitoring code with specific requirements */

import { logger } from '../utils/structured-logger';

export interface XRaySubsegment {
  addAnnotation(key: string, value: unknown): void;
  addMetadata(namespace: string, data: unknown): void;
  addError(error?: Error): void;
  close(): void;
}

export class MockXRaySubsegment implements XRaySubsegment {
  private name: string;
  private annotations: Record<string, unknown> = {};
  private startTime: [number, number];

  constructor(name: string) {
    this.name = name;
    this.startTime = process.hrtime();
  }

  addAnnotation(key: string, value: unknown): void {
    this.annotations[key] = value;
    logger.debug(`X-Ray Subsegment Annotation: ${key} = ${value}`, {
      subsegment: this.name,
      type: 'annotation',
    });
  }

  addMetadata(namespace: string, data: unknown): void {
    logger.debug(`X-Ray Subsegment Metadata: ${namespace}`, {
      subsegment: this.name,
      type: 'metadata',
      data,
    });
  }

  addError(error?: Error): void {
    if (error) {
      logger.error('X-Ray Subsegment Error', error, {
        subsegment: this.name,
        type: 'subsegment_error',
      });
    }
  }

  close(): void {
    logger.performance(`X-Ray Subsegment: ${this.name}`, this.startTime, {
      annotations: this.annotations,
      type: 'subsegment_close',
    });
  }
}