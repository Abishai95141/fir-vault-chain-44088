// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title FIRContract
 * @dev Smart contract for storing First Information Report (FIR) records on blockchain
 */
contract FIRContract {
    enum FIRStatus { Pending, UnderInvestigation, Closed }
    
    struct FIR {
        string dataCID;
        bytes32 dataHash;
        FIRStatus status;
        uint256 timestamp;
        address submitter;
        bool exists;
    }
    
    mapping(string => FIR) private firs;
    
    event FIRSubmitted(
        string indexed firId,
        string dataCID,
        address indexed submitter
    );
    
    event FIRStatusUpdated(
        string indexed firId,
        FIRStatus status
    );
    
    /**
     * @dev Submit a new FIR to the blockchain
     * @param _firId Unique identifier for the FIR
     * @param _dataCID IPFS CID containing the FIR data
     * @param _dataHash Hash of the FIR data for integrity verification
     */
    function submitFIR(
        string memory _firId,
        string memory _dataCID,
        bytes32 _dataHash
    ) public {
        require(!firs[_firId].exists, "FIR already exists");
        require(bytes(_firId).length > 0, "FIR ID cannot be empty");
        require(bytes(_dataCID).length > 0, "Data CID cannot be empty");
        
        firs[_firId] = FIR({
            dataCID: _dataCID,
            dataHash: _dataHash,
            status: FIRStatus.Pending,
            timestamp: block.timestamp,
            submitter: msg.sender,
            exists: true
        });
        
        emit FIRSubmitted(_firId, _dataCID, msg.sender);
    }
    
    /**
     * @dev Update the status of an existing FIR
     * @param _firId The FIR identifier
     * @param _status New status value (0: Pending, 1: UnderInvestigation, 2: Closed)
     */
    function updateFIRStatus(
        string memory _firId,
        uint8 _status
    ) public {
        require(firs[_firId].exists, "FIR does not exist");
        require(_status <= uint8(FIRStatus.Closed), "Invalid status");
        
        firs[_firId].status = FIRStatus(_status);
        
        emit FIRStatusUpdated(_firId, FIRStatus(_status));
    }
    
    /**
     * @dev Retrieve FIR details
     * @param _firId The FIR identifier
     * @return dataCID IPFS content identifier
     * @return dataHash Hash of the data
     * @return status Current status
     * @return timestamp Submission timestamp
     * @return submitter Address that submitted the FIR
     */
    function getFIR(string memory _firId) public view returns (
        string memory dataCID,
        bytes32 dataHash,
        uint8 status,
        uint256 timestamp,
        address submitter
    ) {
        require(firs[_firId].exists, "FIR does not exist");
        
        FIR memory fir = firs[_firId];
        return (
            fir.dataCID,
            fir.dataHash,
            uint8(fir.status),
            fir.timestamp,
            fir.submitter
        );
    }
}
