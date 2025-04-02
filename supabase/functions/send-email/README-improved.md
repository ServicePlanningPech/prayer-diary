# Email Sending Edge Function

This Supabase Edge Function allows sending emails directly from the client through Google SMTP.

## Troubleshooting Common Issues

### CORS Errors
If you're getting CORS errors like:
```
Access to fetch at 'https://your-project.supabase.co/functions/v1/send-email' has been blocked by CORS policy
```

**Solution**: Update the CORS configuration, being sure to include all necessary headers:
```bash
# Add your domain to allowed origins
supabase functions update-cors send-email --add-origins="https://serviceplanningpech.github.io"

# Allow specific headers that Supabase uses for authentication
supabase functions update-cors send-email --add-headers="apikey,Authorization,x-client-info,Content-Type"
```

**Important**: The `apikey` header is specifically required for Supabase client requests. If you see an error about "Request header field apikey is not allowed," make sure to include it in your allowed headers.

### Function Not Found
If you're getting errors like:
```
Function not found: send-email
```

**Solution**: Deploy the function:
```bash
supabase functions deploy send-email
```

### Authentication Errors
If you're getting authentication errors:

**Solution**: Allow anonymous invocations if your app doesn't require authentication:
```bash
supabase functions update-permissions send-email --no-verify-jwt
```

## Deployment Steps

Follow these step-by-step instructions:

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your local project** (replace with your actual project ID):
   ```bash
   supabase link --project-ref ozwcgtfoyfvwlgjokrix
   ```

4. **Deploy the function**:
   ```bash
   supabase functions deploy send-email
   ```

5. **Set up CORS** (replace with your actual domain):
   ```bash
   supabase functions update-cors send-email --add-origins="https://serviceplanningpech.github.io"
   ```

6. **Allow anonymous access** (if needed):
   ```bash
   supabase functions update-permissions send-email --no-verify-jwt
   ```

7. **Set required secrets for SMTP**:
   ```bash
   supabase secrets set SMTP_HOSTNAME=smtp.gmail.com
   supabase secrets set SMTP_PORT=465
   supabase secrets set SMTP_USERNAME=your-email@gmail.com
   supabase secrets set SMTP_PASSWORD=your-app-password
   supabase secrets set DEFAULT_FROM="Prayer Diary <prayerdiary@pech.co.uk>"
   ```

## Google SMTP Setup (Gmail)

1. **Enable 2-Step Verification** for your Google account
   - Go to your Google Account → Security 
   - Enable 2-Step Verification if not already enabled

2. **Create an App Password**:
   - Go to your Google Account
   - Select Security
   - Under "Signing in to Google," select App Passwords
   - Select "Other" from the dropdown and enter "Prayer Diary"
   - Click "Generate"
   - Use the generated 16-character password as your SMTP_PASSWORD

## Testing the Function

### Test via Command Line:
```bash
curl -X POST "https://ozwcgtfoyfvwlgjokrix.supabase.co/functions/v1/send-email" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96d2NndGZveWZ2d2xnam9rcml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NDI0MzIsImV4cCI6MjA1OTAxODQzMn0.IRQRv26j9j-VcJT8p91DiA6kHs_c8b2R12Akp38ahZE" \
  -H "Content-Type: application/json" \
  -d '{"testConnection": true}'
```

### Quick Connection Test:
```bash
curl -X GET "https://ozwcgtfoyfvwlgjokrix.supabase.co/functions/v1/send-email" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96d2NndGZveWZ2d2xnam9rcml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NDI0MzIsImV4cCI6MjA1OTAxODQzMn0.IRQRv26j9j-VcJT8p91DiA6kHs_c8b2R12Akp38ahZE"
```

### Send Test Email:
```bash
curl -X POST "https://ozwcgtfoyfvwlgjokrix.supabase.co/functions/v1/send-email" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96d2NndGZveWZ2d2xnam9rcml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NDI0MzIsImV4cCI6MjA1OTAxODQzMn0.IRQRv26j9j-VcJT8p91DiA6kHs_c8b2R12Akp38ahZE" \
  -H "Content-Type: application/json" \
  -d '{"to": "your-email@example.com", "subject": "Test Email", "html": "<p>This is a test email.</p>"}'
```

## Function Structure

The function handles:

1. **CORS Pre-flight requests**: Properly responds to OPTIONS requests
2. **Connection testing**: Handles test requests without sending actual emails
3. **Email validation**: Checks for required fields and proper formatting
4. **SMTP connection**: Connects to the configured SMTP server
5. **Email sending**: Sends the email with all specified parameters
6. **Error handling**: Provides detailed error information for debugging

## Client Usage Example

```javascript
// Test if function is deployed and reachable
const { data: testData, error: testError } = await supabase.functions.invoke('send-email', {
  body: { testConnection: true }
});

// Send an actual email
const { data, error } = await supabase.functions.invoke('send-email', {
  body: {
    to: 'recipient@example.com',
    subject: 'Test Email',
    html: '<p>This is a test email</p>',
    cc: 'cc@example.com',                          // optional
    bcc: 'bcc@example.com',                        // optional
    replyTo: 'reply@example.com',                  // optional
    from: 'Custom Sender <sender@example.com>'     // optional
  }
});
```

## Troubleshooting Edge Function Deployment

### Viewing function logs:
```bash
supabase functions logs send-email
```

### Redeploying the function:
```bash
supabase functions delete send-email
supabase functions deploy send-email
```

### Checking function status:
```bash
supabase functions list
```
