# Netflix Household Code Getter

A simple tool to retrieve Netflix household access codes from an email inbox.

## Features
- **Frontend:** React + Tailwind CSS (Netflix-inspired Dark Mode)
- **Backend Logic:** Express.js + IMAP (Mocked in this prototype)

## Setup

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file based on `.env.example`.
4.  Run the development server:
    ```bash
    npm run dev
    ```

## Backend Implementation (Required for Real Functionality)

This project is currently in **Mockup Mode**. The frontend simulates a successful response. To make it functional, you need to implement the backend route in `server/routes.ts`:

1.  **Install Dependencies:** `npm install node-imap simple-parser`
2.  **Connect IMAP:** Use `node-imap` to connect to your admin email.
3.  **Search Logic:**
    - Search for emails from `info@account.netflix.com` (or similar).
    - Filter by Subject: "Important: How to update your Netflix Household".
    - Parse the HTML body to find the 4-digit code.

## API Endpoint (Mocked)

-   **POST** `/api/findcode`
-   **Body:** `{ "email": "user@example.com" }`
-   **Response:**
    ```json
    {
      "subject": "...",
      "accessCode": "1234",
      "link": "..."
    }
    ```
