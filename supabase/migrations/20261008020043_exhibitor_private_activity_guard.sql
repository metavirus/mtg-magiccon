-- Exhibitor saves and notes are private; the general Activity stream is shared.
alter table public.user_activity_events drop constraint user_activity_events_object_kind_allowed;
alter table public.user_activity_events add constraint user_activity_events_object_kind_allowed
check (object_kind in ('event','alert','receipt','place','hotel','artist','note','wallet','trip','map','activity','general'));
