import { createContext, useContext, useEffect, useRef } from 'react';
import { useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import { useNotifications } from './NotificationContext';
import { useWallet } from '@/hooks/useWallet';

const WalletContext = createContext(null);

export const WalletProvider = ({ children }) => {
  const { account, balance, isConnected, isConnecting, disconnectWallet } = useWallet();
  const { addNotification } = useNotifications();

  const prevConnected = useRef(isConnected);

  useEffect(() => {
    if (prevConnected.current !== isConnected) {
      if (isConnected && account) {
        addNotification(
          `Wallet connected: ${account.slice(0, 6)}...${account.slice(-4)}`,
          'success'
        );
      } else if (prevConnected.current && !isConnected) {
        addNotification('Wallet disconnected', 'info');
      }
      prevConnected.current = isConnected;
    }
  }, [isConnected, account, addNotification]);

  const wallet = {
    account,
    balance,
    isConnected,
    isConnecting,
    disconnectWallet,
  };

  return (
    <WalletContext.Provider value={wallet}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within WalletProvider');
  }
  return context;
};
