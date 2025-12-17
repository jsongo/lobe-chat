import isEqual from 'fast-deep-equal';
import dynamic from 'next/dynamic';
import { ReactNode, memo } from 'react';

import { useToolStore } from '@/store/tool';
import { pluginSelectors } from '@/store/tool/slices/plugin/selectors';

const DevModal = dynamic(() => import('@/features/PluginDevModal'), {
  ssr: false,
});

interface EditCustomPluginProps {
  children: ReactNode;
  identifier: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

const EditCustomPlugin = memo<EditCustomPluginProps>(
  ({ identifier, open, onOpenChange, children }) => {
    const [installCustomPlugin, updateNewDevPlugin, uninstallCustomPlugin] = useToolStore((s) => [
      s.installCustomPlugin,
      s.updateNewCustomPlugin,
      s.uninstallCustomPlugin,
    ]);

    const customPlugin = useToolStore(pluginSelectors.getCustomPluginById(identifier), isEqual);

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <DevModal
          mode={'edit'}
          onDelete={() => {
            uninstallCustomPlugin(identifier);
            onOpenChange(false);
          }}
          onOpenChange={onOpenChange}
          onSave={async (devPlugin) => {
            await installCustomPlugin(devPlugin);
            onOpenChange(false);
          }}
          onValueChange={updateNewDevPlugin}
          open={open}
          value={customPlugin}
        />
        {children}
      </div>
    );
  },
);

export default EditCustomPlugin;
