/**
 * CrossWireRouterV2 Deployment Script
 * Deploys to Arc Testnet with USDC as the settlement token.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network arcTestnet
 */

import hre from "hardhat";

async function main() {
  // Arc Testnet USDC address (ERC-20 interface, 6 decimals)
  const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

  console.log("🔌 Deploying CrossWireRouterV2 to Arc Testnet...");
  console.log("   USDC address:", USDC_ADDRESS);

  const contract = await hre.viem.deployContract("CrossWireRouterV2", [USDC_ADDRESS]);

  console.log("✅ CrossWireRouterV2 deployed to:", contract.address);
  console.log("");
  console.log("📋 Update your .env with:");
  console.log(`   NEXT_PUBLIC_CROSSWIRE_CONTRACT=${contract.address}`);
  console.log("");
  console.log("🔗 Verify on Arcscan:");
  console.log(`   https://testnet.arcscan.app/address/${contract.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
