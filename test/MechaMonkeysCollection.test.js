const { assert } = require("chai");

const MechaMonkeysCollection = artifacts.require('./MechaMonkeysCollection.sol');

function assertNotAnEmptyAddress(address) {
    assert.notEqual(address, 0x0);
    assert.notEqual(address, '');
    assert.notEqual(address, null);
    assert.notEqual(address, undefined);
}

contract('MechaMonkeysCollection', (accounts) => {
    before(async () => {
        //this.collection = await MechaMonkeysCollection.deployed();
    });

    it('always fails', async () => {
        const collectionOwner = await this.collection.owner();
        console.log(collectionOwner);
        assert.isTrue(false);
    });
});