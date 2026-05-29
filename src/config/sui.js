import { createNetworkConfig } from '@mysten/dapp-kit';

const RPC_ENDPOINTS = {
  testnet: [
    'https://rpc-testnet.suiscan.xyz:443',
    'https://fullnode.testnet.sui.io:443',
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
export const SUI_PACKAGE_ID = '0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5';
export const PROFILE_REGISTRY_OBJECT_ID = '0x59bee28062384ea12e53a1014dc32443090fc90e15caf4e90d56559d7bff315f';
export const UPGRADE_CAP_OBJECT_ID = '0xc1f4a8ad5a8526647d61cd4a1e14e8f6cfbc78e3e38354aa9ad7f7a8551abd26';
export const LENDING_POOL_OBJECT_ID = '0xb1d0c030979b33b1266984a979c3d98958e0a735b6628d473e5df9166615b03e';
export const CREDIT_PROFILE_OBJECT_ID = ''; // User-specific, created on demand

// Helper function to check if an object ID is valid
export const isValidObjectId = (id) => {
  return id && id !== '' && id !== '0x0000000000000000000000000000000000000000000000000000000000000000';
};

// DePIN Projects - Created after deployment
// Use the depin::create_project function to create new projects
export const DEPIN_PROJECTS = [
  {
    id: '0xc19729095eaf30af890aa66172f906ce9f7050d0cff1137ac460b0fb0a283c36',
    category: 'Solar',
    name: 'Solar Farm Network',
    description: 'Decentralized solar energy infrastructure',
    target_amount: 100000000000, // 100 SUI
    apy: 1200 // 12%
  },
  {
    id: '0x16ff67f07c3141cccc8602bd13485cd1721d2157c38e4d725471910ee6769eb5',
    category: 'EV',
    name: 'EV Charging Network',
    description: 'Decentralized electric vehicle charging stations powered by renewable energy',
    target_amount: 120000000000, // 120 SUI
    apy: 1100 // 11%
  },
  {
    id: '0x067bb4f01c62c6ffb2962a351e718beb53f26a475a672d14b0e463e12ef589d4',
    category: 'IoT',
    name: 'IoT Sensor Network',
    description: 'Decentralized environmental monitoring sensors for air quality and climate data',
    target_amount: 80000000000, // 80 SUI
    apy: 1300 // 13%
  },
  {
    id: '0x3cf276315abb1ca26e4d581eddb1c39e6938d7978b12a99c1f5249dd0f2e5579',
    category: 'Satellite',
    name: 'Satellite Internet Network',
    description: 'Decentralized low-earth orbit satellite constellation for global internet coverage',
    target_amount: 300000000000, // 300 SUI
    apy: 1800 // 18%
  }
];

// Legacy single project ID (kept for backward compatibility)
export const DEPIN_FINANCE_OBJECT_ID = '0xc19729095eaf30af890aa66172f906ce9f7050d0cff1137ac460b0fb0a283c36';

// Advanced DeFi Features - Risk Pools & Mudarabah (Islamic Finance)
export const RISK_POOL_LOW = '0x0000000000000000000000000000000000000000000000000000000000000000';      // Level 1 - Low Risk (600+ reputation) - TO BE CREATED
export const RISK_POOL_MEDIUM = '0xdc498215dd5bbaec9377222cefcb559a10f7a814290fbd1572a2df40749b98e6';   // Level 2 - Medium Risk (400+ reputation)
export const RISK_POOL_HIGH = '0x9276e0e3f3eeb9653a5c23fadeedc4bfa73e404fbf2870138e9aef2052c82311';     // Level 3 - High Risk (no minimum)
export const MUDARABAH_POOL = '0x61064a963336445556012d57a7827e342e8fe6eb5be899da4f50263fbf4fab90';     // Profit-sharing pool (70/30 split)

export const ACTIVE_NETWORK = 'testnet';
export const EXPLORER_URL = 'https://suiscan.xyz/testnet';