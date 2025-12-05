# Netflix Household Code Getter

A simple single-page web application that searches an admin email inbox for Netflix Household/Temporary Access codes.

## Features

- **Simple UI**: Enter an email address to search for Netflix codes
- **IMAP Integration**: Connects to your email server via IMAP
- **Smart Filtering**: Only finds Household/Temporary Access emails (ignores sign-in and password reset emails)
- **Code Extraction**: Automatically extracts the 4-digit access code from emails

## Technology Stack

- **Frontend**: React + Tailwind CSS
- **Backend**: Express.js + Node IMAP
- **Styling**: Netflix-inspired dark theme

## Setup

1. Set up the following environment variables (secrets):
   - `EMAIL_ADDRESS`: Your admin email address
   - `EMAIL_PASSWORD`: Your email app password
   - `EMAIL_SERVER`: IMAP server (default: imap.gmail.com)
   - `EMAIL_PORT`: IMAP port (default: 993)
   - `EMAIL_TLS`: Use TLS (default: true)

2. For Gmail users:
   - Enable 2-Factor Authentication
   - Generate an App Password at https://myaccount.google.com/apppasswords
   - Use the App Password as `EMAIL_PASSWORD`

## Usage

1. Enter the Netflix account email address in the search field
2. Click "FIND CODE"
3. The app will search the admin inbox for Netflix household emails sent to that address
4. If found, the access code and email content will be displayed

## API Endpoint

- **POST** `/api/findcode`
- **Body**: `{ "email": "user@example.com" }`
- **Response**:
  ```json
  {
    "subject": "Email subject",
    "receivedAt": "2024-01-01T00:00:00.000Z",
    "bodySnippet": "Email content preview...",
    "accessCode": "1234",
    "link": "https://netflix.com/..."
  }
  ```

## Notes

- The app searches for emails from `info@account.netflix.com`
- Only Household and Temporary Access emails are returned
- Sign-in codes and password reset emails are filtered out
