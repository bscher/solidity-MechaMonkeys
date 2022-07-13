const { assert } = require("chai");

const MechaMonkeysCollection = artifacts.require('./MechaMonkeysCollection.sol');

function assertNotAnEmptyAddress(address) {
    assert.notEqual(address, 0x0);
    assert.notEqual(address, '');
    assert.notEqual(address, null);
    assert.notEqual(address, undefined);
}

async function assertPromiseFails(promise) {
    try {
        await promise;
    } catch (error) {
        return; //OK
    }
    assert.fail("Expected promise to throw an error!");
}

contract('MechaMonkeysCollection', (accounts) => {

    const ACCOUNT_OWNER = accounts[0];
    const ACCOUNT_PAYOUT = accounts[1];
    const ACCOUNT_ARTIST = accounts[2];

    const FIRST_TOKEN = 1;
    const LAST_TOKEN = 9999;
    const ARTIST_TOKEN = 10000;

    const PAYOUT_DENOMINATOR = 18;

    const WAITINGPHASE_URI = "https://waiting/?id=";
    const MYSTERYPHASE_URI = "https://mystery/?id=";
    const PARTIALPHASE_URI = "https://partial/?id=";
    const COMPLETEDPHASE_URI = "https://completed/?id=";

    before(async () => {
        this.collection = await MechaMonkeysCollection.new(
            ACCOUNT_PAYOUT,
            ACCOUNT_ARTIST,
            WAITINGPHASE_URI,
            MYSTERYPHASE_URI,
            PARTIALPHASE_URI,
            COMPLETEDPHASE_URI
        );
        console.log(Object.keys(MechaMonkeysCollection));
    });

    it('has expected public info', async () => {

        const contractOwner = await this.collection.contractOwner();
        console.log("contractOwner: " + contractOwner);
        assertNotAnEmptyAddress(contractOwner);
        assert.equal(ACCOUNT_OWNER, contractOwner);

        const transactionPayoutAddress = await this.collection.transactionPayoutAddress();
        console.log("transactionPayoutAddress: " + transactionPayoutAddress);
        assertNotAnEmptyAddress(transactionPayoutAddress);
        assert.equal(ACCOUNT_PAYOUT, transactionPayoutAddress);

        const artistAddress = await this.collection.artistAddress();
        console.log("artistAddress: " + artistAddress);
        assertNotAnEmptyAddress(artistAddress);
        assert.equal(ACCOUNT_ARTIST, artistAddress);

        assert.equal(FIRST_TOKEN, (await this.collection.TOKEN_FIRST()).toNumber());
        assert.equal(LAST_TOKEN, (await this.collection.TOKEN_LAST()).toNumber());
        assert.equal(ARTIST_TOKEN, (await this.collection.ARTIST_SPECIAL_TOKEN()).toNumber());


        assert.equal(WAITINGPHASE_URI, (await this.collection.releasePhaseURI_waiting()));
        assert.equal(MYSTERYPHASE_URI, (await this.collection.releasePhaseURI_mystery()));
        assert.equal(PARTIALPHASE_URI, (await this.collection.releasePhaseURI_partial()));
        assert.equal(COMPLETEDPHASE_URI, (await this.collection.releasePhaseURI_completed()));
    });

    it('has ERC721 and IERC2981 info', async () => {

        /// ERC721 ///

        const collectionName = await this.collection.name();
        assert.equal(collectionName, "Mecha Monkeys");
        const collectionSymbol = await this.collection.symbol();
        assert.equal(collectionSymbol, "MECHA");

        /// IERC2981 ///

        const transactionFeeDenominator = (await this.collection.TRANSACTION_FEE_DENOMINATOR()).toNumber();
        assert.equal(PAYOUT_DENOMINATOR, transactionFeeDenominator);

        const exampleSalePrice = 36000;
        const royaltyInfo = await this.collection.royaltyInfo(1, exampleSalePrice);
        const royaltyInfo_receiver = royaltyInfo[0];
        const royaltyInfo_royaltyAmount = royaltyInfo[1].toNumber();

        assert.equal(royaltyInfo_receiver, (await this.collection.transactionPayoutAddress()));
        assert.equal(royaltyInfo_royaltyAmount, exampleSalePrice / transactionFeeDenominator);
    });

    it('cannot mint during initial `WAITING` phase', async () => {
        assert.equal(MechaMonkeysCollection.ReleasePhase.WAITING, (await this.collection.currentReleasePhase()).toString());
        await assertPromiseFails(this.collection.mint());
    });

    it('has minted the artist NFT upon contract creation', async () => {
        assert.equal(MechaMonkeysCollection.ReleasePhase.WAITING, (await this.collection.currentReleasePhase()).toString());
        assert.equal(ACCOUNT_ARTIST, await this.collection.ownerOf(ARTIST_TOKEN));
    });

    it('can advance through release phases', async () => {
        /// Initial waiting phase ///
        const waitingPhase = (await this.collection.currentReleasePhase()).toString();
        assert.equal(waitingPhase, MechaMonkeysCollection.ReleasePhase.WAITING.toString());
        assert.equal(WAITINGPHASE_URI + ARTIST_TOKEN, (await this.collection.tokenURI(ARTIST_TOKEN)));

        /// Mystery phase ///
        await this.collection.nextReleasePhase();
        const mysteryPhase = (await this.collection.currentReleasePhase()).toString();
        assert.equal(mysteryPhase, MechaMonkeysCollection.ReleasePhase.MYSTERY.toString());
        assert.equal(MYSTERYPHASE_URI + ARTIST_TOKEN, (await this.collection.tokenURI(ARTIST_TOKEN)));

        /// Partial reveal phase ///
        await this.collection.nextReleasePhase();
        const partialPhase = (await this.collection.currentReleasePhase()).toString();
        assert.equal(partialPhase, MechaMonkeysCollection.ReleasePhase.PARTIAL.toString());
        assert.equal(PARTIALPHASE_URI + ARTIST_TOKEN, (await this.collection.tokenURI(ARTIST_TOKEN)));

        /// Completed reveal phase ///
        await this.collection.nextReleasePhase();
        const completedPhase = (await this.collection.currentReleasePhase()).toString();
        assert.equal(completedPhase, MechaMonkeysCollection.ReleasePhase.COMPLETED.toString());
        assert.equal(COMPLETEDPHASE_URI + ARTIST_TOKEN, (await this.collection.tokenURI(ARTIST_TOKEN)));

        // Should not be able to progress to next phase
        await assertPromiseFails(this.collection.nextReleasePhase());
    });

    it('can mint a token', async () => {
        const currentPhase = (await this.collection.currentReleasePhase()).toString();
        assert.equal(currentPhase, MechaMonkeysCollection.ReleasePhase.COMPLETED);

        let initialAmountLeftToMint = (await this.collection.getAmountLeftToMint()).toNumber();
        assert.equal(9999, initialAmountLeftToMint);

        await this.collection.mint();

        let afterAmountLeftToMint = (await this.collection.getAmountLeftToMint()).toNumber();
        assert.equal(9998, afterAmountLeftToMint);
        assert.equal(1, (await this.collection.balanceOf(ACCOUNT_OWNER)).toNumber());

        assert.equal(ACCOUNT_OWNER, await this.collection.ownerOf(1));
    });

    it('same address cannot mint twice', async () => {
        const currentPhase = (await this.collection.currentReleasePhase()).toString();
        assert.equal(currentPhase, MechaMonkeysCollection.ReleasePhase.COMPLETED);

        await assertPromiseFails(this.collection.mint());
    });

    it('owner can transfer token to another user', async () => {
        const currentPhase = (await this.collection.currentReleasePhase()).toString();
        assert.equal(currentPhase, MechaMonkeysCollection.ReleasePhase.COMPLETED);

        assert.equal(accounts[0], (await this.collection.ownerOf(1)));

        // Transfer token 1 from ACCOUNT_OWNER to account[1]
        await this.collection.safeTransferFrom(ACCOUNT_OWNER, accounts[1], 1);

        assert.equal(accounts[1], (await this.collection.ownerOf(1)));
    });

    it('non-owner cannot transfer token to another user', async () => {
        const currentPhase = (await this.collection.currentReleasePhase()).toString();
        assert.equal(currentPhase, MechaMonkeysCollection.ReleasePhase.COMPLETED);

        // account[1] owns id:1
        assert.equal(accounts[1], (await this.collection.ownerOf(1)));

        // Attempt to transfer token 1 even though accounts[0] does not own it
        await assertPromiseFails(this.collection.safeTransferFrom(ACCOUNT_OWNER, accounts[1], 1));

        // account[1] still owns id:1
        assert.equal(accounts[1], (await this.collection.ownerOf(1)));
    });
});