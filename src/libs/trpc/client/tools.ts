import { createTRPCClient, httpLink } from '@trpc/client';
import superjson from 'superjson';

import { isDesktop } from '@/const/version';
import type { ToolsRouter } from '@/server/routers/tools';
import { fetchWithDesktopRemoteRPC } from '@/utils/electron/desktopRemoteRPCFetch';

export const toolsClient = createTRPCClient<ToolsRouter>({
  links: [
    httpLink({
      fetch: isDesktop
        ? // eslint-disable-next-line no-undef
          (input, init) => fetchWithDesktopRemoteRPC(input as string, init as RequestInit)
        : undefined,
      headers: async () => {
        // dynamic import to avoid circular dependency
        const { createHeaderWithAuth } = await import('@/services/_auth');

        return createHeaderWithAuth();
      },
      transformer: superjson,
      url: '/trpc/tools',
    }),
  ],
});
