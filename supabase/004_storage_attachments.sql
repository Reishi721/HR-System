-- Create Storage Bucket for Leave Attachments (Medical Certificates, etc.)
insert into storage.buckets (id, name, public)
values ('leave_attachments', 'leave_attachments', true)
on conflict (id) do nothing;

-- Set up Storage Policies
drop policy if exists "Authenticated users can upload attachments" on storage.objects;
create policy "Authenticated users can upload attachments"
on storage.objects for insert
with check (
  bucket_id = 'leave_attachments' and auth.role() = 'authenticated'
);

drop policy if exists "Everyone can view attachments" on storage.objects;
create policy "Everyone can view attachments"
on storage.objects for select
using (
  bucket_id = 'leave_attachments' and auth.role() = 'authenticated'
);
