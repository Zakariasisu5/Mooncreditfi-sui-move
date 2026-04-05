import { createNetworkConfig } from '@mysten/dapp-kit';

// SECURITY: Multiple RPC endpoints for fallback and resilience
// Primary: SuiScan RPC (CORS-enabled, full indexing)
// Fallback: Official Sui RPC
const RPC_ENDPOINTS = {
  testnet: [
    'https://rpc-testnet.suiscan.xyz:443', // Primary - CORS enabled
    'https://fullnode.testnet.sui.io:443', // Fallback
  ],
  mainnet: [
    'https://fullnode.mainnet.sui.io:443',
  ],
  devnet: [
    'https://fullnode.devnet.sui.io:443',
  ],
};

const TESTNET_RPC = import.meta.env.VITE_SUI_RPC_URL || RPC_ENDPOINTS.testnet[0];

const { networkConfig, useNetworkVariable } = createNetworkConfig({
  testnet: { 
    url: TESTNET_RPC,
    variables: {
      rpcUrl: TESTNET_RPC,
      fallbackRpcs: RPC_ENDPOINTS.testnet,
    }
  },
  mainnet: { 
    url: RPC_ENDPOINTS.mainnet[0],
    variables: {
      rpcUrl: RPC_ENDPOINTS.mainnet[0],
      fallbackRpcs: RPC_ENDPOINTS.mainnet,
    }
  },
  devnet: { 
    url: RPC_ENDPOINTS.devnet[0],
    variables: {
      rpcUrl: RPC_ENDPOINTS.devnet[0],
      fallbackRpcs: RPC_ENDPOINTS.devnet,
    }
  },
});

export { networkConfig, useNetworkVariable, RPC_ENDPOINTS };

// Deployed package IDs on Sui Testnet - Credit-Based Lending System
// ⚠️ IMPORTANT: If you see "unable to locate packageID" error in Suiet wallet:
// This means the package doesn't exist on testnet. Solutions:
// 1. Use Sui Wallet or Splash Wallet (they don't validate package ID on connect)
// 2. Set USE_DEMO_MODE = true below to test UI without blockchain
// 3. Redeploy contracts and update this package ID
export const SUI_PACKAGE_ID = '0xf434eed382320933b03c5280ab1694807239297c16bbf3265acc57768a18adaa';

// Real object IDs from Sui Testnet - Credit-Based Lending Deployment
// These must exist on blockchain for real transactions to work
export const PROFILE_REGISTRY_OBJECT_ID = '0x78122275aaff5a52bc42f642e746aa59e30ec8dad0de03224ff745aab3050cbe';
export const UPGRADE_CAP_OBJECT_ID = '0x836620787424ce5a54cfcbb2743eed8c57eaf33d11356a4bd8bb4e4d500559d0';
export const LENDING_POOL_OBJECT_ID = '0x2e14b3c4af9ed29ff3ce4f9d3197286e606cd12c2bfac00bd49bfcc54bdbc7e2';
export const CREDIT_PROFILE_OBJECT_ID = '0x9bdf8a2f57168895c1599d94cc092b05c2337a622d427ec040e9088b6199a140'; // User-specific, created on demand

// DePIN Projects - Multiple infrastructure projects (Credit-Based Lending System)
export const DEPIN_PROJECTS = [
  { id: '0xa501ba4c31e035263d9797ad0cbafdef3a78ba57dd339bd10d121ee238e478e0', category: 'Solar', name: 'Solar Farm Network' },
];

// Legacy single project ID (kept for backward compatibility)
export const DEPIN_FINANCE_OBJECT_ID = DEPIN_PROJECTS[0].id; 

// Set to false once you have real object IDs
export const USE_DEMO_MODE = false;

export const ACTIVE_NETWORK = 'testnet';
export const EXPLORER_URL = 'https://suiscan.xyz/testnet';

