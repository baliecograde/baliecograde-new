# Migration notes
This is the owner-approved MVP baseline for the audited Production project. It is local only and has not been applied remotely.
It creates public.waste_scans, a stable list-order index, default-deny RLS with no client policies, server-role-only table grants, and a private waste-images bucket only if its ID does not already exist. It does not alter Storage tables or existing bucket configuration.
Rollback would require dropping the table/index and deleting the bucket, which could destroy uploaded files. There is intentionally no automatic rollback script. Any rollback after deployment requires an explicit data-preservation plan and approval.
