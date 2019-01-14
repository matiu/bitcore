'use strict';

var _ = require('lodash');
var util = require('util');
var log = require('npmlog');
const Stealth = require('bitcore-stealth');
var $ = require('preconditions').singleton();
var Uuid = require('uuid');

var Address = require('./address');
var Copayer = require('./copayer');
var StealthAddress = require('./stealthaddress');
var AddressManager = require('./addressmanager');
var Bitcore = {
  'btc': require('bitcore-lib'),
  'bch': require('bitcore-lib-cash'),
};

var config = require('../../config');
var Common = require('../common');
var Constants = Common.Constants,
  Defaults = Common.Defaults,
  Utils = Common.Utils;

function Wallet() {};

Wallet.create = function(opts) {
  opts = opts || {};

  var x = new Wallet();

  $.shouldBeNumber(opts.m);
  $.shouldBeNumber(opts.n);
  $.checkArgument(Utils.checkValueInCollection(opts.coin, Constants.COINS));
  $.checkArgument(Utils.checkValueInCollection(opts.network, Constants.NETWORKS));

  x.version = '1.0.0';
  x.createdOn = Math.floor(Date.now() / 1000);
  x.id = opts.id || Uuid.v4();
  x.name = opts.name;
  x.m = opts.m;
  x.n = opts.n;
  x.singleAddress = !!opts.singleAddress;
  x.status = 'pending';
  x.publicKeyRing = [];
  x.addressIndex = 0;
  x.copayers = [];
  x.pubKey = opts.pubKey;
  x.coin = opts.coin;
  x.network = opts.network;
  x.derivationStrategy = opts.derivationStrategy || Constants.DERIVATION_STRATEGIES.BIP45;
  x.addressType = opts.addressType || Constants.SCRIPT_TYPES.P2SH;

  x.addressManager = AddressManager.create({
    derivationStrategy: x.derivationStrategy,
  });
  x.scanStatus = null;


  // v8 related
  x.beRegistered = false; // Block explorer registered
  x.beAuthPrivateKey2 = null; 
  x.beAuthPublicKey2 = null; 

  // x.nativeCashAddr opts is only for testing
  x.nativeCashAddr = _.isUndefined(opts.nativeCashAddr) ? (x.coin == 'bch' ? true : null) : opts.nativeCashAddr;

  x.stealth = null; 

  return x;
};

Wallet.fromObj = function(obj) {
  var x = new Wallet();

  $.shouldBeNumber(obj.m);
  $.shouldBeNumber(obj.n);

  x.version = obj.version;
  x.createdOn = obj.createdOn;
  x.id = obj.id;
  x.name = obj.name;
  x.m = obj.m;
  x.n = obj.n;
  x.singleAddress = !!obj.singleAddress;
  x.status = obj.status;
  x.publicKeyRing = obj.publicKeyRing;
  x.copayers = _.map(obj.copayers, function(copayer) {
    return Copayer.fromObj(copayer);
  });
  x.pubKey = obj.pubKey;
  x.coin = obj.coin || Defaults.COIN;
  x.network = obj.network;
  if (!x.network) {
    x.network = obj.isTestnet ? 'testnet' : 'livenet';
  }
  x.derivationStrategy = obj.derivationStrategy || Constants.DERIVATION_STRATEGIES.BIP45;
  x.addressType = obj.addressType || Constants.SCRIPT_TYPES.P2SH;
  x.addressManager = AddressManager.fromObj(obj.addressManager);
  x.scanStatus = obj.scanStatus;
  x.beRegistered = obj.beRegistered;
  x.beAuthPrivateKey2 = obj.beAuthPrivateKey2; 
  x.beAuthPublicKey2 = obj.beAuthPublicKey2; 

  x.nativeCashAddr = obj.nativeCashAddr;

  if (obj.stealth) {
    x.stealth = StealthAddress.fromObj(obj.stealth); 
  }

  return x;
};

Wallet.prototype.toObject = function() {
  var x = _.cloneDeep(this);
  x.isShared = this.isShared();
  return x;
};

/**
 * Get the maximum allowed number of required copayers.
 * This is a limit imposed by the maximum allowed size of the scriptSig.
 * @param {number} totalCopayers - the total number of copayers
 * @return {number}
 */
Wallet.getMaxRequiredCopayers = function(totalCopayers) {
  return Wallet.COPAYER_PAIR_LIMITS[totalCopayers];
};

Wallet.verifyCopayerLimits = function(m, n) {
  return (n >= 1 && n <= 15) && (m >= 1 && m <= n);
};

Wallet.prototype.isShared = function() {
  return this.n > 1;
};


Wallet.prototype.updateBEKeys = function() {
  $.checkState(this.isComplete());

  var bitcore = Bitcore[this.coin];
  var salt = config.BE_KEY_SALT || Defaults.BE_KEY_SALT;

  var seed =_.map(this.copayers, 'xPubKey').sort().join('') + this.network + this.coin + salt;
  seed = bitcore.crypto.Hash.sha256(new Buffer(seed));
  var priv = bitcore.PrivateKey(seed, this.network);

  this.beAuthPrivateKey2 = priv.toString();
  // WARN!! => this will generate an uncompressed pub key.
  this.beAuthPublicKey2 = priv.toPublicKey().toString();
};


Wallet.prototype._updatePublicKeyRing = function() {
  this.publicKeyRing = _.map(this.copayers, function(copayer) {
    return _.pick(copayer, ['xPubKey', 'requestPubKey']);
  });
};

Wallet.prototype.addCopayer = function(copayer) {
  $.checkState(copayer.coin == this.coin);

  this.copayers.push(copayer);
  if (this.copayers.length < this.n) return;

  this.status = 'complete';
  this._updatePublicKeyRing();
};

Wallet.prototype.addCopayerRequestKey = function(copayerId, requestPubKey, signature, restrictions, name) {
  $.checkState(this.copayers.length == this.n);

  var c = this.getCopayer(copayerId);

  //new ones go first
  c.requestPubKeys.unshift({
    key: requestPubKey.toString(),
    signature: signature,
    selfSigned: true,
    restrictions: restrictions || {},
    name: name || null,
  });
};

Wallet.prototype.getCopayer = function(copayerId) {
  return _.find(this.copayers, {
    id: copayerId
  });
};

Wallet.prototype.isComplete = function() {
  return this.status == 'complete';
};

Wallet.prototype.isScanning = function() {
  return this.scanning;
};

Wallet.prototype.createAddress = function(isChange, step) {
  $.checkState(this.isComplete());
  var self = this;

  var path = this.addressManager.getNewAddressPath(isChange, step);
  log.verbose('Deriving addr:' + path);
  var address = Address.derive(self.id, this.addressType, this.publicKeyRing, path, this.m, this.coin, this.network, isChange, !self.nativeCashAddr);
  return address;
};

Wallet.prototype.getStealthAddress = function() {
  $.checkState(this.isComplete());
  $.checkState(this.coin == 'bch','Only for bch wallets');

  if (this.stealth) {
    return  this.stealth;
  }
  var self = this;

 var scanPath = Constants.PATHS.STEALTH_SCAN;
  log.verbose('Deriving scan key:' + scanPath);

  let scankey = _.map(self.publicKeyRing, function(item) {
    var xpub = new Bitcore['bch'].HDPublicKey(item.xPubKey);
    return xpub.deriveChild(scanPath).publicKey;
  }).sort()[0];

  var spendPath = Constants.PATHS.STEALTH_SPEND;
  log.verbose('Deriving spend key:' + spendPath);

  let spendKeys = _.map(self.publicKeyRing, function(item) {
    var xpub = new Bitcore['bch'].HDPublicKey(item.xPubKey);
    return xpub.deriveChild(spendPath).publicKey;
  }).sort();

  this.stealth = StealthAddress.create({
    address: (new Stealth.Address(scankey, spendKeys, self.m)).toString(),
    spendPubKeys: _.map(spendKeys, (x) => { return x.toString()} ),
    scanPubKey: scankey.toString(),
    walletId: self.id,
    network: self.network,
    m: self.m,
  });
  return this.stealth;
};



/// Only for power scan
Wallet.prototype.getSkippedAddress = function() {
  var self = this;
  $.checkState(this.isComplete());

  var next = this.addressManager.getNextSkippedPath();
  if (!next) return;
  var address = Address.derive(self.id, this.addressType, this.publicKeyRing, next.path, this.m, this.coin, this.network, next.isChange);
  return address;
};




module.exports = Wallet;
