import { Button } from '@lobehub/ui';
import { PackagePlus } from 'lucide-react';
import dynamic from 'next/dynamic';
import { forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAgentStore } from '@/store/agent';
import { useToolStore } from '@/store/tool';

const DevModal = dynamic(() => import('@/features/PluginDevModal'), {
  ssr: false,
});

const AddPluginButton = forwardRef<HTMLButtonElement>((props, ref) => {
  const { t } = useTranslation('setting');
  const [showModal, setModal] = useState(false);

  const [installCustomPlugin, updateNewDevPlugin] = useToolStore((s) => [
    s.installCustomPlugin,
    s.updateNewCustomPlugin,
  ]);
  const togglePlugin = useAgentStore((s) => s.togglePlugin);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <DevModal
        onOpenChange={setModal}
        onSave={async (devPlugin) => {
          await installCustomPlugin(devPlugin);
          await togglePlugin(devPlugin.identifier);
        }}
        onValueChange={updateNewDevPlugin}
        open={showModal}
      />
      <Button
        icon={PackagePlus}
        onClick={() => {
          setModal(true);
        }}
        ref={ref}
      >
        {t('plugin.addMCPPlugin')}
      </Button>
    </div>
  );
});

export default AddPluginButton;
