/*
  # Add set_config function for RLS

  1. New Functions
    - `set_config` - Function to set session variables for Row Level Security
      - `setting_name` (text) - The name of the setting to configure
      - `setting_value` (text) - The value to set
      - `is_local` (boolean) - Whether to set locally (default: true)

  2. Security
    - Function is accessible to authenticated and anonymous users
    - Required for custom authentication system to work with RLS policies

  This function enables the custom auth system to set the `app.current_user_id` 
  session variable that RLS policies can reference.
*/

CREATE OR REPLACE FUNCTION public.set_config(setting_name text, setting_value text, is_local boolean DEFAULT true)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF is_local THEN
    EXECUTE format('SET LOCAL %I = %L', setting_name, setting_value);
  ELSE
    EXECUTE format('SET %I = %L', setting_name, setting_value);
  END IF;
  RETURN setting_value;
END;
$$;

-- Grant execute permissions to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.set_config(text, text, boolean) TO anon, authenticated;