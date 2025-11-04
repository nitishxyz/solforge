import { db } from "../db";
import { users, transactions, paymentLogs } from "../db/schema";

console.log("🗑️  Resetting database...\n");

try {
  console.log("Truncating payment_logs...");
  await db.delete(paymentLogs);
  
  console.log("Truncating transactions...");
  await db.delete(transactions);
  
  console.log("Truncating users...");
  await db.delete(users);
  
  console.log("\n✅ Database reset complete!\n");
  
  const userCount = await db.query.users.findMany();
  const txCount = await db.query.transactions.findMany();
  const paymentCount = await db.query.paymentLogs.findMany();
  
  console.log("Verification:");
  console.log(`  Users: ${userCount.length}`);
  console.log(`  Transactions: ${txCount.length}`);
  console.log(`  Payment Logs: ${paymentCount.length}`);
  
  process.exit(0);
} catch (error) {
  console.error("\n❌ Error resetting database:", error);
  process.exit(1);
}
