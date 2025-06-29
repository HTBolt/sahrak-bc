const algosdk = require('algosdk');

// Generate new account
const account = algosdk.generateAccount();

console.log("Your address:", account.addr);
console.log("Your mnemonic:", algosdk.secretKeyToMnemonic(account.sk));