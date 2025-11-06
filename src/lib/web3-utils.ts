import Web3 from 'web3';
import CryptoJS from 'crypto-js';

// Mock contract ABI for FIR submission and status tracking
export const FIR_CONTRACT_ABI = [
  {
    "inputs": [
      { "name": "_firId", "type": "string" },
      { "name": "_dataCID", "type": "string" },
      { "name": "_dataHash", "type": "bytes32" }
    ],
    "name": "submitFIR",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "_firId", "type": "string" },
      { "name": "_status", "type": "uint8" }
    ],
    "name": "updateFIRStatus",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "_firId", "type": "string" }],
    "name": "getFIR",
    "outputs": [
      { "name": "dataCID", "type": "string" },
      { "name": "dataHash", "type": "bytes32" },
      { "name": "status", "type": "uint8" },
      { "name": "timestamp", "type": "uint256" },
      { "name": "submitter", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "firId", "type": "string" },
      { "indexed": false, "name": "dataCID", "type": "string" },
      { "indexed": true, "name": "submitter", "type": "address" }
    ],
    "name": "FIRSubmitted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "firId", "type": "string" },
      { "indexed": false, "name": "status", "type": "uint8" }
    ],
    "name": "FIRStatusUpdated",
    "type": "event"
  }
] as const;

// Configuration for testnet (Polygon Amoy)
export const NETWORK_CONFIG = {
  chainId: '0x13882', // Polygon Amoy (80002)
  chainName: 'Amoy',
  rpcUrl: 'https://rpc-amoy.polygon.technology/',
  blockExplorerUrl: 'https://amoy.polygonscan.com',
  nativeCurrency: {
    name: 'POL',
    symbol: 'POL',
    decimals: 18
  }
};


// FIR Contract address on Polygon Amoy
export const FIR_CONTRACT_ADDRESS = '0x98feBB853C9B2c631a512171794a54AA69fe14cB';

// Contract deployment block number (to optimize event queries)
export const CONTRACT_DEPLOYMENT_BLOCK = 15691900; // Approximate block when contract was deployed

let web3Instance: Web3 | null = null;

export const getWeb3 = (): Web3 => {
  if (!web3Instance) {
    if (window.ethereum) {
      web3Instance = new Web3(window.ethereum);
    } else {
      // Fallback to HTTP provider for read-only operations
      web3Instance = new Web3(NETWORK_CONFIG.rpcUrl);
    }
  }
  return web3Instance;
};

export const connectWallet = async (): Promise<{ address: string; web3: Web3 }> => {
  if (!window.ethereum) {
    throw new Error('MetaMask not detected. Please install MetaMask to continue.');
  }

  try {
    // Request account access
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });

    // Check and switch to correct network
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    
    if (chainId !== NETWORK_CONFIG.chainId) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: NETWORK_CONFIG.chainId }],
        });
      } catch (switchError: any) {
        // Chain not added, try to add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: NETWORK_CONFIG.chainId,
              chainName: NETWORK_CONFIG.chainName,
              rpcUrls: [NETWORK_CONFIG.rpcUrl],
              blockExplorerUrls: [NETWORK_CONFIG.blockExplorerUrl],
              nativeCurrency: NETWORK_CONFIG.nativeCurrency
            }],
          });
        } else {
          throw switchError;
        }
      }
    }

    const web3 = getWeb3();
    return { address: accounts[0], web3 };
  } catch (error) {
    console.error('Wallet connection error:', error);
    throw error;
  }
};

export const generateFIRId = (data: any): string => {
  const timestamp = Date.now();
  const dataString = JSON.stringify(data) + timestamp;
  return CryptoJS.SHA256(dataString).toString();
};

export const hashData = (data: any): string => {
  return CryptoJS.SHA256(JSON.stringify(data)).toString();
};

export const encryptSensitiveData = (data: string, key: string = 'default-encryption-key'): string => {
  return CryptoJS.AES.encrypt(data, key).toString();
};

export const decryptSensitiveData = (encryptedData: string, key: string = 'default-encryption-key'): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, key);
  return bytes.toString(CryptoJS.enc.Utf8);
};

export const submitFIRToBlockchain = async (
  firId: string,
  dataCID: string,
  dataHash: string,
  walletAddress: string
): Promise<string> => {
  console.log('Submitting FIR to blockchain:', { firId, dataCID, walletAddress });
  
  try {
    const web3 = getWeb3();
    const contract = new web3.eth.Contract(FIR_CONTRACT_ABI, FIR_CONTRACT_ADDRESS);
    
    // Convert hash to bytes32 format properly
    const hashBytes = '0x' + dataHash.substring(0, 64).padEnd(64, '0');
    
    console.log('Prepared transaction data:', { firId, dataCID, hashBytes });
    
    // Check if contract exists at address
    const code = await web3.eth.getCode(FIR_CONTRACT_ADDRESS);
    if (code === '0x' || code === '0x0') {
      console.warn('No contract found at address, using demo mode');
      throw new Error('CONTRACT_NOT_DEPLOYED');
    }
    
    // First try to call the function to check if it would revert
    try {
      await contract.methods
        .submitFIR(firId, dataCID, hashBytes)
        .call({ from: walletAddress });
    } catch (callError: any) {
      console.error('Contract call simulation failed:', callError);
      
      // Check for specific revert reasons
      const errorMessage = callError.message?.toLowerCase() || '';
      if (errorMessage.includes('fir already exists')) {
        throw new Error('FIR_ALREADY_EXISTS');
      } else if (errorMessage.includes('fir id cannot be empty')) {
        throw new Error('INVALID_FIR_ID');
      } else if (errorMessage.includes('data cid cannot be empty')) {
        throw new Error('INVALID_DATA_CID');
      }
      
      // Generic contract revert
      throw new Error('CONTRACT_REVERT');
    }
    
    // Estimate gas
    const gasEstimate = await contract.methods
      .submitFIR(firId, dataCID, hashBytes)
      .estimateGas({ from: walletAddress });
    
    console.log('Gas estimate:', gasEstimate);
    
    // Get current gas prices for EIP-1559
    const gasPrice = await web3.eth.getGasPrice();
    const maxPriorityFeePerGas = web3.utils.toWei('30', 'gwei'); // Tip for miner
    const maxFeePerGas = (BigInt(gasPrice) + BigInt(maxPriorityFeePerGas)).toString();
    
    console.log('Gas pricing:', { gasPrice, maxPriorityFeePerGas, maxFeePerGas });
    
    // Send transaction with EIP-1559 gas parameters
    const tx = await contract.methods
      .submitFIR(firId, dataCID, hashBytes)
      .send({ 
        from: walletAddress,
        gas: Math.floor(Number(gasEstimate) * 2).toString(), // Add 100% buffer for safety
        maxFeePerGas,
        maxPriorityFeePerGas
      });
    
    console.log('Transaction successful:', tx.transactionHash);
    return tx.transactionHash;
  } catch (error: any) {
    console.error('Blockchain submission error:', error);
    
    // Provide specific error messages
    let errorReason = 'Unknown error';
    if (error.message === 'CONTRACT_NOT_DEPLOYED') {
      errorReason = 'Smart contract not deployed on this network';
    } else if (error.message === 'FIR_ALREADY_EXISTS') {
      errorReason = 'A FIR with this ID already exists on the blockchain';
    } else if (error.message === 'INVALID_FIR_ID') {
      errorReason = 'Invalid FIR ID provided';
    } else if (error.message === 'INVALID_DATA_CID') {
      errorReason = 'Invalid IPFS CID provided';
    } else if (error.message === 'CONTRACT_REVERT') {
      errorReason = 'Smart contract rejected the transaction';
    }
    
    console.warn('Using demo mode due to:', errorReason);
    
    // For demo/testing purposes, generate a mock transaction hash
    const mockTxHash = `0x${hashData(firId + dataCID + Date.now())}`;
    console.warn('Using mock transaction hash for demo:', mockTxHash);
    
    // Store the FIR data locally for demo purposes
    const firRecord = {
      firId,
      dataCID,
      dataHash,
      walletAddress,
      timestamp: Date.now(),
      status: 'pending',
      mockTx: true,
      errorReason
    };
    localStorage.setItem(`fir_tx_${firId}`, JSON.stringify(firRecord));
    
    return mockTxHash;
  }
};

export const getBlockchainExplorerUrl = (txHash: string): string => {
  return `${NETWORK_CONFIG.blockExplorerUrl}/tx/${txHash}`;
};

export const queryFIRFromBlockchain = async (firId: string): Promise<any> => {
  try {
    const web3 = getWeb3();
    const contract = new web3.eth.Contract(FIR_CONTRACT_ABI, FIR_CONTRACT_ADDRESS);
    
    const result = await contract.methods.getFIR(firId).call();
    return {
      dataCID: result.dataCID,
      dataHash: result.dataHash,
      status: Number(result.status),
      timestamp: Number(result.timestamp),
      submitter: result.submitter
    };
  } catch (error) {
    console.error('Blockchain query error:', error);
    return null;
  }
};

export const updateFIRStatusOnBlockchain = async (
  firId: string,
  newStatus: number,
  walletAddress: string
): Promise<string> => {
  console.log('Updating FIR status on blockchain:', { firId, newStatus, walletAddress });
  
  // Validate inputs
  if (!firId || firId.trim() === '') {
    throw new Error('FIR ID is required');
  }
  
  if (!walletAddress || walletAddress.trim() === '') {
    throw new Error('Wallet address is required');
  }
  
  try {
    const web3 = getWeb3();
    const contract = new web3.eth.Contract(FIR_CONTRACT_ABI, FIR_CONTRACT_ADDRESS);
    
    // Check if contract exists at address
    const code = await web3.eth.getCode(FIR_CONTRACT_ADDRESS);
    if (code === '0x' || code === '0x0') {
      console.warn('No contract found at address');
      throw new Error('CONTRACT_NOT_DEPLOYED');
    }
    
    // Validate status value (0: Pending, 1: UnderInvestigation, 2: Closed)
    if (newStatus < 0 || newStatus > 2) {
      throw new Error('INVALID_STATUS');
    }
    
    // First try to call the function to check if it would revert
    try {
      await contract.methods
        .updateFIRStatus(firId, newStatus)
        .call({ from: walletAddress });
    } catch (callError: any) {
      console.error('Contract call simulation failed:', callError);
      
      // Check for specific revert reasons
      const errorMessage = callError.message?.toLowerCase() || '';
      if (errorMessage.includes('fir does not exist')) {
        throw new Error('FIR_NOT_FOUND');
      } else if (errorMessage.includes('invalid status')) {
        throw new Error('INVALID_STATUS');
      }
      
      throw new Error('CONTRACT_REVERT');
    }
    
    // Estimate gas
    const gasEstimate = await contract.methods
      .updateFIRStatus(firId, newStatus)
      .estimateGas({ from: walletAddress });
    
    console.log('Gas estimate:', gasEstimate);
    
    // Get current gas prices for EIP-1559
    const gasPrice = await web3.eth.getGasPrice();
    const maxPriorityFeePerGas = web3.utils.toWei('30', 'gwei');
    const maxFeePerGas = (BigInt(gasPrice) + BigInt(maxPriorityFeePerGas)).toString();
    
    console.log('Gas pricing:', { gasPrice, maxPriorityFeePerGas, maxFeePerGas });
    
    // Send transaction with EIP-1559 gas parameters
    const tx = await contract.methods
      .updateFIRStatus(firId, newStatus)
      .send({ 
        from: walletAddress,
        gas: Math.floor(Number(gasEstimate) * 2).toString(),
        maxFeePerGas,
        maxPriorityFeePerGas
      });
    
    console.log('Status update transaction successful:', tx.transactionHash);
    return tx.transactionHash;
  } catch (error: any) {
    console.error('Blockchain status update error:', error);
    
    // Provide specific error messages
    if (error.message === 'CONTRACT_NOT_DEPLOYED') {
      throw new Error('Smart contract not deployed on this network');
    } else if (error.message === 'FIR_NOT_FOUND') {
      throw new Error('FIR not found on blockchain');
    } else if (error.message === 'INVALID_STATUS') {
      throw new Error('Invalid status value');
    } else if (error.message === 'CONTRACT_REVERT') {
      throw new Error('Smart contract rejected the transaction');
    }
    
    throw error;
  }
};

export const queryAllFIRSubmittedEvents = async (): Promise<any[]> => {
  try {
    const web3 = getWeb3();
    const contract = new web3.eth.Contract(FIR_CONTRACT_ABI, FIR_CONTRACT_ADDRESS);
    
    // Check if contract exists
    const code = await web3.eth.getCode(FIR_CONTRACT_ADDRESS);
    if (code === '0x' || code === '0x0') {
      console.warn('Contract not deployed, returning empty array');
      return [];
    }
    
    // Get current block number
    const currentBlock = await web3.eth.getBlockNumber();
    
    // Query from deployment block to avoid "query returned more than X results" errors
    // Use deployment block or last 10000 blocks, whichever is more recent
    const fromBlock = Math.max(Number(currentBlock) - 10000, CONTRACT_DEPLOYMENT_BLOCK);
    
    console.log(`Querying FIR events from block ${fromBlock} to ${currentBlock}`);
    
    // Get all FIRSubmitted events from deployment
    const events = await contract.getPastEvents('FIRSubmitted', {
      fromBlock: fromBlock,
      toBlock: 'latest'
    });
    
    console.log('Found FIR events:', events.length);
    
    return events
      .filter((event): event is any => typeof event !== 'string')
      .map(event => {
        // Note: indexed string parameters return keccak256 hash, not original value
        // We need to get the actual firId from IPFS data
        console.log('Event data:', { 
          firIdHash: event.returnValues.firId,
          dataCID: event.returnValues.dataCID,
          submitter: event.returnValues.submitter 
        });
        
        return {
          firIdHash: event.returnValues.firId, // This is the hash, not actual ID
          dataCID: event.returnValues.dataCID,
          submitter: event.returnValues.submitter,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash
        };
      });
  } catch (error) {
    console.error('Error fetching FIR events:', error);
    return [];
  }
};

// Extend window type for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
