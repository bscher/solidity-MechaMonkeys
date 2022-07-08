// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import "../openzeppelin-contracts/contracts/token/ERC721/extensions/IERC721Metadata.sol";

contract MechaMonkeysCollection is ERC721 {
    // Owner of the contract with the ability to advance the `ReleasePhase`.
    // NOTE: When the owner advances the `ReleasePhase` to `ReleasePhase.COMPLETED`,
    //        the owner will NOT HAVE ANY FURTHER ABILITIES OVER THE CONTRACT.
    address public contractOwner;

    // Address to send the trade commission payouts.
    // NOTE: A contract can be referenced to split transactions, or do further logic.
    address public transactionPayoutAddress;

    // Address of the artist. This address with automatically be assigned a special token
    //  specifically for the artist.
    address public artistAddress;
    // Artist's special symbolic token (not part of official collection).
    uint256 public constant ARTIST_SPECIAL_TOKEN = 10000;

    uint256 private _nextAvailableToken = 1;
    uint256 public constant TOKEN_FIRST = 1;
    uint256 public constant TOKEN_LAST = 9999;

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

    constructor(address transactionPayoutAddress_, address artistAddress_) 
        ERC721("Mecha Monkeys", "MECHA") 
    {
        contractOwner = _msgSender();
        transactionPayoutAddress = transactionPayoutAddress_;
        artistAddress = artistAddress_;

        // Initial release phase is `ReleasePhase.WAITING`
        releasePhase = ReleasePhase.WAITING;
        // Later phases will use IPFS
        currentBaseURI = "https://mechamonkeys.io/index.html?tokenID=";

        // Mint artist's special symbolic token (not part of official collection).
        _mint(artistAddress, ARTIST_SPECIAL_TOKEN);
    }

    /**
     * @dev Public function for any address to mint only one new token.
     */
    function mint() public {
        // Each address can only mint one token each.
        require(balanceOf(_msgSender()) == 0, "MM: Each address can only mint one token each.");
        // Total minting is limited from Ids of `TOKEN_FIRST` to a max of `TOKEN_LAST`.
        require(_nextAvailableToken <= TOKEN_LAST, "MM: All tokens have been minted.");

        // Mint the next available token to the sender.
        _mint(_msgSender(), _nextAvailableToken);

        // Advance
        _nextAvailableToken = _nextAvailableToken + 1;
    }

    /**
     * @dev Advance `releasePhase` to the next pre-defined ReleasePhase.
     *       Only callable by the owner and when `ReleasePhase.COMPLETED` is reached,
     *       no further modifications to the release are allowed.
     */
    function nextReleasePhase(string memory newBaseURI_) public {
        // Only callable by `_owner`
        require(_msgSender() == contractOwner);
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

    /**
     * @dev Disallow burning of tokens.
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) 
        internal 
        virtual
        override(ERC721)
    {
        // Disallow burning
        require(to != address(0), "MM: Token cannot be burned.");

        // Only the artist can mint the artist's special token upon contract creation.
        if (
            _msgSender() == contractOwner &&
            tokenId == ARTIST_SPECIAL_TOKEN &&
            releasePhase == ReleasePhase.WAITING
        ) {
            return; //OK
        }

        // Can only transfer tokens after minting has started.
        require(
            releasePhase != ReleasePhase.WAITING,
            "MM: Transers and minting cannot occur yet."
        );
    }
}
