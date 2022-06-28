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
        this.splitter = await MechaMonkeysCollection.deployed();
    });

    it('always fails', async () => {
        assert.isTrue(false);
    });
});