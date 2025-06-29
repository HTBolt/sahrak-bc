# Sahrak Healthcare App

A comprehensive healthcare management platform built with React, TypeScript, and custom authentication.

## Features

- **Custom OTP Authentication**: Secure email-based authentication with custom OTP verification
- **Medication Management**: Track medications, schedules, and intake history
- **Appointment Scheduling**: Manage medical appointments with reminders
- **Health Metrics Tracking**: Monitor vital signs and wellness indicators
- **Mood Tracking**: Log and analyze mental health patterns
- **Document Management**: Store and organize medical documents
- **Emergency SOS**: Quick access to emergency contacts and medical information
- **AI Wellness Companion**: Personalized health guidance and support
- **Caregiver Network**: Share health information with trusted caregivers

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Custom OTP system with email verification
- **Build Tool**: Vite
- **Icons**: Lucide React
- **Charts**: Recharts
- **Forms**: React Hook Form
- **Animations**: Framer Motion

## Custom Authentication System

This application uses a custom authentication system instead of Supabase Auth to provide:

- Better control over rate limiting
- Custom OTP verification flow
- Flexible user management
- No dependency on external auth providers

### Database Schema

The custom auth system includes:

- `auth_users`: User accounts and profile information
- `auth_otp_codes`: OTP verification codes with expiration
- `auth_sessions`: User session management
- `user_profiles`: Extended user profile data

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sahrak-healthcare-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file with:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run database migrations**
   Apply the custom auth migration to set up the authentication tables.

5. **Configure email service**
   Update the `sendOTPEmail` function in `src/lib/customAuth.ts` to use your preferred email service (SendGrid, AWS SES, etc.).

6. **Start the development server**
   ```bash
   npm run dev
   ```

## Email Service Integration

The custom authentication system requires an email service to send OTP codes. Update the `sendOTPEmail` function in `src/lib/customAuth.ts` with your email service configuration:

```typescript
private async sendOTPEmail(email: string, code: string, purpose: string): Promise<void> {
  // Replace with your email service implementation
  // Examples: SendGrid, AWS SES, Mailgun, Resend
}
```

## Development Mode

In development mode, OTP codes are logged to the console for testing purposes. Check the browser console for the verification codes when testing authentication.

## Security Features

- Row Level Security (RLS) enabled on all tables
- Secure session management with token expiration
- Rate limiting on OTP requests
- Input validation and sanitization
- HTTPS-only cookie settings in production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.