import Imap from "imap";
import { simpleParser } from "mailparser";

// IMAP date format converter
function formatImapDate(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// Check if email contains relevant Netflix links
function isRelevantNetflixLinkEmail(htmlContent, textContent) {
    if (!htmlContent && !textContent) return false;

    const linkPrefix1 = 'https://www.netflix.com/account/travel/verify';
    const linkPrefix2 = 'https://www.netflix.com/account/update-primary-location';
    const content = (htmlContent || '') + (textContent || '');

    return content.includes(linkPrefix1) || content.includes(linkPrefix2);
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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
        return "Email login failed. The email or password may be incorrect.";
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
    if (errorMessage.includes("certificate")) {
        return "Security certificate error. Please contact support.";
    }

    return "Something went wrong while searching emails. Please try again.";
}

// MAIN FUNCTION - FIXED VERSION
function searchNetflixEmails(imapConfig, userEmail) {
    return new Promise((resolve, reject) => {
        const imap = new Imap({
            ...imapConfig,
            connTimeout: 10000,  // 10 second connection timeout
            authTimeout: 5000,   // 5 second auth timeout
            keepalive: false     // Disable keepalive for serverless
        });

        let connectionClosed = false;
        const timeoutId = setTimeout(() => {
            if (!connectionClosed) {
                connectionClosed = true;
                imap.end();
                reject(new Error("ETIMEDOUT: Email fetch timeout after 8 seconds"));
            }
        }, 8000); // 8 second max execution time

        const cleanupAndResolve = (result) => {
            if (!connectionClosed) {
                connectionClosed = true;
                clearTimeout(timeoutId);
                imap.end();
                resolve(result);
            }
        };

        const cleanupAndReject = (error) => {
            if (!connectionClosed) {
                connectionClosed = true;
                clearTimeout(timeoutId);
                imap.end();
                reject(error);
            }
        };

        imap.once("ready", () => {
            imap.openBox("INBOX", true, (err, box) => {
                if (err) return cleanupAndReject(err);

                const now = new Date();
                const minutesToFilter = 15;
                const targetTime = new Date(now.getTime() - minutesToFilter * 60 * 1000);
                
                // Search emails from last 1 day to get more results
                const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                
                const searchCriteria = [
                    ['FROM', 'netflix.com'],
                    ['SINCE', formatImapDate(oneDayAgo)]  // Search last 24 hours
                ];

                imap.search(searchCriteria, (err, results) => {
                    if (err) return cleanupAndReject(err);
                    if (!results || results.length === 0) return cleanupAndResolve([]);

                    // Fetch ALL emails found (not just last 50)
                    const fetch = imap.fetch(results, { 
                        bodies: "",
                        struct: true,
                        markSeen: false
                    });
                    
                    const emailPromises = [];

                    fetch.on("message", (msg, seqno) => {
                        const emailPromise = new Promise((resolveEmail) => {
                            let emailData = null;

                            msg.on("body", (stream, info) => {
                                simpleParser(stream, (err, parsed) => {
                                    if (err) {
                                        resolveEmail(null);
                                        return;
                                    }
                                    emailData = parsed;
                                });
                            });

                            msg.once("end", () => {
                                resolveEmail(emailData);
                            });
                        });
                        emailPromises.push(emailPromise);
                    });

                    fetch.once("error", (err) => {
                        cleanupAndReject(err);
                    });

                    fetch.once("end", async () => {
                        try {
                            const emails = await Promise.all(emailPromises);
                            const userEmailLower = userEmail.toLowerCase().trim();

                            // Filter Netflix emails for this user
                            const netflixEmails = emails
                                .filter((email) => email !== null && email.date)
                                .filter((email) => {
                                    const fromAddress = (email.from?.text || "").toLowerCase();
                                    return fromAddress.includes("netflix");
                                })
                                .filter((email) => {
                                    const toAddresses = (email.to?.text || "").toLowerCase();
                                    const ccAddresses = (email.cc?.text || "").toLowerCase();
                                    const htmlContent = (email.html || "").toLowerCase();
                                    
                                    return (
                                        toAddresses.includes(userEmailLower) ||
                                        ccAddresses.includes(userEmailLower) ||
                                        htmlContent.includes(userEmailLower)
                                    );
                                });

                            // Filter by EXACT time: last 15 minutes
                            const timeFilteredEmails = netflixEmails.filter((email) => {
                                const emailDate = new Date(email.date);
                                return emailDate >= targetTime;
                            });

                            // Sort newest first
                            const sortedEmails = timeFilteredEmails.sort(
                                (a, b) => new Date(b.date) - new Date(a.date)
                            );

                            // Find the LATEST email with relevant Netflix links
                            let foundEmail = null;
                            for (const email of sortedEmails) {
                                if (isRelevantNetflixLinkEmail(email.html, email.text)) {
                                    foundEmail = email;
                                    break; // Get the latest one only
                                }
                            }

                            if (!foundEmail) {
                                return cleanupAndResolve([]);
                            }

                            const htmlContent = foundEmail.html || "";
                            const subject = foundEmail.subject || "Email";

                            let sanitizedHtml = htmlContent;
                            try {
                                sanitizedHtml = await sanitizeAndStyleHtml(htmlContent);
                            } catch (e) {
                                sanitizedHtml = htmlContent;
                            }

                            const formattedEmail = {
                                id: foundEmail.messageId || `${Date.now()}-${Math.random()}`,
                                subject: subject,
                                receivedAt: foundEmail.date ? foundEmail.date.toISOString() : new Date().toISOString(),
                                from: foundEmail.from?.text || "",
                                to: foundEmail.to?.text || "",
                                rawHtml: sanitizedHtml,
                            };

                            cleanupAndResolve([formattedEmail]);
                        } catch (parseError) {
                            cleanupAndReject(parseError);
                        }
                    });
                });
            });
        });

        imap.once("error", (err) => {
            cleanupAndReject(err);
        });

        imap.once("end", () => {
            if (!connectionClosed) {
                connectionClosed = true;
                clearTimeout(timeoutId);
            }
        });

        try {
            imap.connect();
        } catch (error) {
            cleanupAndReject(error);
        }
    });
}

// HANDLER FUNCTION
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
        tls: process.env.EMAIL_TLS !== "false",
        tlsOptions: { rejectUnauthorized: false },
    };

    if (!imapConfig.user || !imapConfig.password) {
        return res.status(500).json({
            error: "Email service is not configured. Please contact the administrator."
        });
    }

    try {
        const results = await searchNetflixEmails(imapConfig, email);
        if (results && results.length > 0) {
            res.status(200).json({ emails: results, totalCount: results.length });
        } else {
            res.status(404).json({
                error: "No Netflix email found for this address in the last 15 minutes."
            });
        }
    } catch (error) {
        console.error("Email fetch error:", error);
        res.status(500).json({
            error: getUserFriendlyError(error)
        });
    }
}
