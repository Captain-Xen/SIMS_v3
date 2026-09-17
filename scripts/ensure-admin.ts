// One-time setup helper: ensures the REAL initial administrator account
// exists (completely separate from the demo accounts).
//
//   bun run admin:create
//
// - If the account does not exist, it is created with a cryptographically
//   random temporary password (or $INITIAL_ADMIN_PASSWORD if provided) and
//   the credentials are printed here ONCE. Only the scrypt hash is stored.
// - The account starts with mustChangePassword=true: every API endpoint is
//   server-gated until the password is changed at first login.
// - Safe to run repeatedly — it never duplicates the account and never
//   touches demo accounts.
import { ensureInitialAdmin, printInitialAdminCredentials } from '../src/lib/auth'

async function main() {
  const r = await ensureInitialAdmin()
  if (r.created && r.tempPassword) {
    printInitialAdminCredentials(r.email, r.tempPassword)
  } else {
    console.log(`Initial administrator already exists: ${r.email} — no action taken.`)
    console.log('If you lost its password, delete that user row (or reseed) and run this again.')
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Failed:', e)
    process.exit(1)
  })
