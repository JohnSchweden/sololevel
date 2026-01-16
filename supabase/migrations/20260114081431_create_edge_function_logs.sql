-- Create table for persistent edge function logs
-- Allows logs to persist even when functions timeout or run in background

CREATE TABLE IF NOT EXISTS edge_function_logs (
  id BIGSERIAL PRIMARY KEY,
  function_name TEXT NOT NULL,
  module TEXT,
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  data JSONB,
  job_id INTEGER REFERENCES analysis_jobs(id) ON DELETE SET NULL,
  analysis_id UUID REFERENCES analyses(id) ON DELETE SET NULL,
  feedback_id INTEGER REFERENCES analysis_feedback(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_edge_function_logs_function_name ON edge_function_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_edge_function_logs_level ON edge_function_logs(level);
CREATE INDEX IF NOT EXISTS idx_edge_function_logs_created_at ON edge_function_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_edge_function_logs_job_id ON edge_function_logs(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_edge_function_logs_analysis_id ON edge_function_logs(analysis_id) WHERE analysis_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_edge_function_logs_feedback_id ON edge_function_logs(feedback_id) WHERE feedback_id IS NOT NULL;

-- Composite index for common query pattern: function + level + time
CREATE INDEX IF NOT EXISTS idx_edge_function_logs_function_level_time 
  ON edge_function_logs(function_name, level, created_at DESC);

-- RLS: Only service role can write, but allow reading for debugging
ALTER TABLE edge_function_logs ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access" ON edge_function_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Allow authenticated users to read logs (for debugging their own jobs)
CREATE POLICY "Users can read logs for their jobs" ON edge_function_logs
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      job_id IN (
        SELECT aj.id FROM analysis_jobs aj 
        WHERE aj.user_id = auth.uid()
      )
      OR analysis_id IN (
        SELECT a.id FROM analyses a
        JOIN analysis_jobs aj ON a.job_id = aj.id
        WHERE aj.user_id = auth.uid()
      )
      OR feedback_id IN (
        SELECT af.id FROM analysis_feedback af
        JOIN analyses a ON af.analysis_id = a.id
        JOIN analysis_jobs aj ON a.job_id = aj.id
        WHERE aj.user_id = auth.uid()
      )
    )
  );

-- RPC function to insert logs, bypassing RLS
CREATE OR REPLACE FUNCTION insert_edge_function_log(
  p_function_name TEXT,
  p_module TEXT,
  p_level TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT NULL,
  p_job_id INTEGER DEFAULT NULL,
  p_analysis_id UUID DEFAULT NULL,
  p_feedback_id INTEGER DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- This is crucial: runs with privileges of the function owner (supabase_admin)
AS $$
BEGIN
  INSERT INTO public.edge_function_logs (
    function_name, module, level, message, data, job_id, analysis_id, feedback_id
  ) VALUES (
    p_function_name, p_module, p_level, p_message, p_data, p_job_id, p_analysis_id, p_feedback_id
  );
END;
$$;

-- Auto-cleanup old logs (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_edge_function_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM edge_function_logs
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Run cleanup daily (optional - can be enabled via pg_cron)
-- SELECT cron.schedule('cleanup-edge-function-logs', '0 2 * * *', 'SELECT cleanup_old_edge_function_logs()');

COMMENT ON TABLE edge_function_logs IS 'Persistent logs from edge functions. Survives timeouts and background workers.';
COMMENT ON COLUMN edge_function_logs.function_name IS 'Name of the edge function (e.g., ai-analyze-video)';
COMMENT ON COLUMN edge_function_logs.module IS 'Module/component name (e.g., ssmlWorker, audioWorker)';
COMMENT ON COLUMN edge_function_logs.level IS 'Log level: debug, info, warn, error';
COMMENT ON COLUMN edge_function_logs.data IS 'Additional structured data (JSON)';
COMMENT ON COLUMN edge_function_logs.job_id IS 'Optional: Link to analysis_jobs for filtering';
COMMENT ON COLUMN edge_function_logs.analysis_id IS 'Optional: Link to analyses for filtering';
COMMENT ON COLUMN edge_function_logs.feedback_id IS 'Optional: Link to analysis_feedback for filtering';
