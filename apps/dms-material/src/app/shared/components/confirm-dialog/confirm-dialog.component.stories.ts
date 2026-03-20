import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  applicationConfig,
  type Meta,
  type StoryObj,
} from '@storybook/angular';

import { ConfirmDialogComponent } from './confirm-dialog.component';

const meta: Meta<ConfirmDialogComponent> = {
  title: 'Shared/ConfirmDialogComponent',
  component: ConfirmDialogComponent,
  decorators: [
    applicationConfig({
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            title: 'Confirm Action',
            message: 'Are you sure you want to proceed?',
            confirmText: 'Yes',
            cancelText: 'No',
          },
        },
        {
          provide: MatDialogRef,
          useValue: {
            close: function noop() {
              /* noop */
            },
          },
        },
      ],
    }),
  ],
};

export default meta;
type Story = StoryObj<ConfirmDialogComponent>;

export const Default: Story = {};

export const DeleteConfirmation: Story = {
  decorators: [
    applicationConfig({
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            title: 'Delete Item',
            message:
              'This action cannot be undone. Are you sure you want to delete this item?',
            confirmText: 'Delete',
            cancelText: 'Cancel',
          },
        },
        {
          provide: MatDialogRef,
          useValue: {
            close: function noop() {
              /* noop */
            },
          },
        },
      ],
    }),
  ],
};
