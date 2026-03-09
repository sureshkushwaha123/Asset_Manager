## Packages
recharts | Dashboard analytics charts and data visualization
date-fns | Human-readable date formatting
lucide-react | High-quality icons for the UI
jwt-decode | Safely decoding JWT tokens for auth state

## Notes
- Authentication uses a JWT token stored in `localStorage` ('auth_token').
- All API requests intercept and attach `Authorization: Bearer <token>`.
- Unauthenticated responses (401) automatically clear the token and redirect to `/login`.
- For charts, numerical values from the backend (PostgreSQL `numeric`) are parsed from strings to floats on the frontend.
