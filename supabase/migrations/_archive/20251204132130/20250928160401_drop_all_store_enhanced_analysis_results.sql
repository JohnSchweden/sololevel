DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS regproc
    FROM pg_proc
    WHERE proname = 'store_enhanced_analysis_results'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', r.regproc);
  END LOOP;
END$$;