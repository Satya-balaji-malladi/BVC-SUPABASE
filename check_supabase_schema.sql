-- =============================================================================
-- BVC EVENT ATTENDANCE SYSTEM — SUPABASE DATABASE SCHEMA DIAGNOSTIC SCRIPT
-- Run this query in Supabase SQL Editor to display exact table & column names.
-- =============================================================================

SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
ORDER BY 
    table_name, 
    ordinal_position;
