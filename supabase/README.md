# Supabase setup

1. Create a Supabase project and keep the `service_role` secret server-side only.
2. Run `migrations/202610240001_initial.sql` in the SQL Editor.
3. In Authentication → URL Configuration, set local and production Site URLs.
4. In Authentication providers, enable Email. For real deployments, enable email confirmation and configure SMTP.
5. Add the URL and publishable/anon key to `.env.local`.
6. In Database → Replication, enable Realtime for `public.messages` if your project requires explicit publication configuration.
7. Create private Storage buckets only after implementing encrypted file-key wrapping and membership-aware policies. Do not make private chat media public.
8. Before production, replace starter chat/member insert policies with transactional RPCs that create the chat and membership atomically and enforce invitation/role rules.
