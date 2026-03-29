import { useSuiClient as useDappKitSuiClient } from '@mysten/dapp-kit';

/**
 * Re-export the dapp-kit SuiClient hook for convenience.
 * Use this throughout the app for all RPC calls.
 */
export const useSuiClient = () => {
  return useDappKitSuiClient();
};
