import { runScan } from "@/lib/scanner";

async function main() {
  const force = process.argv.includes("--force");
  const result = await runScan({ force });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
