import hre from "hardhat";

async function main() {
  console.log("HRE properties:", Object.keys(hre));
}

main().catch(console.error);
