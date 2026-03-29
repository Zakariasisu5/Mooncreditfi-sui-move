/**
 * Sui wallet hook — thin wrapper around @mysten/dapp-kit hooks.
 * Provides the same interface as the previous EVM useWallet hook.
 */
import { useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import { useSuiClient } from './useSuiClient';
import { useState, useEffect } from 'react';

export const useWallet = () => {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const suiClient = useSuiClient();
  const [balance, setBalance] = useState('0');

  useEffect(() => {
    if (!account?.address) {
      setBalance('0');
      return;
    }

    const fetchBalance = async () => {
      try {
        const coins = await suiClient.getBalance({
          owner: account.address,
          coinType: '0x2::sui::SUI',
        });
        // Balance is in MIST (1 SUI = 1e9 MIST)
        const sui = (Number(coins.totalBalance) / 1e9).toFixed(4);
        setBalance(sui);
      } catch {
        setBalance('0');
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 15000);
    return () => clearInterval(interval);
  }, [account?.address, suiClient]);

  return {
    account: account?.address ?? null,
    balance,
    isConnected: !!account,
    isConnecting: false,
    disconnectWallet: disconnect,
    connectWallet: () => {}, // handled by ConnectButton
  };
};
