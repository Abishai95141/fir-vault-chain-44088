# FIR Smart Contract Deployment Guide

## Prerequisites
1. MetaMask wallet installed
2. POL tokens on Polygon Amoy testnet (get from [Polygon Faucet](https://faucet.polygon.technology/))
3. Remix IDE access (https://remix.ethereum.org/)

## Deployment Steps

### Option 1: Using Remix IDE (Recommended for Quick Deployment)

1. **Open Remix IDE**
   - Go to https://remix.ethereum.org/

2. **Create the Contract**
   - In the file explorer, create a new file: `FIRContract.sol`
   - Copy the entire content from `contracts/FIRContract.sol` into it

3. **Compile the Contract**
   - Go to the "Solidity Compiler" tab (left sidebar)
   - Select compiler version: `0.8.0` or higher
   - Click "Compile FIRContract.sol"
   - Ensure no errors appear

4. **Deploy to Polygon Amoy**
   - Go to "Deploy & Run Transactions" tab
   - Environment: Select "Injected Provider - MetaMask"
   - MetaMask will prompt - connect your wallet
   - In MetaMask, ensure you're on "Polygon Amoy Testnet"
   - Click "Deploy" button
   - Confirm the transaction in MetaMask
   - Wait for deployment confirmation

5. **Get Contract Address**
   - After deployment, you'll see the contract in "Deployed Contracts" section
   - Copy the contract address (starts with 0x...)
   - Update `FIR_CONTRACT_ADDRESS` in `src/lib/web3-utils.ts` with this address

### Option 2: Using Hardhat (For Advanced Users)

1. **Install Dependencies**
   ```bash
   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
   npx hardhat init
   ```

2. **Configure Hardhat**
   - Create `hardhat.config.js`:
   ```javascript
   require("@nomicfoundation/hardhat-toolbox");
   
   module.exports = {
     solidity: "0.8.0",
     networks: {
       amoy: {
         url: "https://rpc-amoy.polygon.technology/",
         accounts: ["YOUR_PRIVATE_KEY"] // Never commit this!
       }
     }
   };
   ```

3. **Deploy**
   ```bash
   npx hardhat run scripts/deploy.js --network amoy
   ```

## After Deployment

1. Update the contract address in `src/lib/web3-utils.ts`:
   ```typescript
   export const FIR_CONTRACT_ADDRESS = 'YOUR_NEW_CONTRACT_ADDRESS';
   ```

2. Verify the contract on PolygonScan (optional):
   - Go to https://amoy.polygonscan.com/
   - Search for your contract address
   - Click "Verify and Publish"
   - Select "Solidity (Single file)"
   - Paste your contract code

## Testing

After deployment, test the contract by:
1. Submitting a test FIR through your app
2. Checking the transaction on PolygonScan
3. Verifying the FIR data is stored correctly

## Network Details

- **Network Name**: Polygon Amoy
- **RPC URL**: https://rpc-amoy.polygon.technology/
- **Chain ID**: 80002 (0x13882)
- **Currency**: POL
- **Block Explorer**: https://amoy.polygonscan.com
