-- 인재풀 등록(이력서 업로드)용 비공개 Storage 버킷.
-- anon은 업로드만 가능(다운로드/목록 조회 불가), authenticated(관리자)는 전체 접근 가능.

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

drop policy if exists "anon can upload resumes" on storage.objects;
create policy "anon can upload resumes"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'resumes');

drop policy if exists "authenticated full access to resumes" on storage.objects;
create policy "authenticated full access to resumes"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'resumes')
  with check (bucket_id = 'resumes');
