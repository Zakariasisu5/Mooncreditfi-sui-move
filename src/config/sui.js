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

// Deployed package IDs on Sui Testnet - Credit-Based Lending System with Advanced DeFi Features
// Package deployed: April 24, 2026
// Includes: Risk Pools, Mudarabah (Islamic Finance), Enhanced DePIN with Revenue Tracking
export const SUI_PACKAGE_ID = '0x1a464477cbda05cedfe2bffefdf05a23203c0bde47d98efdcd487f8a721c4dbf';

// Real object IDs from Sui Testnet - Latest Deployment
// These must exist on blockchain for real transactions to work
export const PROFILE_REGISTRY_OBJECT_ID = '0x2a7a6834d51fb2509abfe0449d562b9267c499c3a0412b045b8dd1016ebf9496';
export const UPGRADE_CAP_OBJECT_ID = '0x7d31744fbc14e4ddc1a792a546357b303d38645b2bb7afc5e9cefffc5a85cdae';
export const LENDING_POOL_OBJECT_ID = '0x50b1abb75a74697733aea62f69254661ae0e1c48787fc4619acca9f22c84bdc6';
export const CREDIT_PROFILE_OBJECT_ID = ''; // User-specific, created on demand

// DePIN Projects - Multiple infrastructure projects (Credit-Based Lending System)
export const DEPIN_PROJECTS = [
  { id: '0x63289bc0eb8e219e9207832d8cc9668f432386cd87d604a6cbbe0de3055629ea', category: 'Solar', name: 'Solar Farm Network' },
];

// Legacy single project ID (kept for backward compatibility)
export const DEPIN_FINANCE_OBJECT_ID = DEPIN_PROJECTS[0].id; 

// Advanced DeFi Features - Risk Pools & Mudarabah (Islamic Finance)
// Deployed: April 24, 2026
export const RISK_POOL_LOW = '0x03ecb903a1eaa210869271ab63bd73e3252ec2d8f0164ed31175f2deabf0dd51';      // Level 1 - Low Risk (600+ reputation)
export const RISK_POOL_MEDIUM = '0x4ccebb9aac9352a3457c51d3ba47154b5c506d22d21316361a35244c4f5b5658';   // Level 2 - Medium Risk (400+ reputation)
export const RISK_POOL_HIGH = '0xd11e92ef47bd8b0382ae331047a83d4b97320b99cee8b99b9099ea56ff9b8700';     // Level 3 - High Risk (no minimum)
export const MUDARABAH_POOL = '0x483f0b2f43b4c4e6d0b80174bba5c3d49374116d3f7cc27e3e20fa030da34f93';     // Profit-sharing pool (70/30 split)

export const ACTIVE_NETWORK = 'testnet';
export const EXPLORER_URL = 'https://suiscan.xyz/testnet';

