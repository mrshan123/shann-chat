# Shann Chat — starter project

**Brand:** Shann  
**Tagline:** More Than Just Messages  
**Design:** Navy Blue & White  
**Platform:** React + Vite PWA  
**Backend:** Supabase Auth + Postgres + Realtime (starter wiring)  
**Calls:** Phase 5 roadmap  
**Important:** This is a working starter scaffold, not a production-ready Telegram replacement and not yet a complete secure messenger.

## Current implementation
- Responsive navy/white chat shell with custom Shann wordmark (no Telegram logo or branding).
- Supabase email/password sign-up and sign-in UI.
- Starter database schema for profiles/usernames, chats, members, messages, and blocks.
- RLS policies for basic membership-based message access.
- Realtime message subscription and encrypted-message storage wiring.
- Web Crypto AES-GCM helper functions as a demonstration building block.
- PWA manifest and build/test scripts.

## Not yet implemented
Username discovery and contact requests, robust direct-chat creation, groups/channels administration, device-to-device key exchange, audited E2EE protocol, key backup/recovery, encrypted file uploads, voice-message recorder/player, push notifications, edit/delete/forward/reactions/polls/search/pins/scheduled messages, moderation/reporting, and voice/video calls. UI buttons for planned functions display honest notices instead of pretending the feature works.

## Requirements
- Node.js 20+
- A Supabase project (free tier can be enough for development; quotas and availability can change)
- Git

## Run locally
```bash
npm install
cp .env.example .env.local
# Edit .env.local with your Supabase project URL and publishable/anon key
npm run dev
```
Open the local URL Vite prints. Without Supabase credentials, the UI preview loads but authentication and real chat operations are disabled.

## Build and test
```bash
npm run build
npm test
```

## Deploy to Vercel
1. Push this project to a private/public GitHub repository.
2. Import it into Vercel.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in project environment variables.
4. Deploy. Configure Supabase Auth Site URL and redirect URLs to your deployed domain.
5. Test sign-up, sign-in, RLS, and realtime with two separate test accounts/devices.

A static Vite app can also be deployed to Netlify or Cloudflare Pages. Set the build command to `npm run build` and output directory to `dist`.

## E2EE warning — read before inviting real users
The sample AES-GCM helper only encrypts with a local in-memory key. It does **not** securely distribute the key to another person or another device, and the key is lost on refresh. Therefore it cannot currently deliver cross-device end-to-end encryption. Do not use it for sensitive real conversations. Production E2EE needs a reviewed protocol such as a maintained Signal-protocol implementation, identity keys, signed prekeys, one-time prekeys, device verification, forward secrecy, recovery design, and an independent security review. Never invent your own full cryptographic protocol.

## Cross-device username requirement
The database stores unique usernames, but the starter UI does not yet implement username search or contact requests. A real implementation must add an RPC that resolves a username and creates a direct chat + both memberships atomically, while checking blocks and avoiding account enumeration abuse.

## Suggested build phases
1. **Foundation:** Auth, profile/username, RLS, account settings, tests.
2. **Core chat:** contacts, direct chats, group management, message delivery, read receipts, typing status, message actions.
3. **Media:** encrypted image/file uploads to private Storage, voice-message recording, previews, limits and cleanup.
4. **Power features:** push notifications, search, pins, replies, reactions, polls, scheduled messages, channels, admin/moderation.
5. **Calls:** WebRTC audio/video, signaling through Supabase Realtime, TURN server, permissions, reconnects, call controls, device tests.
6. **Security release:** audited E2EE, abuse prevention, accessibility, rate limits, backup/restore, incident response and penetration testing.

## Security checklist
- Never put Supabase `service_role` keys in client code.
- Enforce RLS on every table and private Storage object.
- Use server-side rate limits for auth, username lookups, contact requests and uploads.
- Validate upload MIME type, size, ownership, membership and retention.
- Avoid logging message content, access tokens, or encryption keys.
- Add CSP/security headers, dependency scanning, backups and monitoring.
- Have a qualified security reviewer audit policies and the E2EE implementation before public launch.
