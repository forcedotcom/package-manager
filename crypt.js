'use strict';

/*
    crypt.js - wrapper for crypto
    All taken from thenativeweb/crypto2 (because I couldn't get the full module to work)
 */

const crypto = require('crypto'),
    NodeRSA = require('node-rsa'),
    {Readable} = require('stream');

const createKeyPair = async function () {
    const key = new NodeRSA({b: 2048, e: 65537}, {environment: 'node', signingAlgorithm: 'sha256'});

    const privateKey = key.exportKey(),
        publicKey = key.exportKey('public');

    return {privateKey, publicKey};
};

const rsaEncrypt = async function (text, publicKey) {
    const key = new NodeRSA(publicKey);
    return key.encrypt(text, 'base64', 'utf8');
};

const rsaDecrypt = async function (text, privateKey) {
    const key = new NodeRSA(privateKey);
    return key.decrypt(text, 'utf8');
};

const passwordEncrypt = async function (text, password) {
    const cipher = crypto.createCipher('aes-256-cbc', password);
    return await processStream(cipher, text, {from: 'utf8', to: 'hex'});
};

const passwordDecrypt = async function (text, password) {
    const decipher = crypto.createDecipher('aes-256-cbc', password);
    return await processStream(decipher, text, {from: 'hex', to: 'utf8'});
};

const processStream = function (cipher, text, options) {
    return new Promise((resolve, reject) => {
        let result = '';

        if (cipher instanceof Readable) {
            cipher.setEncoding(options.to);

            cipher.on('readable', () => {
                result += cipher.read() || '';
            });

            cipher.once('end', () => {
                cipher.removeAllListeners();
                resolve(result);
            });
        } else {
            cipher.once('finish', () => {
                cipher.removeAllListeners();
                resolve(result);
            });
        }

        cipher.once('error', err => {
            cipher.removeAllListeners();
            reject(err);
        });

        try {
            cipher.write(text, options.from);
            cipher.end();
        } catch (ex) {
            reject(ex);
        }
    });
};

const crypt = {
    createKeyPair,
    rsaEncrypt,
    rsaDecrypt,
    passwordEncrypt,
    passwordDecrypt
};

module.exports = crypt;
