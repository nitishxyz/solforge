# AI Proxy Deployment Guide

## Pre-Deployment Checklist

### Environment Setup

- [ ] **Database**
  - [ ] PostgreSQL instance provisioned
  - [ ] Connection string set: `sst secret set DatabaseUrl <url>`
  - [ ] Migrations applied: `bun run db`
  
- [ ] **API Keys**
  - [ ] OpenAI: `sst secret set OpenAiApiKey <key>`
  - [ ] Anthropic: `sst secret set AnthropicApiKey <key>`
  
- [ ] **Payment Wallet**
  - [ ] Solana wallet created
  - [ ] Address set: `sst secret set PlatformWallet <address>`
  - [ ] Private key stored securely (for potential refunds)

### Network Configuration

**For Devnet Testing:**
```typescript
// apps/ai/src/config.ts
const IS_DEVNET = true;
```

**For Mainnet Production:**
```typescript
// apps/ai/src/config.ts
const IS_DEVNET = false;
```

### Payment Testing

- [ ] Platform wallet has devnet SOL for fees
- [ ] Platform wallet has USDC ATA created
- [ ] Test wallet has devnet USDC
- [ ] x402 client library tested
- [ ] End-to-end payment flow verified
- [ ] Duplicate transaction prevention verified

## Deployment Steps

### 1. Development Environment

```bash
# Start local development
cd apps/ai
sst shell --stage dev -- bun run src/index.ts

# Run tests
bun run test/test-client.ts
bun run test/x402-client-test.ts
```

### 2. Staging Deployment

```bash
# Deploy to staging
sst deploy --stage staging

# Set secrets
sst secret set DatabaseUrl <staging-db-url> --stage staging
sst secret set OpenAiApiKey <key> --stage staging
sst secret set AnthropicApiKey <key> --stage staging
sst secret set PlatformWallet <devnet-wallet> --stage staging

# Run migrations
sst shell --stage staging -- bun run db push

# Test deployment
curl https://staging.ai.solforge.sh/
```

### 3. Production Deployment

```bash
# Switch to mainnet
# Edit apps/ai/src/config.ts: IS_DEVNET = false

# Deploy to production
sst deploy --stage production

# Set production secrets
sst secret set DatabaseUrl <prod-db-url> --stage production
sst secret set OpenAiApiKey <key> --stage production
sst secret set AnthropicApiKey <key> --stage production
sst secret set PlatformWallet <mainnet-wallet> --stage production

# Run migrations
sst shell --stage production -- bun run db push

# Verify deployment
curl https://ai.solforge.sh/
curl https://ai.solforge.sh/v1/models
```

### 4. DNS & SSL

```bash
# Custom domain (already in infra/ai.ts)
sst shell --stage production
# Verify apiService.url points to custom domain
```

### 5. Monitoring Setup

- [ ] Set up CloudWatch alarms
  - API error rate > 5%
  - Response time > 2s
  - Payment failures
- [ ] Database connection pool monitoring
- [ ] Facilitator endpoint health checks
- [ ] USDC balance alerts

## Post-Deployment Verification

### Health Checks

```bash
# Service health
curl https://ai.solforge.sh/
# Expected: {"service":"ai.solforge.sh","version":"1.0.0","status":"online"}

# Models list
curl https://ai.solforge.sh/v1/models | jq '.data | length'
# Expected: 15

# Test payment flow (requires wallet)
cd apps/ai
bun run test/x402-client-test.ts
```

### Database Verification

```bash
# Connect to production DB
sst shell --stage production
bun run db

# Check tables
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM transactions;
SELECT COUNT(*) FROM payment_logs;
```

### Payment System Verification

```bash
# Create test account with small balance
# Make request until 402
# Verify payment requirement format
# Complete payment
# Verify balance credited
# Verify transaction logged
```

## Rollback Procedure

```bash
# Rollback to previous version
sst deploy --stage production --rollback

# Or redeploy previous commit
git checkout <previous-commit>
sst deploy --stage production
```

## Monitoring & Maintenance

### Daily Checks
- Payment success rate
- API response times
- Error logs in CloudWatch
- Database connection health

### Weekly Checks
- USDC balance in platform wallet
- Transaction volume trends
- Model usage distribution
- User balance patterns

### Monthly Tasks
- Review and optimize pricing
- Analyze facilitator fees
- Database performance tuning
- Update dependencies

## Security Hardening

- [ ] Rate limiting enabled (Hono middleware)
- [ ] Request size limits enforced
- [ ] Signature verification strict (60s nonce window)
- [ ] SQL injection prevention (Drizzle ORM)
- [ ] Secrets rotation policy
- [ ] CloudWatch log retention configured
- [ ] Database backups automated
- [ ] SSL/TLS certificate monitoring

## Cost Optimization

### Database
- Use connection pooling (already configured)
- Regular VACUUM on PostgreSQL
- Index optimization

### API Gateway
- Enable caching for `/v1/models`
- CDN for static assets

### Compute
- Right-size ECS tasks based on actual usage
- Auto-scaling policies

## Troubleshooting

### Payment Failures

**Check facilitator logs:**
```typescript
// Add logging in x402-payment.ts
console.error('Facilitator error:', await response.text());
```

**Verify wallet setup:**
```bash
# Check platform wallet ATA
spl-token accounts --owner <PLATFORM_WALLET>

# Verify USDC balance
spl-token balance <USDC_MINT> --owner <PLATFORM_WALLET>
```

### Database Connection Issues

```bash
# Test connection
sst shell --stage production
bun run -e "
import { db } from './db';
console.log(await db.query.users.findMany({ limit: 1 }));
"
```

### API Errors

```bash
# View recent logs
sst shell --stage production
# Check CloudWatch logs for error patterns

# Test specific endpoint
curl -v https://ai.solforge.sh/v1/balance \
  -H "x-wallet-address: <ADDR>" \
  -H "x-wallet-signature: <SIG>" \
  -H "x-wallet-nonce: $(date +%s)000"
```

## Support Contacts

- Infrastructure: ops@solforge.sh
- Payments: payments@solforge.sh
- Security: security@solforge.sh

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-10-26 | 1.0.0 | Initial x402 deployment |
