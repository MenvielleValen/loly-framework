# Contributing to Loly.js

Thanks for your interest in Loly.js!  

We're currently in **active alpha** — things move fast, stuff breaks often, and we love it that way.

## This project is in ALPHA

That means:

- Frequent breaking changes (sometimes multiple times per week)

- Some features are incomplete or rough around the edges

- APIs can and will change without warning

- This is completely expected and normal at this stage

If you don't like things breaking overnight, wait for beta.  

If you love bleeding-edge stuff → you're in the right place!

## How to help

### Report a bug or weird behavior

- Search existing issues first

- Open a new issue using the **Bug Report** template

- Add **[alpha]** to the title if you think it might be alpha-related

### Request a feature

- Open an issue using the **Feature Request** template

- Explain the real-world use case (the more specific, the better)

### Send code (Pull Requests)

We love PRs of any size!

1. Fork the repo and create your branch from `alpha`:

   ```bash
   git checkout -b feat/amazing-thing alpha
   
   # or
   
   git checkout -b fix/small-bugfix alpha
   ```

2. Install dependencies with pnpm (pnpm 8+ required):
   ```bash
   pnpm install
   ```

3. Make your changes in the correct package (packages/loly-core, packages/cli, apps, etc.)

4. Make sure tests pass and add new ones if needed:
   ```bash
   pnpm test
   pnpm build   # run in root + affected packages
   ```

5. Commit with clear messages (English preferred):
   ```bash
   git commit -m "feat: add rate limiting middleware"
   git commit -m "fix: websocket reconnection issue"
   ```

6. Push and open a PR targeting the `alpha` branch.

### Improve docs, examples, or demos

Pure gold! Fixing typos, improving the README, or making the demos (apps/space-explorer, apps/chat) prettier is always welcome.

## Code of Conduct

Be kind and respectful. This project follows the Contributor Covenant.

## Questions?

- Open an issue with the `question` label

---

Thank you! Every star, issue, and PR makes Loly better.

