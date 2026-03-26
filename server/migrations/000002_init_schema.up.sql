-- This migration assumes the 'videos' table already exists with a 'SERIAL' id column.
-- We are changing the type from SERIAL to VARCHAR, which requires multiple steps.

-- Step 1: Add a new, temporary column with the desired VARCHAR type.
ALTER TABLE videos ADD COLUMN new_id VARCHAR(255);

-- Step 2: Update the new column with the values from the old SERIAL column.
-- The ::TEXT cast is required to convert the integer to a string.
UPDATE videos SET new_id = id::TEXT;

-- Step 3: Remove the old SERIAL id column.
ALTER TABLE videos DROP COLUMN id;

-- Step 4: Rename the new column to 'id'.
ALTER TABLE videos RENAME COLUMN new_id TO id;

-- Step 5: Add the PRIMARY KEY constraint back to the new 'id' column.
ALTER TABLE videos ADD PRIMARY KEY (id);