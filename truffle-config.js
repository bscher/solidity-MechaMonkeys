module.exports = {
    networks: {
        development: {
            host: "172.19.144.1",
            port: 7545,
            network_id: "5777"
        }
    },
    compilers: {
        solc: {
            version: "^0.8",
        }
    },
    solc: {
        optimizer: {
            enabled: true,
            runs: 200
        }
    }
}