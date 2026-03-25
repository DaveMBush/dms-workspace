import type { Meta, StoryObj } from '@storybook/angular';

import { NodeEditorComponent } from './node-editor.component';

const meta: Meta<NodeEditorComponent> = {
  component: NodeEditorComponent,
  title: 'Components/NodeEditor',
  argTypes: {
    save: { action: 'save' },
    cancel: { action: 'cancel' },
  },
};

export default meta;

type Story = StoryObj<NodeEditorComponent>;

export const Default: Story = {
  args: {
    placeholder$: 'Enter a value...',
  },
};

export const CustomPlaceholder: Story = {
  args: {
    placeholder$: 'Type node name here',
  },
};
