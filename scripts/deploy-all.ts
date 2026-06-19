import hre from "hardhat";

async function main() {
  // Arc Testnet USDC address
  const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
  const ADMIN_FEE_RECIPIENT = "0x90f79bf6eb2c4f870365e785982e1f101e93b906"; // Test Admin

  console.log("🔌 Deploying CrossWire V2 Smart Contract suite on Arc Testnet...");
  console.log("   Target USDC Token Address:", USDC_ADDRESS);

  // 1. Deploy CrossWireRouterV2
  console.log("\n1️⃣ Deploying CrossWireRouterV2...");
  const router = await hre.viem.deployContract("CrossWireRouterV2", [USDC_ADDRESS]);
  console.log("✅ CrossWireRouterV2 deployed to:", router.address);

  // 2. Deploy CrossWireAgent (Identity & Escrow Settlement)
  console.log("\n2️⃣ Deploying CrossWireAgent...");
  const agentRegistry = await hre.viem.deployContract("CrossWireAgent", [ADMIN_FEE_RECIPIENT]);
  console.log("✅ CrossWireAgent Registry deployed to:", agentRegistry.address);

  console.log("\n========================================================");
  console.log("📋 Configuration updates for your .env file:");
  console.log(`NEXT_PUBLIC_CROSSWIRE_CONTRACT=${router.address}`);
  console.log(`NEXT_PUBLIC_CROSSWIRE_AGENT_CONTRACT=${agentRegistry.address}`);
  console.log("========================================================");
  console.log("\n🔗 Verify on Arcscan:");
  console.log(`- Router: https://testnet.arcscan.app/address/${router.address}`);
  console.log(`- Agent Registry: https://testnet.arcscan.app/address/${agentRegistry.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Smart contract deployment failed:", error);
    process.exit(1);
  });
