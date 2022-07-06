var MechaMonkeysCollection = artifacts.require("./MechaMonkeysCollection.sol");

module.exports = function (deployer, _, accounts) {
    deployer.deploy(MechaMonkeysCollection, accounts[1]);
};