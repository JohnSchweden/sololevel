-- Migration 08: Create trigger for analysis kickoff
-- Part of SSML/Audio segments separation initiative
-- Automatically start analysis when video upload completes

-- Create function to enqueue analysis job when video upload completes
CREATE OR REPLACE FUNCTION enqueue_analysis_job_on_upload_complete()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process when upload_status changes to 'completed'
    IF OLD.upload_status IS DISTINCT FROM NEW.upload_status 
       AND NEW.upload_status = 'completed' THEN
        
        -- Enqueue or upsert analysis job
        INSERT INTO public.analysis_jobs (
            user_id,
            video_recording_id,
            status,
            created_at
        ) VALUES (
            NEW.user_id,
            NEW.id,
            'queued',
            now()
        )
        ON CONFLICT (video_recording_id) DO UPDATE SET
            status = 'queued',
            updated_at = now()
        WHERE analysis_jobs.status IN ('failed', 'cancelled');
        
        -- Note: We prefer DB webhook → Edge Function over HTTP calls from triggers
        -- The actual analysis processing will be handled by Edge Functions
        -- This trigger just ensures the job record exists
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for video_recordings UPDATE
CREATE TRIGGER enqueue_analysis_job_on_upload_complete
    AFTER UPDATE ON public.video_recordings
    FOR EACH ROW
    WHEN (OLD.upload_status IS DISTINCT FROM NEW.upload_status)
    EXECUTE FUNCTION enqueue_analysis_job_on_upload_complete();

-- Create function for webhook-based analysis kickoff (preferred approach)
CREATE OR REPLACE FUNCTION webhook_analysis_kickoff(video_recording_id bigint)
RETURNS jsonb AS $$
DECLARE
    recording_record record;
    job_id bigint;
BEGIN
    -- Get video recording details
    SELECT vr.* INTO recording_record
    FROM public.video_recordings vr
    WHERE vr.id = video_recording_id
    AND vr.upload_status = 'completed';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Video recording not found or not completed'
        );
    END IF;
    
    -- Enqueue analysis job
    INSERT INTO public.analysis_jobs (
        user_id,
        video_recording_id,
        status,
        created_at
    ) VALUES (
        recording_record.user_id,
        recording_record.id,
        'queued',
        now()
    )
    ON CONFLICT (video_recording_id) DO UPDATE SET
        status = 'queued',
        updated_at = now()
    WHERE analysis_jobs.status IN ('failed', 'cancelled')
    RETURNING id INTO job_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'analysis_job_id', job_id,
        'video_recording_id', video_recording_id,
        'storage_path', recording_record.storage_path
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comments
COMMENT ON FUNCTION enqueue_analysis_job_on_upload_complete() IS 'Automatically enqueues analysis job when video upload completes';
COMMENT ON FUNCTION webhook_analysis_kickoff(bigint) IS 'Webhook-callable function to kickoff analysis for completed video uploads';
