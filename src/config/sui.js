import { createNetworkConfig } from '@mysten/dapp-kit';

const { networkConfig } = createNetworkConfig({
  testnet: { url: 'https://fullnode.testnet.sui.io:443' },
  mainnet: { url: 'https://fullnode.mainnet.sui.io:443' },
  devnet: { url: 'https://fullnode.devnet.sui.io:443' },
});

export { networkConfig };

// Deployed package IDs on Sui Testnet - Updated with Balance-based pool
export const SUI_PACKAGE_ID = '0xb059616029897f6436640d7c254bcc6130f157c3677bda4eaaccf9f60014fe03';

// Real object IDs from Sui Testnet
export const LENDING_POOL_OBJECT_ID = '0xdad7cc0f93773267022f8b94afab3743ba1f40214a049e8b64822c0dcbc80a1a';
export const CREDIT_PROFILE_OBJECT_ID = '0x7332d82055668698dfb76c0f25a4da244a99d1e31af30ed0e8e2d9c3cb493ba2'; 
export const DEPIN_FINANCE_OBJECT_ID = '0x3ac9433c7bbdce85254a5b0cad3be5f98fb656de63c4308b0f8c4b59a04fff53'; 

// Set to false once you have real object IDs
export const USE_DEMO_MODE = false;

export const ACTIVE_NETWORK = 'testnet';
export const EXPLORER_URL = 'https://suiscan.xyz/testnet';
