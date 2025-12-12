import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

// Check if email contains relevant Netflix links
function isRelevantNetflixLinkEmail(htmlContent, textContent) {
    if (!htmlContent && !textContent) return false;

    const linkPrefix1 = 'https://www.netflix.com/account/travel/verify';
    const linkPrefix2 = 'https://www.netflix.com/account/update-primary-location';
    const content = (htmlContent || '') + (textContent || '');

    return content.includes(linkPrefix1) || content.includes(linkPrefix2);
}

function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return null;

    const trimmedUrl = url.trim();
    let urlObj;
    
    try {
        urlObj = new URL(trimmedUrl);
    } catch (e) {
        return null;
    }

    const protocol = urlObj.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
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

    const isAllowed = allowedDomains.some(domain => {
        return hostname === domain || hostname.endsWith('.' + domain);
    });

    if (!isAllowed) return null;
    return trimmedUrl;
}

async function sanitizeAndStyleHtml(html) {
    if (!html || html.trim() === "") return html;

    let processedHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    processedHtml = processedHtml.replace(/<a([^>]*)href\s*=\s*['"]([^'"]*)['"]([^>]*)>/gi, (match, preAttrs, url, postAttrs) => {
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
    });

    return `<div class="netflix-email-original">${processedHtml}</div>`;
}

function getUserFriendlyError(error) {
    const errorMessage = error.message || error.toString();

    if (errorMessage.includes("AUTHENTICATIONFAILED") || errorMessage.includes("Invalid credentials")) {
        return "Email login failed. The email or app password may be incorrect.";
    }
    if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("getaddrinfo")) {
        return "Could not connect to email server. Please check your internet connection.";
    }
    if (errorMessage.includes("ETIMEDOUT") || errorMessage.includes("timeout")) {
        return "Connection timed out. Please try again.";
    }
    if (errorMessage.includes("ECONNREFUSED")) {
        return "Connection refused by email server. Please try again later.";
    }

    return "Something went wrong while searching emails. Please try again.";
}

// SUPER FAST VERSION - Using ImapFlow (Modern IMAP Client)
async function searchNetflixEmails(imapConfig, userEmail) {
    const client = new ImapFlow({
        host: imapConfig.host,
        port: imapConfig.port,
        secure: true,
        auth: {
            user: imapConfig.user,
            pass: imapConfig.password
        },
        logger: false,
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        // Connect with 10 second timeout
        await Promise.race([
            client.connect(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('ETIMEDOUT: Connection timeout')), 10000)
            )
        ]);

        // Open inbox
        await client.mailboxOpen('INBOX');

        const now = new Date();
        const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
        
        // Search last 2 hours to get all emails, then filter by 15 minutes
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        
        // Format date for IMAP search
        const formatDate = (date) => {
            const day = date.getDate();
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const month = monthNames[date.getMonth()];
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        };

        // Search for Netflix emails
        const searchResult = await client.search({
            from: 'netflix.com',
            since: formatDate(twoHoursAgo)
        });

        if (!searchResult || searchResult.length === 0) {
            await client.logout();
            return [];
        }

        console.log(`Found ${searchResult.length} Netflix emails in last 2 hours`);

        // Fetch ALL emails (no limit) - reversed to get newest first
        const messages = [];
        
        // Process in batches of 100 for speed
        const batchSize = 100;
        const emailIds = Array.from(searchResult).reverse(); // Newest first
        
        for (let i = 0; i < emailIds.length; i += batchSize) {
            const batch = emailIds.slice(i, i + batchSize);
            
            for await (let message of client.fetch(batch, { 
                source: true,
                envelope: true,
                internalDate: true
            })) {
                try {
                    const parsed = await simpleParser(message.source);
                    if (parsed && parsed.date) {
                        messages.push(parsed);
                    }
                } catch (e) {
                    console.error('Parse error:', e);
                }
            }
            
            // Stop if we have enough recent emails
            if (messages.length > 0) {
                const oldestProcessed = new Date(messages[messages.length - 1].date);
                if (oldestProcessed < fifteenMinutesAgo) {
                    break; // No need to fetch older emails
                }
            }
        }

        await client.logout();

        console.log(`Parsed ${messages.length} emails`);

        const userEmailLower = userEmail.toLowerCase().trim();

        // Filter for user's emails
        const userEmails = messages.filter(email => {
            const toText = (email.to?.text || '').toLowerCase();
            const ccText = (email.cc?.text || '').toLowerCase();
            const htmlText = (email.html || '').toLowerCase();
            
            return toText.includes(userEmailLower) || 
                   ccText.includes(userEmailLower) ||
                   htmlText.includes(userEmailLower);
        });

        console.log(`${userEmails.length} emails for user ${userEmail}`);

        // Filter by EXACT 15 minutes
        const recentEmails = userEmails.filter(email => {
            return new Date(email.date) >= fifteenMinutesAgo;
        });

        console.log(`${recentEmails.length} emails in last 15 minutes`);

        // Sort newest first (already should be, but ensure)
        recentEmails.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Find LATEST relevant email
        const relevantEmail = recentEmails.find(email => 
            isRelevantNetflixLinkEmail(email.html, email.text)
        );

        if (!relevantEmail) {
            return [];
        }

        console.log(`Found relevant email: ${relevantEmail.subject}`);

        // Format email
        const sanitizedHtml = await sanitizeAndStyleHtml(relevantEmail.html || '');

        const formatted = {
            id: relevantEmail.messageId || `${Date.now()}-${Math.random()}`,
            subject: relevantEmail.subject || "Email",
            receivedAt: relevantEmail.date ? relevantEmail.date.toISOString() : new Date().toISOString(),
            from: relevantEmail.from?.text || "",
            to: relevantEmail.to?.text || "",
            rawHtml: sanitizedHtml,
        };

        return [formatted];

    } catch (error) {
        console.error('IMAP Error:', error);
        try {
            await client.logout();
        } catch (e) {
            // Ignore
        }
        throw error;
    }
}

// HANDLER
export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: "Please enter an email address to search." });
    }

    const imapConfig = {
        user: process.env.EMAIL_ADDRESS,
        password: process.env.EMAIL_PASSWORD,
        host: process.env.EMAIL_SERVER || "imap.gmail.com",
        port: parseInt(process.env.EMAIL_PORT || "993", 10),
    };

    if (!imapConfig.user || !imapConfig.password) {
        return res.status(500).json({
            error: "Email service is not configured."
        });
    }

    console.log(`Searching emails for: ${email}`);
    const startTime = Date.now();

    try {
        const results = await searchNetflixEmails(imapConfig, email);
        const duration = Date.now() - startTime;
        
        console.log(`Search completed in ${duration}ms`);
        
        if (results && results.length > 0) {
            res.status(200).json({ 
                emails: results, 
                totalCount: results.length 
            });
        } else {
            res.status(404).json({
                error: "No Netflix email found for this address in the last 15 minutes."
            });
        }
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`Error after ${duration}ms:`, error);
        res.status(500).json({ 
            error: getUserFriendlyError(error) 
        });
    }
}
