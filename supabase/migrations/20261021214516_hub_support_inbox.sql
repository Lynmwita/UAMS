CREATE TABLE public.hub_support_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), university_id uuid NOT NULL,
 source_id text NOT NULL CHECK(length(source_id) BETWEEN 1 AND 200),
 kind text NOT NULL CHECK(kind IN ('ticket','feedback','attendance')),
 student_email text NOT NULL, registration_number text,
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 200), body text NOT NULL CHECK(length(body) BETWEEN 1 AND 10000),
 status text NOT NULL, is_sensitive boolean NOT NULL DEFAULT false, category text,
 occurred_at timestamptz NOT NULL, source_updated_at timestamptz NOT NULL,
 metadata jsonb NOT NULL DEFAULT '{}',
 staff_status text NOT NULL DEFAULT 'open' CHECK(staff_status IN ('open','in_review','in_progress','resolved','closed')),
 staff_note text NOT NULL DEFAULT '', reviewed_at timestamptz, reviewed_by text,
 received_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(university_id,kind,source_id)
);
ALTER TABLE public.hub_support_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hub_support_records FROM anon, authenticated;
GRANT SELECT,INSERT,UPDATE ON public.hub_support_records TO service_role;

CREATE TABLE public.hub_support_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),record_id uuid NOT NULL REFERENCES public.hub_support_records(id),
 from_status text NOT NULL,to_status text NOT NULL,staff_note text NOT NULL,reviewed_by text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hub_support_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hub_support_history FROM anon,authenticated,service_role;
GRANT SELECT,INSERT ON public.hub_support_history TO service_role;
CREATE FUNCTION public.capture_hub_review() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.staff_status IS DISTINCT FROM OLD.staff_status OR NEW.staff_note IS DISTINCT FROM OLD.staff_note THEN
  INSERT INTO public.hub_support_history(record_id,from_status,to_status,staff_note,reviewed_by)
   VALUES(NEW.id,OLD.staff_status,NEW.staff_status,NEW.staff_note,NEW.reviewed_by);
 END IF; RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.capture_hub_review() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER hub_support_review AFTER UPDATE ON public.hub_support_records FOR EACH ROW EXECUTE FUNCTION public.capture_hub_review();

CREATE OR REPLACE FUNCTION public.receive_hub_support(p_university_id uuid,p_records jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE r jsonb; old_version timestamptz; inserted_count integer:=0; updated_count integer:=0; unchanged_count integer:=0;
BEGIN
 IF jsonb_typeof(p_records) IS DISTINCT FROM 'array' OR jsonb_array_length(p_records)>100 THEN RAISE EXCEPTION 'Invalid support batch'; END IF;
 IF (SELECT count(*) FROM jsonb_array_elements(p_records))<>(SELECT count(DISTINCT (v->>'kind',v->>'source_id')) FROM jsonb_array_elements(p_records) v) THEN RAISE EXCEPTION 'Duplicate support source IDs'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('hub-support:'||p_university_id::text,0));
 FOR r IN SELECT * FROM jsonb_array_elements(p_records) LOOP
  SELECT source_updated_at INTO old_version FROM public.hub_support_records WHERE university_id=p_university_id AND kind=r->>'kind' AND source_id=r->>'source_id' FOR UPDATE;
  IF old_version IS NOT NULL AND old_version>=(r->>'updated_at')::timestamptz THEN unchanged_count:=unchanged_count+1; CONTINUE; END IF;
  INSERT INTO public.hub_support_records(university_id,source_id,kind,student_email,registration_number,title,body,status,is_sensitive,category,occurred_at,source_updated_at,metadata)
   VALUES(p_university_id,r->>'source_id',r->>'kind',lower(r->>'student_email'),r->>'registration_number',r->>'title',r->>'body',r->>'status',coalesce((r->>'is_sensitive')::boolean,false),r->>'category',(r->>'occurred_at')::timestamptz,(r->>'updated_at')::timestamptz,coalesce(r->'metadata','{}'))
   ON CONFLICT(university_id,kind,source_id) DO UPDATE SET student_email=excluded.student_email,registration_number=excluded.registration_number,title=excluded.title,body=excluded.body,status=excluded.status,is_sensitive=excluded.is_sensitive,category=excluded.category,source_updated_at=excluded.source_updated_at,metadata=excluded.metadata,received_at=now();
  IF old_version IS NULL THEN inserted_count:=inserted_count+1; ELSE updated_count:=updated_count+1; END IF;
 END LOOP;
 RETURN jsonb_build_object('accepted',jsonb_array_length(p_records),'inserted',inserted_count,'updated',updated_count,'unchanged',unchanged_count);
END; $$;
REVOKE ALL ON FUNCTION public.receive_hub_support(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.receive_hub_support(uuid,jsonb) TO service_role;
