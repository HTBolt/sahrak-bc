const algosdk = require('algosdk');

// Your account details (updated with actual values)
const ACCOUNT_ADDRESS = "ISKQJKIEYQRDJHPN4H2V4X7Q3U4WLQPB4XQPJG3MXJZB6YQRP65M";
const ACCOUNT_MNEMONIC = "crash pond train sign around hawk very orient mix cinnamon space catch patch tongue engage milk rebel digital input soup pledge crime allow abstract smoke";

// Algorand testnet configuration
const algodToken = "";
const algodServer = "https://testnet-api.4160.nodely.dev";
const algodPort = "";

async function fundTestnetAccount() {
    try {
        console.log("🔄 Funding testnet account...");
        console.log("📍 Account Address:", ACCOUNT_ADDRESS);
        
        // Method 1: Using Algorand's official testnet faucet
        console.log("\n💰 Requesting funds from Algorand testnet faucet...");
        
        const faucetResponse = await fetch(`https://bank.testnet.algorand.network/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `account=${ACCOUNT_ADDRESS}`
        });
        
        if (faucetResponse.ok) {
            console.log("✅ Successfully requested funds from faucet!");
            console.log("⏳ Please wait 30-60 seconds for the transaction to be processed...");
        } else {
            console.log("⚠️ Faucet request failed, trying alternative method...");
            
            // Alternative: Manual instructions
            console.log("\n📋 Manual funding instructions:");
            console.log("1. Go to: https://bank.testnet.algorand.network/");
            console.log("2. Enter your address:", ACCOUNT_ADDRESS);
            console.log("3. Click 'Dispense' to receive testnet ALGO");
        }
        
        // Wait a moment then check balance
        console.log("\n⏳ Waiting 30 seconds before checking balance...");
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // Check account balance
        await checkAccountBalance();
        
    } catch (error) {
        console.error("❌ Error funding account:", error.message);
        console.log("\n📋 Manual funding instructions:");
        console.log("1. Go to: https://bank.testnet.algorand.network/");
        console.log("2. Enter your address:", ACCOUNT_ADDRESS);
        console.log("3. Click 'Dispense' to receive testnet ALGO");
    }
}

async function checkAccountBalance() {
    try {
        console.log("\n🔍 Checking account balance...");
        
        // Initialize Algorand client
        const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);
        
        // Get account information
        const accountInfo = await algodClient.accountInformation(ACCOUNT_ADDRESS).do();
        
        const balance = accountInfo.amount / 1000000; // Convert microAlgos to Algos
        
        console.log("💰 Account Balance:", balance, "ALGO");
        
        if (balance > 0) {
            console.log("✅ Account successfully funded!");
            console.log("🎉 You can now use this account for blockchain transactions");
        } else {
            console.log("⚠️ Account balance is 0. Please try funding manually:");
            console.log("   Go to: https://bank.testnet.algorand.network/");
            console.log("   Enter address:", ACCOUNT_ADDRESS);
        }
        
        return balance;
        
    } catch (error) {
        console.error("❌ Error checking balance:", error.message);
        console.log("💡 Make sure your account address is correct and try again");
    }
}

// Run the funding process
fundTestnetAccount();