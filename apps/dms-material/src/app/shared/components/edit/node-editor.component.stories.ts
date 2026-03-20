import type { Meta, StoryObj } from '@storybook/angular';

import { NodeEditorComponent } from './node-editor.component';

const meta: Meta<NodeEditorComponent> = {
  title: 'Shared/NodeEditorComponent',
  component: NodeEditorComponent,
};

export default meta;
type Story = StoryObj<NodeEditorComponent>;

export const Default: Story = {
  args: {
    mode: 'text',
    label: 'Edit Value',
    placeholder: 'Enter text...',
  },
};
