# Netflix Household Code Getter

## Overview

This is a single-page web application that retrieves Netflix Household and Temporary Access codes by searching an administrative email inbox via IMAP. Users enter a Netflix account email address, and the application searches the configured admin inbox for Netflix household access emails sent to that address, extracting and displaying the 4-digit access code.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Problem**: Need a simple, responsive UI for email lookup with real-time feedback.

**Solution**: React-based single-page application with Tailwind CSS for styling.

- **Component Library**: Radix UI components for accessible, pre-built UI primitives
- **Styling**: Tailwind CSS with a custom Netflix-inspired dark theme (Netflix red #E50914 as primary color)
- **State Management**: TanStack Query (React Query) for server state management
- **Forms**: React Hook Form with Zod resolvers for form validation
- **Build Tool**: Vite for fast development and optimized production builds

**Rationale**: This stack provides a modern, maintainable frontend with excellent DX. Radix UI ensures accessibility, while Tailwind enables rapid UI development with the Netflix aesthetic.

### Backend Architecture

**Problem**: Need to securely connect to email servers and parse Netflix emails to extract access codes.

**Solution**: Express.js server with IMAP email integration.

- **Server Framework**: Express.js with HTTP server
- **Email Integration**: Node IMAP library for IMAP protocol connections
- **Email Parsing**: mailparser for extracting email content and metadata
- **API Design**: Single POST endpoint (`/api/findcode`) that accepts email address and returns code information
- **Static File Serving**: Express static middleware for production SPA delivery

**Rationale**: Express provides a lightweight, flexible server framework. IMAP integration allows direct inbox access without requiring email forwarding or webhooks. The simple REST API design fits the single-purpose nature of the application.

### Development vs Production Architecture

**Problem**: Different requirements for development (HMR, debugging) vs production (performance, bundling).

**Solution**: Conditional middleware and build pipeline.

- **Development**: Vite dev server middleware with HMR, Replit-specific plugins (runtime error overlay, cartographer, dev banner)
- **Production**: Pre-built static assets served by Express, bundled server code via esbuild
- **Build Process**: Separate client (Vite) and server (esbuild) builds, bundling all dependencies except native modules

**Pros**: Fast development iteration with HMR, optimized production bundles
**Cons**: Additional build complexity

### Storage Strategy

**Problem**: Application needs user schema definitions but doesn't currently persist data.

**Solution**: In-memory storage implementation with database-ready schema.

- **Current Implementation**: MemStorage class with Map-based user storage (not actively used by Netflix code feature)
- **Schema**: Zod schemas defined for future database integration
- **Database Dependencies**: Drizzle ORM and Neon serverless PostgreSQL client included but not configured

**Rationale**: The application is stateless for its core functionality (email lookup), but includes infrastructure for potential future features like user accounts or code history. The in-memory implementation allows the app to run without database setup.

### Configuration Management

**Problem**: Sensitive email credentials and server settings need to be configurable.

**Solution**: Environment variable-based configuration.

- **Email Settings**: EMAIL_ADDRESS, EMAIL_PASSWORD, EMAIL_SERVER, EMAIL_PORT, EMAIL_TLS
- **Runtime Environment**: NODE_ENV for development/production mode switching
- **Security**: App passwords recommended for Gmail (2FA required)

**Rationale**: Environment variables are industry standard for secrets management and deployment configuration. Supports multiple email providers through configurable IMAP settings.

### Request/Response Flow

1. User enters email address in React frontend
2. Frontend sends POST request to `/api/findcode` with email
3. Server establishes IMAP connection using environment credentials
4. Server searches inbox for Netflix emails containing the user's email address
5. Server filters out sign-in/password reset emails, finds household/temporary access emails
6. Server parses email, extracts 4-digit code and metadata
7. Server returns JSON with code, subject, timestamp, and email snippet
8. Frontend displays results or error message

## External Dependencies

### Email Services

- **IMAP Server**: Configurable email server (default: Gmail imap.gmail.com:993)
- **Authentication**: App-specific passwords for email account access
- **Protocol**: IMAP over TLS for secure email retrieval

### Third-Party Libraries

**Frontend**:
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Comprehensive accessible UI component library
- **react-hook-form**: Form state and validation
- **zod**: Runtime type validation and schema definition
- **tailwindcss**: Utility-first CSS framework
- **cmdk**: Command palette component
- **date-fns**: Date formatting utilities
- **embla-carousel-react**: Carousel component

**Backend**:
- **imap**: IMAP protocol client for email server connections
- **mailparser**: Email parsing and content extraction
- **express**: HTTP server framework
- **translatte**: Free translation library for auto-translating email content to English
- **drizzle-orm**: Type-safe ORM (included but not actively used)
- **@neondatabase/serverless**: Serverless PostgreSQL client (included but not actively used)

**Build Tools**:
- **vite**: Frontend build tool and dev server
- **esbuild**: Server-side bundler
- **tsx**: TypeScript execution for development

### Potential Database Integration

The application includes dependencies for PostgreSQL integration:
- Drizzle ORM for type-safe database queries
- Neon serverless PostgreSQL driver
- connect-pg-simple for session storage

These are configured but not currently utilized by the core email lookup functionality. They provide infrastructure for future features like code history, user accounts, or analytics.

## Vercel Deployment

The application is configured for Vercel deployment with:
- **vercel.json**: Configuration file for Vercel deployment
- **api/findcode.js**: Serverless function for the API endpoint
- **Build Output**: Static frontend built to `dist/public`

### Deployment Steps for Vercel:
1. Connect the repository to Vercel
2. Set the following environment variables in Vercel dashboard:
   - `EMAIL_ADDRESS`: Admin email address for IMAP connection
   - `EMAIL_PASSWORD`: App password for the email account
   - `EMAIL_SERVER`: IMAP server (default: imap.gmail.com)
   - `EMAIL_PORT`: IMAP port (default: 993)
   - `EMAIL_TLS`: Enable TLS (default: true)
3. Deploy - Vercel will automatically build and deploy

## Recent Changes

- **Vercel API Fix (Dec 2025)**: Fixed `api/findcode.js` to return the same `{ emails: [...], totalCount: ... }` format as the Express backend, ensuring Vercel serverless deployment works correctly
- **Link Display Improvement (Dec 2025)**: Updated frontend to show only clickable link labels instead of full email content. Links now display with labels like "Go to Account" or "Open Netflix" that open in new tabs
- **Access Code Display**: Added prominent display of 4-digit access codes when found in emails
- **Translation Feature**: Email subjects and content are now automatically translated to English using the translatte library
- **Production Ready**: All console.log statements removed for production deployment
- **Vercel Ready**: Added Vercel configuration and serverless API function