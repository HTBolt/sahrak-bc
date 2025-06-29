/*
  # Fix Allergies Parsing and Display

  1. New Migration
     - Adds a function to properly handle allergies data
     - Ensures allergies are stored in a consistent format
     - Fixes the issue with allergies showing as raw JSON
*/

-- Create a function to ensure allergies are stored in a consistent format
CREATE OR REPLACE FUNCTION public.normalize_allergies_array()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only process if allergies field is not null
  IF NEW.allergies IS NOT NULL THEN
    -- Ensure allergies is an array
    IF jsonb_typeof(to_jsonb(NEW.allergies)) = 'array' THEN
      -- Process each allergy to ensure it has the correct structure
      NEW.allergies = (
        SELECT array_agg(
          CASE
            -- If it's a string, convert to proper object
            WHEN jsonb_typeof(to_jsonb(allergy)) = 'string' THEN 
              jsonb_build_object(
                'id', 'allergy-' || gen_random_uuid(),
                'name', allergy,
                'type', 'other',
                'severity', 'mild',
                'notes', ''
              )::text
            -- If it's already an object, ensure it has all required fields
            ELSE
              jsonb_build_object(
                'id', COALESCE(allergy->>'id', 'allergy-' || gen_random_uuid()),
                'name', COALESCE(allergy->>'name', 'Unknown Allergy'),
                'type', COALESCE(allergy->>'type', 'other'),
                'severity', COALESCE(allergy->>'severity', 'mild'),
                'notes', COALESCE(allergy->>'notes', '')
              )::text
          END
        )
        FROM jsonb_array_elements(to_jsonb(NEW.allergies)) AS allergy
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create a trigger to normalize allergies when inserting or updating user profiles
DROP TRIGGER IF EXISTS normalize_allergies_on_user_profiles ON public.user_profiles;
CREATE TRIGGER normalize_allergies_on_user_profiles
BEFORE INSERT OR UPDATE OF allergies ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.normalize_allergies_array();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.normalize_allergies_array() TO authenticated, anon;

-- Create a function to properly parse allergies for the allergies table
CREATE OR REPLACE FUNCTION public.parse_allergy_object(allergy_text TEXT)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  allergy_json jsonb;
BEGIN
  -- Try to parse as JSON
  BEGIN
    allergy_json := allergy_text::jsonb;
  EXCEPTION WHEN OTHERS THEN
    -- If parsing fails, create a basic object
    RETURN jsonb_build_object(
      'id', 'allergy-' || gen_random_uuid(),
      'name', allergy_text,
      'type', 'other',
      'severity', 'mild',
      'notes', ''
    );
  END;
  
  -- Ensure all required fields exist
  RETURN jsonb_build_object(
    'id', COALESCE(allergy_json->>'id', 'allergy-' || gen_random_uuid()),
    'name', COALESCE(allergy_json->>'name', 'Unknown Allergy'),
    'type', COALESCE(allergy_json->>'type', 'other'),
    'severity', COALESCE(allergy_json->>'severity', 'mild'),
    'notes', COALESCE(allergy_json->>'notes', '')
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.parse_allergy_object(TEXT) TO authenticated, anon;