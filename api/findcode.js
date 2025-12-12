import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

// Check if email contains relevant Netflix links - RELAXED VERSION
function isRelevantNetflixLinkEmail(htmlContent, textContent) {
    if (!htmlContent && !textContent) return false;

    // Primary verification links
    const linkPrefix1 = 'https://www.netflix.com/account/travel/verify';
    const linkPrefix2 = 'https://www.netflix.com/account/update-primary-location';
    
    // Additional patterns to catch
    const patterns = [
        'netflix.com/account/travel',
        'netflix.com/account/update',
        'travel/verify',
        'update-primary-location',
        'temporary-access',
        'verify-device',
        'yesitwasme',
        'yes-it-was-me'
    ];
    
    const content = (htmlContent || '') + (textContent || '');
    const contentLower = content.toLowerCase();

    // Check exact links first
    if (content.includes(linkPrefix1) || content.includes(linkPrefix2)) {
        return true;
    }
    
    // Check for any verification patterns
    for (const pattern of patterns) {
        if (contentLower.includes(pattern.toLowerCase())) {
            console.log(`✓ Found pattern: ${pattern}`);
            return true;
        }
    }
    
    return false;
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
        
        console.log(`Current time (UTC): ${now.toISOString()}`);
        console.log(`15 minutes ago: ${fifteenMinutesAgo.toISOString()}`);
        
        // Format date for IMAP search (SINCE only supports date, not time)
        // So we'll search from today and filter by exact time
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        
        const formatDate = (date) => {
            const day = date.getDate();
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const month = monthNames[date.getMonth()];
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        };

        console.log(`Searching emails from today: ${formatDate(today)}`);

        // Search: Netflix emails TO this user from TODAY
        let searchResult;
        try {
            searchResult = await client.search({
                to: userEmail,  // Direct TO filter
                from: 'netflix.com',  // Direct FROM filter
                since: formatDate(today)  // Today's emails only
            });
            console.log(`✓ Found ${searchResult.length} Netflix emails TO ${userEmail} today`);
        } catch (searchError) {
            console.error('❌ Search failed:', searchError);
            await client.logout();
            throw searchError;
        }

        if (!searchResult || searchResult.length === 0) {
            console.log('❌ No emails found in search');
            await client.logout();
            return [];
        }

        // Fetch only the found emails (should be very few now)
        const messages = [];
        
        const emailIds = Array.from(searchResult).reverse(); // Newest first
        console.log(`Fetching ${emailIds.length} emails...`);
        
        let fetchedCount = 0;
        for await (let message of client.fetch(emailIds, { 
            source: true,
            envelope: true,
            internalDate: true
        })) {
            try {
                const parsed = await simpleParser(message.source);
                if (parsed && parsed.date) {
                    messages.push(parsed);
                    fetchedCount++;
                }
            } catch (e) {
                console.error('Parse error:', e);
            }
        }

        await client.logout();

        console.log(`✓ Successfully parsed ${messages.length} emails`);

        const userEmailLower = userEmail.toLowerCase().trim();

        // All emails are already Netflix TO this user, just verify
        const netflixEmails = messages.filter(email => {
            const fromText = (email.from?.text || '').toLowerCase();
            const isFromNetflix = fromText.includes('netflix');
            
            if (!isFromNetflix) {
                console.log(`Skipping non-Netflix: ${email.from?.text}`);
                return false;
            }
            
            console.log(`✓ Netflix email: ${email.subject} (${email.date})`);
            return true;
        });

        console.log(`${netflixEmails.length} verified Netflix emails`);

        // Filter by EXACT 15 minutes
        const recentEmails = netflixEmails.filter(email => {
            const emailDate = new Date(email.date);
            const isRecent = emailDate >= fifteenMinutesAgo;
            
            console.log(`Email: "${email.subject}" | Date: ${emailDate.toISOString()} | Recent: ${isRecent}`);
            
            return isRecent;
        });

        console.log(`${recentEmails.length} emails in last 15 minutes`);

        // Sort newest first (already should be, but ensure)
        recentEmails.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Find LATEST relevant email
        const relevantEmail = recentEmails.find(email => {
            const hasRelevantLink = isRelevantNetflixLinkEmail(email.html, email.text);
            if (hasRelevantLink) {
                console.log(`✓ Found relevant link in: ${email.subject}`);
            } else {
                console.log(`✗ No relevant link in: ${email.subject}`);
            }
            return hasRelevantLink;
        });

        if (!relevantEmail) {
            console.log('❌ No email with relevant Netflix links found');
            console.log('Recent emails subjects:', recentEmails.map(e => e.subject));
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
        console.log(`Results:`, results ? results.length : 0, 'emails');
        
        if (results && results.length > 0) {
            console.log('Sending response with email data');
            return res.status(200).json({ 
                emails: results, 
                totalCount: results.length 
            });
        } else {
            console.log('No emails found - sending 404');
            return res.status(404).json({
                error: "No Netflix email found for this address in the last 15 minutes."
            });
        }
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`Error after ${duration}ms:`, error);
        return res.status(500).json({ 
            error: getUserFriendlyError(error) 
        });
    }
}
