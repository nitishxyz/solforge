import { createLiteSVMRpcServer } from "./server";

const PORT = Number(process.env.RPC_PORT) || 8899;

createLiteSVMRpcServer(PORT);

console.log(`
🚀 LiteSVM RPC Server is running!
   
   HTTP endpoint: http://localhost:${PORT}
   
   Connect with Solana CLI:
   $ solana config set -u http://localhost:${PORT}
   
   Or use with @solana/kit:
   const rpc = createSolanaRpc('http://localhost:${PORT}')
   
   Press Ctrl+C to stop the server
`);
