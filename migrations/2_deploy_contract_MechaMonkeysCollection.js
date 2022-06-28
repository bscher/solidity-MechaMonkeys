var MechaMonkeysCollection = artifacts.require("./MechaMonkeysCollection.sol");

module.exports = function (deployer) {
    deployer.deploy(MechaMonkeysCollection);
};