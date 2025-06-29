const algosdk = require('algosdk');

// This script will help you get your account details from the previous generation
console.log("🔄 Generating new account details for reference...");

// Generate new account (or you can use your existing one)
const account = algosdk.generateAccount();
const mnemonic = algosdk.secretKeyToMnemonic(account.sk);

console.log("\n📋 Account Details:");
console.log("=" .repeat(50));
console.log("Address:", account.addr);
console.log("Mnemonic:", mnemonic);
console.log("=" .repeat(50));

console.log("\n📝 Next Steps:");
console.log("1. Copy the address above");
console.log("2. Update fund-testnet-account.js with your address and mnemonic");
console.log("3. Run: node fund-testnet-account.js");

// Export for use in other scripts
module.exports = {
    address: account.addr,
    mnemonic: mnemonic,
    account: account
};