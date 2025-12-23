'use client';

import { enableNextAuth } from '@lobechat/const';
import { useRouter } from 'next/navigation';
import { memo, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createStoreUpdater } from 'zustand-utils';

import { useIsMobile } from '@/hooks/useIsMobile';
import { useAgentStore } from '@/store/agent';
import { useAiInfraStore } from '@/store/aiInfra';
import { useElectronStore } from '@/store/electron';
import { electronSyncSelectors } from '@/store/electron/selectors';
import { useGlobalStore } from '@/store/global';
import { useServerConfigStore } from '@/store/serverConfig';
import { serverConfigSelectors } from '@/store/serverConfig/selectors';
import { useUrlHydrationStore } from '@/store/urlHydration';
import { useUserStore } from '@/store/user';
import { authSelectors } from '@/store/user/selectors';

const StoreInitialization = memo(() => {
  // prefetch error ns to avoid don't show error content correctly
  useTranslation('error');

  // Initialize from URL (one-time)
  const initAgentPinnedFromUrl = useUrlHydrationStore((s) => s.initAgentPinnedFromUrl);
  initAgentPinnedFromUrl();

  const router = useRouter();
  const [isLogin, isSignedIn] = useUserStore((s) => [authSelectors.isLogin(s), s.isSignedIn]);

  const { serverConfig } = useServerConfigStore();

  const useInitSystemStatus = useGlobalStore((s) => s.useInitSystemStatus);

  // ============ Critical initialization (synchronous) ============
  // init the system preference
  useInitSystemStatus();

  // fetch server config
  const useFetchServerConfig = useServerConfigStore((s) => s.useInitServerConfig);
  useFetchServerConfig();

  // Update NextAuth status
  const useUserStoreUpdater = createStoreUpdater(useUserStore);
  const oAuthSSOProviders = useServerConfigStore(serverConfigSelectors.oAuthSSOProviders);
  useUserStoreUpdater('oAuthSSOProviders', oAuthSSOProviders);

  const useStoreUpdater = createStoreUpdater(useGlobalStore);
  const mobile = useIsMobile();
  useStoreUpdater('isMobile', mobile);

  /**
   * The store function of `isLogin` will both consider the values of `enableAuth` and `isSignedIn`.
   * But during initialization, the value of `enableAuth` might be incorrect cause of the async fetch.
   * So we need to use `isSignedIn` only to determine whether request for the default agent config and user state.
   *
   * IMPORTANT: Explicitly convert to boolean to avoid passing null/undefined downstream,
   * which would cause unnecessary API requests with invalid login state.
   */
  const isLoginOnInit = Boolean(enableNextAuth ? isSignedIn : isLogin);
  const isSyncActive = useElectronStore((s) => electronSyncSelectors.isSyncActive(s));

  const useInitAgentStore = useAgentStore((s) => s.useInitInboxAgentStore);
  const useInitAiProviderKeyVaults = useAiInfraStore((s) => s.useFetchAiProviderRuntimeState);
  const useInitUserState = useUserStore((s) => s.useInitUserState);

  // Use useMemo to ensure defaultAgentConfig reference stability
  const defaultAgentConfig = useMemo(
    () => serverConfig.defaultAgent?.config,
    [serverConfig.defaultAgent?.config],
  );

  useInitAgentStore(isLoginOnInit, defaultAgentConfig);
  useInitAiProviderKeyVaults(isLoginOnInit, isSyncActive);
  useInitUserState(isLoginOnInit, serverConfig, {
    onSuccess: (state) => {
      if (state.isOnboard === false) {
        router.push('/onboard');
      }
    },
  });

  // ============ Non-critical initialization (deferred) ============
  // Track whether non-critical initialization should proceed
  const nonCriticalInitScheduled = useRef(false);

  useEffect(() => {
    if (nonCriticalInitScheduled.current) return;
    nonCriticalInitScheduled.current = true;

    // Delay non-critical store initialization to avoid blocking main thread
    const scheduleNonCriticalInit = () => {
      console.debug('⏰ Store: Scheduling non-critical stores initialization...');
      // TODO: Add non-critical stores initialization here
      console.debug('✨ Store: Non-critical stores initialization enabled');
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(scheduleNonCriticalInit, { timeout: 2000 });
    } else {
      setTimeout(scheduleNonCriticalInit, 500);
    }
  }, []);

  return null;
});

export default StoreInitialization;
