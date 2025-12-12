import Imap from "imap";
import { simpleParser } from "mailparser";

// --- Helper Functions (আপনার দেওয়া কোড অনুযায়ী) ---

function formatImapDate(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// লিঙ্ক চেক করার লজিক
function isRelevantNetflixLinkEmail(htmlContent, textContent) {
    if (!htmlContent && !textContent) return false;

    const linkPrefix1 = 'https://www.netflix.com/account/travel/verify';
    const linkPrefix2 = 'https://www.netflix.com/account/update-primary-location';

    const content = (htmlContent || '') + (textContent || '');

    const includesLink1 = content.includes(linkPrefix1);
    const includesLink2 = content.includes(linkPrefix2);

    return includesLink1 || includesLink2;
}

function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return null;
    const trimmedUrl = url.trim();
    try {
        const urlObj = new URL(trimmedUrl);
        const protocol = urlObj.protocol.toLowerCase();
        if (protocol !== 'http:' && protocol !== 'https:') return null;
        
        const hostname = urlObj.hostname.toLowerCase();
        const allowedDomains = ['netflix.com', 'www.netflix.com', 'nflxso.net', 'www.nflxso.net', 'email.netflix.com', 'click.netflix.com'];
        
        if (allowedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
            return trimmedUrl;
        }
    } catch (e) {
        return null;
    }
    return null;
}

async function sanitizeAndStyleHtml(html) {
    if (!html || html.trim() === "") return html;

    let processedHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    processedHtml = processedHtml.replace(/<a([^>]*)href\s*=\s*['"]([^'"]*)['"]([^>]*)>/gi, (match, preAttrs, url, postAttrs) => {
        const urlClean = url.replace(/&amp;/g, '&').toLowerCase();
        const safeUrl = sanitizeUrl(url.replace(/&amp;/g, '&'));

        if (!safeUrl) return match;

        const isYesItsMe = urlClean.includes('yesitwasme') || urlClean.includes('yes-it-was-me') || urlClean.includes('yes_it_was_me');
        const isGetCode = urlClean.includes('travel') && urlClean.includes('temporary');

        if (isYesItsMe || isGetCode) {
            let newAttrs = preAttrs + postAttrs;
            const buttonStyle = 'color: #ffffff !important; background-color: #e50914 !important; padding: 10px 20px; border-radius: 4px; display: inline-block; text-decoration: none; font-weight: bold; border: 1px solid #e50914; margin: 10px 0;';
            
            if (newAttrs.includes('style=')) {
                newAttrs = newAttrs.replace(/style\s*=\s*["']([^"']*)["']/i, (m, styles) => `style="${styles}; ${buttonStyle}"`);
            } else {
                newAttrs = newAttrs + ` style="${buttonStyle}"`;
            }
            return `<a${newAttrs} href="${safeUrl}" target="_blank" rel="noopener noreferrer">`;
        }
        return `<a${preAttrs} href="${safeUrl}"${postAttrs} target="_blank" rel="noopener noreferrer">`;
    });

    return `<div class="netflix-email-original" style="font-family: Helvetica, Arial, sans-serif;">${processedHtml}</div>`;
}

function getUserFriendlyError(error) {
    const msg = (error.message || error.toString()).toLowerCase();
    if (msg.includes("authenticationfailed") || msg.includes("invalid credentials")) return "Email login failed. Check email or app password.";
    if (msg.includes("enotfound") || msg.includes("timeout")) return "Connection timed out. Please try again.";
    return "Something went wrong while checking emails.";
}

// --- নতুন Helper: নির্দিষ্ট UID দিয়ে বডি নামানো ---
function fetchMessageBody(imap, uid) {
    return new Promise((resolve) => {
        const fetch = imap.fetch(uid, { bodies: '' });
        fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
                simpleParser(stream, (err, parsed) => {
                    if (err) resolve(null);
                    else resolve(parsed);
                });
            });
        });
        fetch.once('error', () => resolve(null));
        fetch.once('end', () => { 
            // Fallback
        });
    });
}

// --- MAIN SEARCH FUNCTION ---

function searchNetflixEmails(imapConfig, userEmail) {
    return new Promise((resolve, reject) => {
        const imap = new Imap(imapConfig);
        // Vercel Timeout Safety (9 seconds)
        const TIMEOUT_MS = 9000; 
        let isResolved = false;

        const timeoutTimer = setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                imap.end();
                reject(new Error("Search process timed out."));
            }
        }, TIMEOUT_MS);

        imap.once("ready", () => {
            imap.openBox("INBOX", true, (err, box) => {
                if (err) {
                    if (!isResolved) { isResolved = true; clearTimeout(timeoutTimer); reject(err); }
                    return;
                }

                const now = new Date();
                // ১. আজ সারাদিনের নেটফ্লিক্স ইমেইল খুঁজুন (IMAP 'SINCE' শুধু দিন চেনে, সময় চেনে না)
                const searchCriteria = [
                    ['FROM', 'netflix.com'],
                    ['SINCE', formatImapDate(now)] 
                ];

                imap.search(searchCriteria, (err, results) => {
                    if (err) {
                        if (!isResolved) { isResolved = true; imap.end(); clearTimeout(timeoutTimer); reject(err); }
                        return;
                    }

                    if (!results || results.length === 0) {
                        if (!isResolved) { isResolved = true; imap.end(); clearTimeout(timeoutTimer); resolve([]); }
                        return;
                    }

                    // ২. শুধুমাত্র HEADER ডাউনলোড করুন (বডি নয়) - এতে সার্ভার ক্র্যাশ করবে না
                    // গত ৫০টি ইমেইল চেক করা হচ্ছে নিরাপত্তার জন্য
                    const recentResults = results.slice(-50); 
                    const fetch = imap.fetch(recentResults, { bodies: 'HEADER.FIELDS (FROM TO DATE SUBJECT)' });
                    
                    const candidates = [];

                    fetch.on("message", (msg, seqno) => {
                        let headerData = "";
                        let uid = seqno; 

                        msg.once("attributes", (attrs) => {
                            uid = attrs.uid;
                        });

                        msg.on("body", (stream) => {
                            stream.on("data", (chunk) => {
                                headerData += chunk.toString("utf8");
                            });
                        });

                        msg.once("end", () => {
                            // হেডার পার্স করা হচ্ছে
                            const dateMatch = headerData.match(/Date: (.+)(\r\n|\n)/i);
                            const toMatch = headerData.match(/To: (.+)(\r\n|\n)/i);
                            const subjectMatch = headerData.match(/Subject: (.+)(\r\n|\n)/i);

                            const emailDate = dateMatch ? new Date(dateMatch[1]) : new Date();
                            const toAddress = toMatch ? toMatch[1].toLowerCase() : "";
                            const subject = subjectMatch ? subjectMatch[1].trim() : "Netflix Email";

                            // ৩. এখানেই ইউজার ইমেইল এবং ১৫ মিনিটের লজিক চেক করা হচ্ছে
                            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000); // ১৫ মিনিট
                            const userEmailLower = userEmail.toLowerCase().trim();

                            // কন্ডিশন: ইমেইলটি ১৫ মিনিটের মধ্যে হতে হবে এবং ইউজারের মেইলে আসতে হবে
                            if (emailDate >= fifteenMinutesAgo && toAddress.includes(userEmailLower)) {
                                candidates.push({ uid, date: emailDate, subject });
                            }
                        });
                    });

                    fetch.once("error", (err) => {
                        if (!isResolved) { isResolved = true; imap.end(); clearTimeout(timeoutTimer); reject(err); }
                    });

                    fetch.once("end", async () => {
                        if (candidates.length === 0) {
                            if (!isResolved) { isResolved = true; imap.end(); clearTimeout(timeoutTimer); resolve([]); }
                            return;
                        }

                        // ৪. লেটেস্ট ইমেইল আগে পাওয়ার জন্য সর্ট করা
                        candidates.sort((a, b) => b.date - a.date);

                        let foundEmail = null;

                        try {
                            // ৫. লুপ চালিয়ে বডি চেক করা (শুধুমাত্র সিলেক্টেড ইমেইলগুলোর)
                            // সবগুলোর বডি একসাথে নামালে মেমোরি লিক হবে, তাই লুপ ব্যবহার করা হয়েছে
                            for (const candidate of candidates) {
                                // বডি ফেচ করা
                                const parsedEmail = await fetchMessageBody(imap, candidate.uid);
                                
                                if (parsedEmail) {
                                    // লিঙ্ক চেক করা
                                    if (isRelevantNetflixLinkEmail(parsedEmail.html, parsedEmail.text)) {
                                        
                                        // লিঙ্ক পাওয়া গেলে স্টাইল করে রিটার্ন করার জন্য রেডি করা
                                        const sanitizedHtml = await sanitizeAndStyleHtml(parsedEmail.html || "");
                                        
                                        foundEmail = {
                                            id: parsedEmail.messageId || candidate.uid.toString(),
                                            subject: candidate.subject,
                                            receivedAt: candidate.date.toISOString(),
                                            from: parsedEmail.from?.text || "Netflix",
                                            to: parsedEmail.to?.text || userEmail,
                                            rawHtml: sanitizedHtml
                                        };
                                        // প্রথম সঠিক ইমেইল পেলেই লুপ ব্রেক করে দেব
                                        break; 
                                    }
                                }
                            }
                        } catch (e) {
                            console.error("Body fetch error:", e);
                        }

                        // ৬. ফাইনাল রেজাল্ট পাঠানো
                        if (!isResolved) {
                            isResolved = true;
                            imap.end();
                            clearTimeout(timeoutTimer);
                            if (foundEmail) {
                                resolve([foundEmail]);
                            } else {
                                resolve([]);
                            }
                        }
                    });
                });
            });
        });

        imap.once("error", (err) => {
            if (!isResolved) {
                isResolved = true;
                clearTimeout(timeoutTimer);
                reject(err);
            }
        });

        imap.connect();
    });
}

// --- Handler ---
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
        authTimeout: 3000 // দ্রুত ফেইল করার জন্য
    };

    if (!imapConfig.user || !imapConfig.password) {
        return res.status(500).json({
            error: "Email service is not configured."
        });
    }

    try {
        const results = await searchNetflixEmails(imapConfig, email);
        if (results && results.length > 0) {
            res.status(200).json({ emails: results, totalCount: 1 });
        } else {
            // 404 দিলে অনেক সময় ক্লায়েন্ট সাইডে এরর দেখায়, তাই 200 দিচ্ছি কিন্তু খালি অ্যারে সহ
            res.status(200).json({
                emails: [],
                message: "No Netflix verification email found in the last 15 minutes."
            });
        }
    } catch (error) {
        res.status(500).json({
            error: getUserFriendlyError(error)
        });
    }
}


