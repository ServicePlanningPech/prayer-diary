# Prayer Diary Database Scripts

This folder contains SQL scripts for setting up and maintaining the Prayer Diary database in Supabase.

## Scripts Overview

- `schema.sql` - Main database schema with tables, policies, and triggers
- `complete_auth_profiles_fix.sql` - Complete solution to fix the auth-profiles relationship
- `create_auth_view.sql` - Creates a secure view of auth users
- `create_user_functions.sql` - Creates functions to get user email and full name
- `update_user_trigger.sql` - Updates the handle_new_user trigger function
- `create_profiles_with_emails_function.sql` - Creates a function to get all profiles with emails
- `fix_foreign_key_relationship.sql` - Original foreign key relationship fix

## How to Use

1. Log in to your Supabase dashboard
2. Click on your project
3. In the left sidebar, click on "SQL Editor"
4. Click "New Query"
5. Copy and paste the content of the script you want to run
6. Click "Run" to execute the script

## Recommended Order of Execution

If setting up a new database:
1. `schema.sql`
2. `complete_auth_profiles_fix.sql`

If fixing an existing database:
1. `create_auth_view.sql`
2. `create_user_functions.sql`
3. `update_user_trigger.sql`
4. `create_profiles_with_emails_function.sql`

## Important Notes

- The `complete_auth_profiles_fix.sql` script combines all the individual fixes
- Running these scripts requires admin access to your Supabase project
- After running these scripts, the corresponding JavaScript code in the app will need to be updated
