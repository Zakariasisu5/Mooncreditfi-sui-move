import { createNetworkConfig } from '@mysten/dapp-kit';

const { networkConfig } = createNetworkConfig({
  testnet: { url: 'https://fullnode.testnet.sui.io:443' },
  mainnet: { url: 'https://fullnode.mainnet.sui.io:443' },
  devnet: { url: 'https://fullnode.devnet.sui.io:443' },
});

export { networkConfig };

// Deployed package IDs on Sui Testnet - Updated with debt tracking system
export const SUI_PACKAGE_ID = '0x8853e2763099cbbd1fd5281a9823d8d76d8423a89fb8068d7c21bd4f06118088';

// Real object IDs from Sui Testnet
export const LENDING_POOL_OBJECT_ID = '0x082dab87c4c23ed818c67bafd0cd4c2b38e8b4b8668387653dbc2ee0474b1b71';
export const CREDIT_PROFILE_OBJECT_ID = '0xd8fc84c31c80f58b6ab4fc3aa153cddc232bbb745187be56da1c33ea3ee94c2a'; 

// DePIN Projects - Multiple infrastructure projects
export const DEPIN_PROJECTS = [
  { id: '0x5fb777107c23414cb548fcddb06b1c5704ef5418ad382d7bc871f279210cef6c', category: 'Solar', name: 'Solar Farm' },
  { id: '0x48d62dd05a8b9e3e4413ec042453495e50919953a1647ea3c36220d1757532c3', category: 'Telecom', name: '5G Network Infrastructure' },
  { id: '0x76c0a8f1ea50041aa68878f4dfd50ce5a2d9df65d74921eeec6e2a2a09a8bce9', category: 'IoT', name: 'IoT Sensor Network' },
  { id: '0xad4eee33f6458b24a7a4d1591ed6daa7e21daf00605da50d98ace06795ed8275', category: 'Mobility', name: 'EV Charging Stations' },
  { id: '0x1e76bfe6041bdbc1209cc781d25c97da5f39adb262e35c8cd1d9638e7c6b9c5c', category: 'WiFi', name: 'Community WiFi Hotspots' },
  { id: '0xa9e5fd5e019daa77d2ee8c59bea85098f806d35f2943887f037b0678a7d048ed', category: 'Energy Storage', name: 'Battery Storage Grid' },
];

// Legacy single project ID (kept for backward compatibility)
export const DEPIN_FINANCE_OBJECT_ID = DEPIN_PROJECTS[0].id; 

// Set to false once you have real object IDs
export const USE_DEMO_MODE = false;

export const ACTIVE_NETWORK = 'testnet';
export const EXPLORER_URL = 'https://suiscan.xyz/testnet';
