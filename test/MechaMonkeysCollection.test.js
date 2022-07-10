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

    before(async () => {
        this.collection = await MechaMonkeysCollection.new(ACCOUNT_PAYOUT, ACCOUNT_ARTIST);
        console.log(Object.keys(MechaMonkeysCollection));
    });

    it('has ERC721 and IERC2981 info', async () => {

        /// ERC721 ///

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

        assert.equal(royaltyInfo_receiver, transactionPayoutAddress);
        assert.equal(royaltyInfo_royaltyAmount, exampleSalePrice / transactionFeeDenominator);
    });

    it('cannot mint during initial `WAITING` phase', async () => {
        assert.equal(MechaMonkeysCollection.ReleasePhase.WAITING, (await this.collection.releasePhase()).toString());
        await assertPromiseFails(this.collection.mint());
    });

    it('has minted the artist NFT upon contract creation', async () => {
        assert.equal(ACCOUNT_ARTIST, await this.collection.ownerOf(ARTIST_TOKEN));
    });

    it('can advance through release phases', async () => {
        /// Initial waiting phase ///
        const waitingPhase_uri = "https://mechamonkeys.io/index.html?tokenID=";
        const waitingPhase = (await this.collection.releasePhase()).toString();
        assert.equal(waitingPhase, MechaMonkeysCollection.ReleasePhase.WAITING.toString());
        assert.equal(waitingPhase_uri, (await this.collection.currentBaseURI()));

        /// Mystery phase ///
        const mysteryPhase_uri = "https://mystery/";
        await this.collection.nextReleasePhase(mysteryPhase_uri);
        const mysteryPhase = (await this.collection.releasePhase()).toString();
        assert.equal(mysteryPhase, MechaMonkeysCollection.ReleasePhase.MYSTERY.toString());
        assert.equal(mysteryPhase_uri, (await this.collection.currentBaseURI()));

        /// Partial reveal phase ///
        const partialPhase_uri = "https://partial/";
        await this.collection.nextReleasePhase(partialPhase_uri);
        const partialPhase = (await this.collection.releasePhase()).toString();
        assert.equal(partialPhase, MechaMonkeysCollection.ReleasePhase.PARTIAL.toString());
        assert.equal(partialPhase_uri, (await this.collection.currentBaseURI()));

        /// Completed reveal phase ///
        const completedPhase_uri = "https://completed/";
        await this.collection.nextReleasePhase(completedPhase_uri);
        const completedPhase = (await this.collection.releasePhase()).toString();
        assert.equal(completedPhase, MechaMonkeysCollection.ReleasePhase.COMPLETED.toString());
        assert.equal(completedPhase_uri, (await this.collection.currentBaseURI()));

        // Should not be able to progress to next phase
        await assertPromiseFails(this.collection.nextReleasePhase("https://should-fail/"));
    });

    it('can mint a token', async () => {
        const currentPhase = (await this.collection.releasePhase()).toString();
        assert.equal(currentPhase, MechaMonkeysCollection.ReleasePhase.COMPLETED);

        let initialAmountLeftToMint = (await this.collection.getAmountLeftToMint()).toNumber();
        assert.equal(9999, initialAmountLeftToMint);

        await this.collection.mint();

        let afterAmountLeftToMint = (await this.collection.getAmountLeftToMint()).toNumber();
        assert.equal(9998, afterAmountLeftToMint);
        assert.equal(1, (await this.collection.balanceOf(ACCOUNT_OWNER)).toNumber());

        let ownerOfIdOne = await this.collection.ownerOf(1);
        console.log(ownerOfIdOne);

        console.log(await this.collection.tokenURI(1));
    });

    it('same address cannot mint twice', async () => {
        const currentPhase = (await this.collection.releasePhase()).toString();
        assert.equal(currentPhase, MechaMonkeysCollection.ReleasePhase.COMPLETED);

        await assertPromiseFails(this.collection.mint());
    });
});