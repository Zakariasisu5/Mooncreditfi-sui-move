import { createNetworkConfig } from '@mysten/dapp-kit';

// Use RPC endpoint with full indexing support
// Suiet RPC has CORS enabled and supports all indexing features
const TESTNET_RPC = import.meta.env.VITE_SUI_RPC_URL || 'https://rpc-testnet.suiscan.xyz:443';

const { networkConfig, useNetworkVariable } = createNetworkConfig({
  testnet: { 
    url: TESTNET_RPC,
    variables: {
      rpcUrl: TESTNET_RPC
    }
  },
  mainnet: { 
    url: 'https://fullnode.mainnet.sui.io:443',
    variables: {
      rpcUrl: 'https://fullnode.mainnet.sui.io:443'
    }
  },
  devnet: { 
    url: 'https://fullnode.devnet.sui.io:443',
    variables: {
      rpcUrl: 'https://fullnode.devnet.sui.io:443'
    }
  },
});

export { networkConfig, useNetworkVariable };

// Deployed package IDs on Sui Testnet - Updated with debt tracking system
// ⚠️ IMPORTANT: If you see "unable to locate packageID" error in Suiet wallet:
// This means the package doesn't exist on testnet. Solutions:
// 1. Use Sui Wallet or Splash Wallet (they don't validate package ID on connect)
// 2. Set USE_DEMO_MODE = true below to test UI without blockchain
// 3. Redeploy contracts and update this package ID
export const SUI_PACKAGE_ID = '0x8853e2763099cbbd1fd5281a9823d8d76d8423a89fb8068d7c21bd4f06118088';

// Real object IDs from Sui Testnet
// These must exist on blockchain for real transactions to work
export const LENDING_POOL_OBJECT_ID = '0x082dab87c4c23ed818c67bafd0cd4c2b38e8b4b8668387653dbc2ee0474b1b71';
export const CREDIT_PROFILE_OBJECT_ID = '0xd8fc84c31c80f58b6ab4fc3aa153cddc232bbb745187be56da1c33ea3ee94c2a'; 

// DePIN Projects - Multiple infrastructure projects (Updated with new package)
export const DEPIN_PROJECTS = [
  { id: '0x5fb777107c23414cb548fcddb06b1c5704ef5418ad382d7bc871f279210cef6c', category: 'Solar', name: 'Solar Farm Network' },
  { id: '0x6cbfda01998f35090ab4ed6d4a94faa9e20e8a84e738c48212fa05b1be0a60eb', category: 'Telecom', name: '5G Network Infrastructure' },
  { id: '0x487fa3faa51f119b70918fa64680d2510c758ba5c2379be2fce20f83a15c2ede', category: 'IoT', name: 'IoT Sensor Network' },
  { id: '0x1883d8cc333099d41ab73563dc9985518942c27bb5e0bb051cb5f03617d85700', category: 'Mobility', name: 'EV Charging Stations' },
  { id: '0x1e76bfe6041bdbc1209cc781d25c97da5f39adb262e35c8cd1d9638e7c6b9c5c', category: 'WiFi', name: 'Community WiFi Hotspots' },
  { id: '0xa9e5fd5e019daa77d2ee8c59bea85098f806d35f2943887f037b0678a7d048ed', category: 'Energy Storage', name: 'Battery Storage Grid' },
];

// Legacy single project ID (kept for backward compatibility)
export const DEPIN_FINANCE_OBJECT_ID = DEPIN_PROJECTS[0].id; 

// Set to false once you have real object IDs
export const USE_DEMO_MODE = false;

export const ACTIVE_NETWORK = 'testnet';
export const EXPLORER_URL = 'https://suiscan.xyz/testnet';

// Log package ID info on app load
if (typeof window !== 'undefined') {
  console.log('%c🔷 MoonCreditFi - Sui dApp Configuration', 'color: #4F46E5; font-size: 14px; font-weight: bold;');
  console.log('%cNetwork:', 'font-weight: bold;', ACTIVE_NETWORK);
  console.log('%cPackage ID:', 'font-weight: bold;', SUI_PACKAGE_ID);
  console.log('%cRPC Endpoint:', 'font-weight: bold;', TESTNET_RPC);
  console.log('%c⚠️ Suiet Wallet Users:', 'color: #F59E0B; font-weight: bold;');
  console.log('%cIf you see "unable to locate packageID" error, use Sui Wallet or Splash Wallet instead.', 'color: #F59E0B;');
  console.log('%cSuiet validates package IDs on connection, which may fail if contracts need redeployment.', 'color: #F59E0B;');
}

