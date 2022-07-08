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
        assert.fail("Expected promise to throw an error!");
    } catch (error) {
        // OK
    }
}

contract('MechaMonkeysCollection', (accounts) => {
    before(async () => {
        this.collection = await MechaMonkeysCollection.new(accounts[1]);
        console.log(Object.keys(MechaMonkeysCollection));
    });

    it('has ERC721 info', async () => {
        const contractOwner = await this.collection.contractOwner();
        console.log(contractOwner);
        assertNotAnEmptyAddress(contractOwner);

        const transactionPayoutAddress = await this.collection.transactionPayoutAddress();
        console.log(transactionPayoutAddress);
        assertNotAnEmptyAddress(transactionPayoutAddress);

        const artistAddress = await this.collection.artistAddress();
        console.log(artistAddress);
        assertNotAnEmptyAddress(artistAddress);

        assert.equal(1, await this.collection.TOKEN_LAST());
        assert.equal(9999, await this.collection.TOKEN_FIRST());
        assert.equal(10000, await this.collection.ARTIST_SPECIAL_TOKEN());

        const collectionName = await this.collection.name();
        assert.equal(collectionName, "Mecha Monkeys");
        const collectionSymbol = await this.collection.symbol();
        assert.equal(collectionSymbol, "MECHA");
    });

    it('can advance through release phases', async () => {
        /// Initial waiting phase ///
        const waitingPhase_uri = "https://mechamonkeys.io/index.html?tokenID=";
        const waitingPhase = (await this.collection.releasePhase()).toString();
        assert.equal(waitingPhase, MechaMonkeysCollection.ReleasePhase.WAITING.toString());
        assert.equal(waitingPhase_uri, (await this.collection.currentBaseURI()));
        // Verify artist was minted the special token
        //(await this.collection.ownerOf())

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
        await assertPromiseFails(this.collection.nextReleasePhase("should fail"));
    });
});