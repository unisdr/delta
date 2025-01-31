-- Custom SQL migration file, put you code below! --

-- Step 1: Create a temporary column to store the user_id as an integer
ALTER TABLE audit_logs ADD COLUMN user_id_temp INTEGER;

-- Step 2: Update the user_id_temp column with the user_id values
UPDATE audit_logs SET user_id_temp = user_id::INTEGER;

-- Step 3: Drop the existing user_id column
ALTER TABLE audit_logs DROP COLUMN user_id;

-- Step 4: Rename the user_id_temp column to user_id
ALTER TABLE audit_logs RENAME COLUMN user_id_temp TO user_id;

-- Step 5: Add a foreign key constraint referencing the user table
ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE;
