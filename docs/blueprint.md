# **App Name**: LOCKr

## Core Features:

- User Authentication: Secure user authentication using Supabase Auth for signup, login, logout, and password reset.
- Dashboard: Dashboard providing a clear listing of saved credentials, including search and filter functionality to easily find specific entries.
- Password Entry Form: Form for adding and editing password entries, including fields for website, username, encrypted password, and optional notes.
- Client-Side Encryption: Client-side AES-256 encryption utility to encrypt and decrypt passwords, ensuring no plain text passwords are stored.
- Account Settings: Settings page where users can manage their profile information, change their password, log out, and delete their account.
- Password Generator: Generate strong, random passwords based on user-defined criteria such as length, inclusion of symbols, numbers and upper-case characters.
- Secure Storage: Store only encrypted values in Supabase. Row Level Security (RLS) policies in Supabase ensure users can only manage their own passwords.

## Style Guidelines:

- Primary color: Dark blue (#30475E) to convey security and trust.
- Background color: Very dark blue (#222831), a desaturated version of the primary for a dark scheme.
- Accent color: Teal (#00ADB5), a vibrant contrast to the primary for interactive elements.
- Font pairing: 'Space Grotesk' (sans-serif) for headlines and 'Inter' (sans-serif) for body text. 'Source Code Pro' for displaying computer code.
- Simple, outline-style icons for navigation and actions to maintain a clean and modern aesthetic.
- Clean, minimal layout with ample spacing to avoid clutter and ensure ease of use.
- Subtle transitions and animations for interactive elements, enhancing user experience without being distracting.