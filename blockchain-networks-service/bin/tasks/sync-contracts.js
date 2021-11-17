const Moralis = require('moralis/node');
const _ = require('lodash');
const log = require('../utils/logger')(module);
const { getABIData } = require('../utils/helpers');
const { factoryAbi, erc721Abi } = require('../integrations/ethers/contracts');

const lockLifetime = 1000 * 60 * 5;

module.exports = (context) => {
  context.agenda.define('sync contracts', { lockLifetime }, async (task, done) => {
    try {
      const { network, name } = task.attrs.data;
      const contractsForSave = [];
      let block_number = null;
      const networkData = context.config.blockchain.networks[network];
      const { serverUrl, appId } = context.config.blockchain.moralis[networkData.testnet ? 'testnet' : 'mainnet']
      const version = await context.db.Versioning.findOne({ name: 'sync contracts', network });

      // Initialize moralis instances
      Moralis.start({ serverUrl, appId });

      await Moralis.Cloud.run(networkData.watchFunction, {
        address: networkData.factoryAddress,
        'sync_historical': true
      });

      const {abi, topic} = getABIData(factoryAbi, 'event', 'NewContractDeployed');
      const options = {
        address: networkData.factoryAddress,
        chain: networkData.network,
        topic,
        abi,
        from_block: _.get(version, ['number'], 0)
      }

      let events = await Moralis.Web3API.native.getContractEvents(options);

      await Promise.all(_.map(events.result, async contract => {
        const nameAbi = getABIData(erc721Abi, 'function', 'name')
        const { token, owner } = contract.data
        const nameOptions = {
          chain: networkData.network,
          address: token,
          function_name: "name",
          abi: [nameAbi.abi]
        };
        const title = await Moralis.Web3API.native.runContractFunction(nameOptions);

        contractsForSave.push({
          user: owner,
          title,
          contractAddress: token,
          blockchain: networkData.network
        });

        block_number = Number(contract.block_number);

        // Listen to this contract's events
        await Moralis.Cloud.run(networkData.watchFunction, {
          address: token.toLowerCase(),
          'sync_historical': true
        });
      }))

      if (!_.isEmpty(contractsForSave)) {
        try {
          await context.db.Contract.insertMany(contractsForSave, { ordered: false });
        } catch (e) {}
      }

      if (!_.isEmpty(block_number)) {
        await context.db.Versioning.updateOne({
          name: 'sync contracts',
          network
        }, { number: block_number }, { upsert: true });
      }

      return done();
    } catch (e) {
      log.error(e);
      return done(e);
    }
  });
};
