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

// Deployed package IDs on Sui Testnet - Updated with collateral system and security fixes
// ⚠️ IMPORTANT: If you see "unable to locate packageID" error in Suiet wallet:
// This means the package doesn't exist on testnet. Solutions:
// 1. Use Sui Wallet or Splash Wallet (they don't validate package ID on connect)
// 2. Set USE_DEMO_MODE = true below to test UI without blockchain
// 3. Redeploy contracts and update this package ID
export const SUI_PACKAGE_ID = '0x317ea964960bd871b9a7b8b13a84080f64571966ac25517956fe9e2f2beab6b3';

// Real object IDs from Sui Testnet
// These must exist on blockchain for real transactions to work
export const PROFILE_REGISTRY_OBJECT_ID = '0x50b5c51c42dd7460ac532d67faac95945f8fb0b163397a1ab2d65f106019ec08';
export const UPGRADE_CAP_OBJECT_ID = '0xdbaecdfc802ff216eb551f46c145a8c4163d6c82094f4c3b6ea0a6373711f44d';
export const LENDING_POOL_OBJECT_ID = '0x26f20a8b6c4347856a54c908ded06ef7267c11c8e32b2ada105c2713231a3a63';
export const CREDIT_PROFILE_OBJECT_ID = '0x9bdf8a2f57168895c1599d94cc092b05c2337a622d427ec040e9088b6199a140';

// DePIN Projects - Multiple infrastructure projects (Updated with new package)
export const DEPIN_PROJECTS = [
  { id: '0xbd3601cf4cd495d423bcffeabf64eacfc8b4b0ce0a05392be5874be72c8c172c', category: 'Solar', name: 'Solar Farm Network' },
];

// Legacy single project ID (kept for backward compatibility)
export const DEPIN_FINANCE_OBJECT_ID = DEPIN_PROJECTS[0].id; 

// Set to false once you have real object IDs
export const USE_DEMO_MODE = false;

export const ACTIVE_NETWORK = 'testnet';
export const EXPLORER_URL = 'https://suiscan.xyz/testnet';

