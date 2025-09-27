-- Migration 07: Create triggers for SSML job enqueueing
-- Part of SSML/Audio segments separation initiative
-- Automatically enqueue SSML jobs when feedback with message is created

-- Create function to enqueue SSML job on feedback insert
CREATE OR REPLACE FUNCTION enqueue_ssml_job_on_feedback()
RETURNS TRIGGER AS $$
BEGIN
    -- Only enqueue if message is not empty
    IF trim(coalesce(NEW.message, '')) <> '' THEN
        -- Insert SSML job (ON CONFLICT DO NOTHING for idempotency)
        INSERT INTO public.ssml_jobs (feedback_id)
        VALUES (NEW.id)
        ON CONFLICT (feedback_id) DO NOTHING;
        
        -- Update feedback status to queued
        UPDATE public.analysis_feedback 
        SET ssml_status = 'queued'
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for feedback INSERT
CREATE TRIGGER enqueue_ssml_job_on_feedback_insert
    AFTER INSERT ON public.analysis_feedback
    FOR EACH ROW
    EXECUTE FUNCTION enqueue_ssml_job_on_feedback();

-- Create function to handle feedback UPDATE (optional - requeue when message changes to non-empty)
CREATE OR REPLACE FUNCTION enqueue_ssml_job_on_feedback_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if message changed from empty to non-empty
    IF trim(coalesce(OLD.message, '')) = '' 
       AND trim(coalesce(NEW.message, '')) <> '' THEN
        
        -- Insert SSML job (ON CONFLICT DO NOTHING for idempotency)
        INSERT INTO public.ssml_jobs (feedback_id)
        VALUES (NEW.id)
        ON CONFLICT (feedback_id) DO NOTHING;
        
        -- Update feedback status to queued
        UPDATE public.analysis_feedback 
        SET ssml_status = 'queued'
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for feedback UPDATE
CREATE TRIGGER enqueue_ssml_job_on_feedback_update
    AFTER UPDATE ON public.analysis_feedback
    FOR EACH ROW
    WHEN (OLD.message IS DISTINCT FROM NEW.message)
    EXECUTE FUNCTION enqueue_ssml_job_on_feedback_update();

-- Add helpful comments
COMMENT ON FUNCTION enqueue_ssml_job_on_feedback() IS 'Automatically enqueues SSML job when feedback with non-empty message is inserted';
COMMENT ON FUNCTION enqueue_ssml_job_on_feedback_update() IS 'Automatically enqueues SSML job when feedback message changes from empty to non-empty';
