import { runScan } from "@/lib/scanner";

async function main() {
  const result = await runScan();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
