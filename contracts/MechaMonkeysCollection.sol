// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import "../openzeppelin-contracts/contracts/token/ERC721/extensions/IERC721Metadata.sol";

contract MechaMonkeysCollection is ERC721 {
    // Owner of the contract with the ability to advance the `ReleasePhase`.
    // NOTE: When the owner advances the `ReleasePhase` to `ReleasePhase.COMPLETED`,
    //        the owner will not have any power to modify the contract.
    address public owner;

    // Address of the creator for paying out transaction fees.
    // NOTE: A contract can be referenced to split transactions, or do further logic.
    address public creator;

    // The three phases during the release. Each phase modifies `_baseURI` to return
    //  the next phase of the release. Only the `_creator` can modify the release phase
    //  and when `ReleasePhase.COMPLETED` is reached, `_creator` cannot modify the contract
    //  any further.
    enum ReleasePhase {
        WAITING,
        MYSTERY,
        PARTIAL,
        COMPLETED
    }
    ReleasePhase public releasePhase;

    // The URI for the current `releasePhase`.
    // NOTE: After `ReleasePhase.COMPLETED`, `currentBaseURI` cannot be modified.
    string public currentBaseURI;

    constructor(address creator_) ERC721("Mecha Monkeys", "MECHA") {
        owner = _msgSender();
        creator = creator_;

        // Initial release phase is `ReleasePhase.WAITING`
        releasePhase = ReleasePhase.WAITING;
        currentBaseURI = "https://mechamonkeys.io/index.html?tokenID=";
    }

    /**
     * @dev Advance `releasePhase` to the next pre-defined ReleasePhase.
     *       Only callable by the owner and when `ReleasePhase.COMPLETED` is reached,
     *       no further modifications to the release are allowed.
     */
    function nextReleasePhase(string memory newBaseURI_) public {
        // Only callable by `_owner`
        require(_msgSender() == owner);
        // Can only be called if not in `ReleasePhase.COMPLETED`
        require(releasePhase != ReleasePhase.COMPLETED);

        // WAITING -> MYSTERY
        if (releasePhase == ReleasePhase.WAITING) {
            releasePhase = ReleasePhase.MYSTERY;
        }
        // MYSTERY -> PARTIAL
        else if (releasePhase == ReleasePhase.MYSTERY) {
            releasePhase = ReleasePhase.PARTIAL;
        }
        // PARTIAL -> COMPLETED
        else if (releasePhase == ReleasePhase.PARTIAL) {
            releasePhase = ReleasePhase.COMPLETED;
        }

        currentBaseURI = newBaseURI_;
    }

    /**
     * @dev Base URI for computing {tokenURI}. Can change based on `releasePhase`/`currentBaseURI`.
     */
    function _baseURI()
        internal
        view
        virtual
        override(ERC721)
        returns (string memory)
    {
        return currentBaseURI;
    }
}
