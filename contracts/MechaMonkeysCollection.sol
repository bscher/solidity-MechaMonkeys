// SPDX-License-Identifier: MIT
// Written by https://twitter.com/dev_mecha
pragma solidity 0.8.15;

// NFT collection
import "../openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
// NFT metadata
import "../openzeppelin-contracts/contracts/token/ERC721/extensions/IERC721Metadata.sol";
// Marketplace standard royalties
import "../openzeppelin-contracts/contracts/interfaces/IERC2981.sol";

contract MechaMonkeysCollection is ERC721, IERC2981 {
    // Owner of the contract with the ability to advance the `ReleasePhase`.
    // NOTE: When the owner advances the `ReleasePhase` to `ReleasePhase.COMPLETED`,
    //        the owner will not have any further ability to modify the release phase.
    address public contractOwner;

    // Address to send the trade commission payouts.
    // NOTE: A contract can be referenced to split transactions, or do further logic.
    address payable public transactionPayoutAddress;

    // Address of the artist. This address with automatically be assigned a special token
    //  specifically for the artist.
    address public artistAddress;

    // Iterate from 1 to 9999 (inclusive) tokens.
    uint256 public nextAvailableToken = 1;
    uint256 public constant TOKEN_FIRST = 1;
    uint256 public constant TOKEN_LAST = 9999;
    // Artist's special symbolic token (not part of official collection).
    uint256 public constant ARTIST_SPECIAL_TOKEN = 10000;

    // Fee denominator to determine the fraction of a transaction to use for payout.
    uint256 public constant TRANSACTION_FEE_DENOMINATOR = 18; // 1/18 ~= 0.0555 ~= 5.55%

    // The three phases during the release. Each phase changes what `_baseURI` returns, but each
    //  phase's URI is defined at construction of the contract. The `contractOwner` can trigger an advance
    //  to the next release phase but not the URI itself.
    //  NOTE: When `ReleasePhase.COMPLETED` is reached, `contractOwner` will no longer have any ability to
    //         modify the release phase.
    enum ReleasePhase {
        WAITING,
        MYSTERY,
        PARTIAL,
        COMPLETED
    }
    ReleasePhase public currentReleasePhase;
    string public releasePhaseURI_waiting;
    string public releasePhaseURI_mystery;
    string public releasePhaseURI_partial;
    string public releasePhaseURI_completed;

    constructor(
        address payable transactionPayoutAddress_,
        address artistAddress_,
        string memory releasePhaseURI_waiting_,
        string memory releasePhaseURI_mystery_,
        string memory releasePhaseURI_partial_,
        string memory releasePhaseURI_completed_
    ) ERC721("Mecha Monkeys", "MECHA") {
        contractOwner = _msgSender();
        transactionPayoutAddress = transactionPayoutAddress_;
        artistAddress = artistAddress_;

        // Start in release phase `ReleasePhase.WAITING`
        currentReleasePhase = ReleasePhase.WAITING;
        releasePhaseURI_waiting = releasePhaseURI_waiting_;
        releasePhaseURI_mystery = releasePhaseURI_mystery_;
        releasePhaseURI_partial = releasePhaseURI_partial_;
        releasePhaseURI_completed = releasePhaseURI_completed_;

        // Mint artist's special symbolic token (not part of official collection).
        _mint(artistAddress, ARTIST_SPECIAL_TOKEN);
    }

    /**
     * NOTE: Do NOT send Ether to this contract! It will be considered a donation.
     *       Do NOT send Tokens to this contract! They will be lost forever!
     *       This contract does not utilize received Ether by design.
     */
    receive() external payable {}

    /**
     * @dev Allow withdraw by the owner or artist.
     * NOTE: This contract should not hold any Ether except for donations.
     */
    function withdraw() public {
        // Only `contractOwner` and `artistAddress` can trigger a withdrawal.
        require(_msgSender() == contractOwner || _msgSender() == artistAddress);
        // Withdraw all Ether.
        transactionPayoutAddress.transfer(address(this).balance);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     * NOTE: ERC721 already accounted for in call to base.
     */
    function supportsInterface(bytes4 interfaceId_)
        public
        view
        virtual
        override(ERC721, IERC165)
        returns (bool)
    {
        return
            interfaceId_ == type(IERC2981).interfaceId ||
            super.supportsInterface(interfaceId_);
    }

    /**
     * @dev Public function for any address to mint only one new token.
     * NOTE: Token IDs do NOT represent rarity; each ID's token attributes will be randomized.
     */
    function mint() public {
        // Each address can only mint one token each.
        require(
            balanceOf(_msgSender()) == 0,
            "MM: Each address can only mint one token each."
        );
        // Total minting is limited from Ids of `TOKEN_FIRST` to a max of `TOKEN_LAST`.
        require(
            nextAvailableToken <= TOKEN_LAST,
            "MM: All tokens have been minted."
        );

        // Mint the next available token to the sender.
        _safeMint(_msgSender(), nextAvailableToken);

        // Advance token iterator
        nextAvailableToken += 1;
    }

    /**
     * @dev Returns the amount of tokens left to be minted.
     */
    function getAmountLeftToMint() public view returns (uint256) {
        if (nextAvailableToken > TOKEN_LAST) {
            return 0;
        } else {
            return (TOKEN_LAST + 1) - nextAvailableToken;
        }
    }

    /**
     * @dev Advance `currentReleasePhase` to the next pre-defined ReleasePhase.
     *       Only callable by the owner and when `ReleasePhase.COMPLETED` is reached,
     *       no further modifications to the release are allowed.
     */
    function nextReleasePhase() public {
        // Only callable by `_owner`
        require(_msgSender() == contractOwner);
        // Can only be called if not in `ReleasePhase.COMPLETED`
        require(currentReleasePhase != ReleasePhase.COMPLETED);

        // WAITING -> MYSTERY
        if (currentReleasePhase == ReleasePhase.WAITING) {
            currentReleasePhase = ReleasePhase.MYSTERY;
        }
        // MYSTERY -> PARTIAL
        else if (currentReleasePhase == ReleasePhase.MYSTERY) {
            currentReleasePhase = ReleasePhase.PARTIAL;
        }
        // PARTIAL -> COMPLETED
        else if (currentReleasePhase == ReleasePhase.PARTIAL) {
            currentReleasePhase = ReleasePhase.COMPLETED;
        } else {
            assert(false); // This line should never be reached.
        }
    }

    /**
     * @dev Base URI for computing {tokenURI}. Can change based on `currentReleasePhase`/`currentBaseURI`,
     *       but only until `currentReleasePhase` reaches `COMPLETED`, which then the baseURI is finalized.
     */
    function _baseURI()
        internal
        view
        virtual
        override(ERC721)
        returns (string memory)
    {
        if (currentReleasePhase == ReleasePhase.WAITING) {
            return releasePhaseURI_waiting;
        } else if (currentReleasePhase == ReleasePhase.MYSTERY) {
            return releasePhaseURI_mystery;
        } else if (currentReleasePhase == ReleasePhase.PARTIAL) {
            return releasePhaseURI_partial;
        }
        // else if (currentReleasePhase == ReleasePhase.COMPLETED)
        return releasePhaseURI_completed;
    }

    /**
     * @dev Interject before transfer to disallow burning of tokens, only allow
     *       minting of tokens after `ReleasePhase.WAITING`, and allow special permission
     *       for artist to mint a special token meant just for the artist (not part of official collection).
     */
    function _beforeTokenTransfer(
        address from_,
        address to_,
        uint256 tokenId_
    ) internal view virtual override {
        // Disallow burning
        require(to_ != address(0), "MM: Token cannot be burned.");

        // Only the artist can mint the artist's special token upon contract creation.
        if (
            _msgSender() == contractOwner &&
            tokenId_ == ARTIST_SPECIAL_TOKEN &&
            currentReleasePhase == ReleasePhase.WAITING
        ) {
            return; //OK
        }

        // Can only transfer tokens after minting has started.
        require(
            currentReleasePhase != ReleasePhase.WAITING,
            "MM: Transfers and minting cannot occur yet."
        );
    }

    /**
     * @dev Disallow token burning.
     * NOTE: This function is never called, but disable just in case, and to be verbose.
     */
    function _burn(uint256 tokenId_) internal virtual override {
        require(false, "MM: Token cannot be burned.");
    }

    /**
     * @dev Returns how much royalty is owed and to whom, based on a sale price that may be denominated in any unit of
     * exchange. The royalty amount is denominated and should be paid in that same unit of exchange.
     * NOTE: All `tokenId`s have the same royalty ratio.
     */
    function royaltyInfo(uint256 tokenId_, uint256 salePrice_)
        external
        view
        override(IERC2981)
        returns (address, uint256)
    {
        address receiver = transactionPayoutAddress;
        uint256 royaltyAmount = salePrice_ / TRANSACTION_FEE_DENOMINATOR;

        return (receiver, royaltyAmount);
    }
}
