# Email Sending Edge Function

This Supabase Edge Function allows sending emails directly from the client through Google SMTP.

## Deployment

To deploy this function, follow these steps:

1. Make sure you have the Supabase CLI installed and are logged in:
   ```bash
   npm install -g supabase
   supabase login
   ```

2. Link your local project to your Supabase project:
   ```bash
   supabase link --project-ref your-project-id
   ```

3. Set up the required secrets for SMTP:
   ```bash
   supabase secrets set SMTP_HOSTNAME=smtp.gmail.com
   supabase secrets set SMTP_PORT=465
   supabase secrets set SMTP_USERNAME=your-email@gmail.com
   supabase secrets set SMTP_PASSWORD=your-app-password
   supabase secrets set DEFAULT_FROM="Prayer Diary <prayerdiary@pech.co.uk>"
   ```

   > **Important**: For Gmail, you need to create an app-specific password.
   > Go to your Google Account → Security → 2-Step Verification → App passwords
   > and generate a new password for "Prayer Diary".

4. Deploy the function:
   ```bash
   supabase functions deploy send-email
   ```

5. Set function permissions (allow anonymous access if needed):
   ```bash
   supabase functions update-permissions send-email --no-verify-jwt
   ```

## Google SMTP Setup

For Gmail, you need to:

1. Enable 2-Step Verification for your Google account
2. Create an App Password:
   - Go to your Google Account
   - Select Security
   - Under "Signing in to Google," select App Passwords
   - Create a new app password for "Prayer Diary"
   - Use the generated password for SMTP_PASSWORD

## Usage

Once deployed, the function can be called from the client using:

```javascript
const { data, error } = await supabase.functions.invoke('send-email', {
  body: {
    to: 'recipient@example.com',
    subject: 'Test Email',
    html: '<p>This is a test email</p>',
    cc: 'another@example.com', // optional
    bcc: 'hidden@example.com', // optional
    replyTo: 'reply@example.com', // optional
    from: 'Custom Sender <sender@example.com>' // optional, will use DEFAULT_FROM if not specified
  }
})
```

## Error Handling

The function returns appropriate HTTP status codes:

- 200: Email sent successfully
- 400: Missing required parameters
- 405: Method not allowed
- 500: Server error (SMTP failure, etc.)
