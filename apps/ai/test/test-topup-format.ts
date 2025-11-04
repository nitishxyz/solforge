import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { Keypair } from '@solana/web3.js';

const wallet = Keypair.fromSecretKey(
  bs58.decode('4HVvY6VJDPySX1RTmiCm1aWQVRu3sPYf4qex68VvbRP8hoLGUAWWdVLQx4gnsQf4QFe7pYAQz4VGWX9pEjFJzFkh')
);

const nonce = Date.now().toString();
const message = new TextEncoder().encode(nonce);
const signature = nacl.sign.detached(message, wallet.secretKey);

const headers = {
  'Content-Type': 'application/json',
  'x-wallet-address': wallet.publicKey.toBase58(),
  'x-wallet-signature': bs58.encode(signature),
  'x-wallet-nonce': nonce
};

console.log('\n🧪 Testing old topup format (should fail)...');
const oldResponse = await fetch('http://localhost:4000/v1/topup', {
  method: 'POST',
  headers,
  body: JSON.stringify({ txSignature: 'MOCK_TX_123', amountUsd: '10.00' })
});
const oldData = await oldResponse.json();
console.log('Status:', oldResponse.status);
console.log('Response:', oldData);

console.log('\n🧪 Testing new x402 format (will fail at facilitator, but shows integration)...');
const newResponse = await fetch('http://localhost:4000/v1/topup', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    paymentPayload: {
      x402Version: 1,
      scheme: 'exact',
      network: 'solana-devnet',
      payload: {
        transaction: 'base64_encoded_partial_transaction_here'
      }
    }
  })
});
const newData = await newResponse.json();
console.log('Status:', newResponse.status);
console.log('Response:', newData);
