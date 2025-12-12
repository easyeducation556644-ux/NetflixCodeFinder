import { google } from 'googleapis';

// Gmail API Client
function getGmailClient() {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Check relevant Netflix links
function isRelevantNetflixLinkEmail(htmlContent, textContent) {
    if (!htmlContent && !textContent) return false;

    const patterns = [
        'netflix.com/account/travel/verify',
        'netflix.com/account/update-primary-location',
        'netflix.com/account/travel',
        'temporary-access',
        'verify-device',
        'yesitwasme',
        'yes-it-was-me'
    ];
    
    const content = (htmlContent || '') + (textContent || '');
    const contentLower = content.toLowerCase();

    for (const pattern of patterns) {
        if (contentLower.includes(pattern.toLowerCase())) {
            console.log(`✓ Found pattern: ${pattern}`);
            return true;
        }
    }
    
    return false;
}

// Sanitize URL
function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return null;
    
    const trimmedUrl = url.trim();
    let urlObj;
    
    try {
        urlObj = new URL(trimmedUrl);
    } catch (e) {
        return null;
    }

    if (!['http:', 'https:'].includes(urlObj.protocol.toLowerCase())) {
        return null;
    }

    let decodedUrl;
    try {
        decodedUrl = decodeURIComponent(trimmedUrl.toLowerCase());
    } catch (e) {
        decodedUrl = trimmedUrl.toLowerCase();
    }

    const dangerousPatterns = [
        'javascript:', 'data:', 'vbscript:', '<script',
        'onerror', 'onclick', 'onload', 'onmouseover',
    ];

    for (const pattern of dangerousPatterns) {
        if (decodedUrl.includes(pattern)) {
            return null;
        }
    }

    const hostname = urlObj.hostname.toLowerCase();
    const allowedDomains = [
        'netflix.com', 'www.netflix.com', 'nflxso.net',
        'www.nflxso.net', 'email.netflix.com', 'click.netflix.com',
    ];

    const isAllowed = allowedDomains.some(domain => 
        hostname === domain || hostname.endsWith('.' + domain)
    );

    return isAllowed ? trimmedUrl : null;
}

// Style Netflix buttons
async function sanitizeAndStyleHtml(html) {
    if (!html || html.trim() === "") return html;

    let processedHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    processedHtml = processedHtml.replace(
        /<a([^>]*)href\s*=\s*['"]([^'"]*)['"]([^>]*)>/gi, 
        (match, preAttrs, url, postAttrs) => {
            const urlClean = url.replace(/&amp;/g, '&').toLowerCase();
            const safeUrl = sanitizeUrl(url.replace(/&amp;/g, '&'));

            if (!safeUrl) return match;

            const isYesItsMe = urlClean.includes('yesitwasme') ||
                urlClean.includes('yes-it-was-me') || urlClean.includes('yes_it_was_me');
            const isGetCode = urlClean.includes('travel') && urlClean.includes('temporary');

            if (isYesItsMe || isGetCode) {
                let newAttrs = preAttrs + postAttrs;
                const buttonStyle = 'color: #ffffff !important; background-color: #e50914 !important; padding: 5px 10px; border-radius: 4px; display: inline-block; text-decoration: none;';

                if (newAttrs.includes('style=')) {
                    newAttrs = newAttrs.replace(/style\s*=\s*["']([^"']*)["']/i, (m, styles) => {
                        return `style="${styles}; ${buttonStyle}"`;
                    });
                } else {
                    newAttrs = newAttrs + ` style="${buttonStyle}"`;
                }
                return `<a${newAttrs} href="${safeUrl}" target="_blank" rel="noopener noreferrer">`;
            }

            return `<a${preAttrs} href="${safeUrl}"${postAttrs} target="_blank" rel="noopener noreferrer">`;
        }
    );

    return `<div class="netflix-email-original">${processedHtml}</div>`;
}

// 🚀 MAIN FUNCTION - Gmail API Search
async function searchNetflixEmailsGmail(userEmail) {
    const gmail = getGmailClient();
    
    try {
        // Last 15 minutes
        const fifteenMinutesAgo = Math.floor((Date.now() - 15 * 60 * 1000) / 1000);
        
        // 🎯 Powerful Gmail Query
        const query = [
            `from:netflix.com`,
            `to:${userEmail}`,
            `after:${fifteenMinutesAgo}`
        ].join(' ');

        console.log(`🔍 Gmail Query: ${query}`);

        // Step 1: List messages (super fast!)
        const listResponse = await gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: 10
        });

        const messages = listResponse.data.messages;
        
        if (!messages || messages.length === 0) {
            console.log('❌ No Netflix emails found');
            return [];
        }

        console.log(`✓ Found ${messages.length} emails`);

        // Step 2: Fetch full messages
        const emailPromises = messages.map(async (message) => {
            try {
                const fullMessage = await gmail.users.messages.get({
                    userId: 'me',
                    id: message.id,
                    format: 'full'
                });
                return fullMessage.data;
            } catch (error) {
                console.error(`Error fetching ${message.id}:`, error);
                return null;
            }
        });

        const fullMessages = (await Promise.all(emailPromises)).filter(Boolean);

        // Step 3: Parse emails
        const parsedEmails = fullMessages.map(msg => {
            const headers = msg.payload.headers;
            const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name)?.value || '';

            let htmlContent = '';
            let textContent = '';

            function extractBody(part) {
                if (part.mimeType === 'text/html' && part.body.data) {
                    htmlContent = Buffer.from(part.body.data, 'base64').toString('utf-8');
                } else if (part.mimeType === 'text/plain' && part.body.data) {
                    textContent = Buffer.from(part.body.data, 'base64').toString('utf-8');
                }
                if (part.parts) part.parts.forEach(extractBody);
            }

            extractBody(msg.payload);

            return {
                id: msg.id,
                subject: getHeader('subject'),
                from: getHeader('from'),
                to: getHeader('to'),
                date: new Date(getHeader('date')),
                receivedAt: new Date(parseInt(msg.internalDate)),
                htmlContent,
                textContent
            };
        });

        // Sort newest first
        parsedEmails.sort((a, b) => b.receivedAt - a.receivedAt);

        // Filter by 15 minutes (exact time check)
        const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
        const recentEmails = parsedEmails.filter(email => email.receivedAt >= fifteenMinAgo);

        console.log(`${recentEmails.length} emails in last 15 minutes`);

        // Find relevant email
        const relevantEmail = recentEmails.find(email => {
            const hasLink = isRelevantNetflixLinkEmail(email.htmlContent, email.textContent);
            if (hasLink) {
                console.log(`✓ Relevant: ${email.subject}`);
            }
            return hasLink;
        });

        if (!relevantEmail) {
            console.log('❌ No relevant Netflix links found');
            return [];
        }

        // Format response
        const sanitizedHtml = await sanitizeAndStyleHtml(relevantEmail.htmlContent);

        return [{
            id: relevantEmail.id,
            subject: relevantEmail.subject,
            receivedAt: relevantEmail.receivedAt.toISOString(),
            from: relevantEmail.from,
            to: relevantEmail.to,
            rawHtml: sanitizedHtml
        }];

    } catch (error) {
        console.error('Gmail API Error:', error);
        throw error;
    }
}

// Error messages
function getUserFriendlyError(error) {
    const msg = error.message || error.toString();

    if (msg.includes('invalid_grant') || msg.includes('Token has been expired')) {
        return 'Gmail authentication expired. Please refresh the token.';
    }
    if (msg.includes('invalid_client')) {
        return 'Gmail API credentials are invalid.';
    }
    if (msg.includes('insufficient permission')) {
        return 'Insufficient Gmail permissions.';
    }
    if (msg.includes('quotaExceeded')) {
        return 'Gmail API quota exceeded. Try again later.';
    }
    if (msg.includes('ETIMEDOUT') || msg.includes('timeout')) {
        return 'Connection timeout. Please try again.';
    }

    return 'Something went wrong. Please try again.';
}

// 🎯 VERCEL SERVERLESS HANDLER
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ 
            error: 'Please enter an email address to search.' 
        });
    }

    // Check environment variables
    if (!process.env.GOOGLE_CLIENT_ID || 
        !process.env.GOOGLE_CLIENT_SECRET || 
        !process.env.GOOGLE_REFRESH_TOKEN) {
        console.error('Missing Gmail API credentials');
        return res.status(500).json({
            error: 'Gmail API is not configured.'
        });
    }

    console.log(`🔍 Searching for: ${email}`);
    const startTime = Date.now();

    try {
        const results = await searchNetflixEmailsGmail(email);
        const duration = Date.now() - startTime;
        
        console.log(`✅ Completed in ${duration}ms`);
        
        if (results && results.length > 0) {
            return res.status(200).json({ 
                emails: results, 
                totalCount: results.length,
                searchTime: duration
            });
        } else {
            return res.status(404).json({
                error: 'No Netflix email found for this address in the last 15 minutes.',
                searchTime: duration
            });
        }
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ Error after ${duration}ms:`, error);
        
        return res.status(500).json({ 
            error: getUserFriendlyError(error),
            searchTime: duration
        });
    }
    }
