/* eslint-disable @typescript-eslint/restrict-template-expressions, @smarttools/one-exported-item-per-file -- Infrastructure monitoring code with specific requirements */

import { logger } from '../utils/structured-logger';
import { MockXRaySubsegment, XRaySubsegment } from './mock-xray-subsegment';

// Mock X-Ray SDK interface for development
export interface XRaySegment {
  addAnnotation(key: string, value: unknown): void;
  addMetadata(namespace: string, data: unknown): void;
  addError(error: Error): void;
  close(): void;
  addNewSubsegment(name: string): XRaySubsegment;
}

// Mock X-Ray implementation for development
export class MockXRaySegment implements XRaySegment {
  private name: string;
  private annotations: Record<string, unknown> = {};
  private metadata: Record<string, unknown> = {};
  private startTime: [number, number];

  constructor(name: string = 'request') {
    this.name = name;
    this.startTime = process.hrtime();
  }

  addAnnotation(key: string, value: unknown): void {
    this.annotations[key] = value;
    logger.debug(`X-Ray Annotation: ${key} = ${value}`, {
      segment: this.name,
      type: 'annotation',
    });
  }

  addMetadata(namespace: string, data: unknown): void {
    this.metadata[namespace] = data;
    logger.debug(`X-Ray Metadata: ${namespace}`, {
      segment: this.name,
      type: 'metadata',
      data,
    });
  }

  addError(error: Error): void {
    logger.error('X-Ray Segment Error', error, {
      segment: this.name,
      type: 'segment_error',
    });
  }

  addNewSubsegment(name: string): XRaySubsegment {
    return new MockXRaySubsegment(name);
  }

  close(): void {
    logger.performance(`X-Ray Segment: ${this.name}`, this.startTime, {
      annotations: this.annotations,
      metadata: this.metadata,
      type: 'segment_close',
    });
  }
}
