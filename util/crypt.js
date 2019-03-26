'use strict';

const logger = require('../util/logger').logger;

const CRYPT_KEY = process.env.CRYPT_KEY || "supercalifragolisticexpialodocious";
const CRYPT_KEY_RSA = process.env.CRYPT_KEY_RSA;

/*
    crypt.js - wrapper for crypto
    All taken from thenativeweb/crypto2 (because I couldn't get the full module to work)
 */

const crypto = require('crypto'),
	NodeRSA = require('node-rsa'),
	{Readable} = require('stream');

const createKeyPair = async function () {
	const rsa = new NodeRSA({b: 2048, e: 65537}, {environment: 'node', signingAlgorithm: 'sha256'});
	const privateKey = rsa.exportKey(),
		publicKey = rsa.exportKey('public');

	return {privateKey, publicKey};
};

const rsaEncrypt = async function (privateKey, text) {
	const key = new NodeRSA(privateKey);
	return key.encrypt(text, 'base64', 'utf8');
};

const rsaDecrypt = async function (privateKey, text) {
	const key = new NodeRSA(privateKey);
	return key.decrypt(text, 'utf8');
};

const passwordEncrypt = async function (password, text) {
	const cipher = crypto.createCipher('aes-256-cbc', password);
	return processStream(cipher, text, {from: 'utf8', to: 'hex'});
};

const passwordDecrypt = async function (password, text) {
	const cipher = crypto.createDecipher('aes-256-cbc', password);
	return processStream(cipher, text, {from: 'hex', to: 'utf8'});
};

const encryptObjects = async function (objects, fields) {
	if (!objects || objects.length === 0) {
		return;
	}
	if (!fields || fields.length === 0) {
		fields = Object.keys(objects[0]);
	}
	try {
		for (let i = 0; i < objects.length; i++) {
			let obj = objects[i];
			for (let j = 0; j < fields.length; j++) {
				let field = fields[j];
				if (obj[field]) {
					try {
						obj[field] = await rsaEncrypt(CRYPT_KEY_RSA, obj[field]);
					} catch (e) {
						obj[field] = await passwordEncrypt(CRYPT_KEY, obj[field]);
					}
				}
			}
		}
	} catch (error) {
		logger.error("Failed to encrypt objects", error);
	}
};

const decryptObjects = async function (objects, fields) {
	if (!objects || objects.length === 0) {
		return;
	}
	if (!fields || fields.length === 0) {
		fields = Object.keys(objects[0]);
	}
	try {
		for (let i = 0; i < objects.length; i++) {
			let obj = objects[i];
			for (let j = 0; j < fields.length; j++) {
				let field = fields[j];
				if (obj[field]) {
					try {
						obj[field] = await rsaDecrypt(CRYPT_KEY_RSA, obj[field]);
					} catch (e) {
						obj[field] = await passwordDecrypt(CRYPT_KEY, obj[field]);
					}
				}
			}
		}
	} catch (error) {
		logger.error("Failed to decrypt objects", error);
	}
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
		} catch (ex) {
			reject(ex);
		}
		cipher.end();
	});
};

const crypt = {
	encryptObjects,
	decryptObjects
};

module.exports = crypt;
