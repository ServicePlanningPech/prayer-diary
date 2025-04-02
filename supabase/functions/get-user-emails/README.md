# Get User Emails Edge Function

This Supabase Edge Function securely retrieves user emails for a given list of profile IDs.

## Purpose

This function solves the problem of retrieving user emails on the client side without requiring admin privileges. It:

1. Runs with service role credentials on the server, allowing it to access auth.users
2. Accepts an array of profile IDs
3. Returns a mapping of IDs to email addresses
4. Handles security and CORS properly

## Deployment

### Prerequisites
- Supabase CLI installed
- Logged in to your Supabase account via CLI
- Correct project linked

### Deploy the Function

```bash
# Navigate to your project root
cd [your-project-directory]

# Deploy the function
supabase functions deploy get-user-emails --project-ref [your-project-reference-id]
```

### Environment Variables

This function requires these environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (has higher privileges)

Set them using:

```bash
supabase secrets set SUPABASE_URL=[your-supabase-url] --project-ref [your-project-reference-id]
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key] --project-ref [your-project-reference-id]
```

## Testing

You can test the function using:

```bash
curl -X POST "https://[your-project-reference-id].supabase.co/functions/v1/get-user-emails" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [your-anon-key]" \
  -d '{ "profileIds": ["user-id-1", "user-id-2"] }'
```

## Usage in Frontend Code

```javascript
// Example of how to use this in your frontend code
async function getUserEmails(profileIds) {
  try {
    const { data, error } = await supabase.functions.invoke('get-user-emails', {
      body: { profileIds }
    });
    
    if (error) throw error;
    
    return data.emails; // Returns map of profile ID -> email
  } catch (error) {
    console.error('Error fetching user emails:', error);
    return {};
  }
}
```
