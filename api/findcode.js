import Imap from "imap";
import { simpleParser } from "mailparser";
// import translatte from "translatte"; // অনুবাদ মডিউলটি আর প্রয়োজন নেই

// --- Helper Functions ---

// IMAP সার্চের জন্য তারিখকে 'DD-Mon-YYYY' ফরম্যাটে কনভার্ট করে
function formatImapDate(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// নতুন ফিল্টারিং লজিক: ইমেইলের কন্টেন্টে নির্দিষ্ট লিঙ্ক প্রিফিক্স আছে কিনা তা চেক করে
function isRelevantNetflixLinkEmail(htmlContent, textContent) {
    if (!htmlContent && !textContent) return false;

    // শুধুমাত্র এই ফিক্সড প্রিফিক্সগুলি চেক করব
    const linkPrefix1 = 'https://www.netflix.com/account/travel/verify';
    const linkPrefix2 = 'https://www.netflix.com/account/update-primary-location';

    // HTML এবং Text কন্টেন্ট একসাথে করে নিচ্ছি
    const content = (htmlContent || '') + (textContent || '');

    const includesLink1 = content.includes(linkPrefix1);
    const includesLink2 = content.includes(linkPrefix2);

    // যেকোনো একটি লিঙ্ক থাকলেই ইমেইলটি প্রাসঙ্গিক
    return includesLink1 || includesLink2;
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
        'javascript:',
        'data:',
        'vbscript:',
        '<script',
        'onerror',
        'onclick',
        'onload',
        'onmouseover',
    ];

    for (const pattern of dangerousPatterns) {
        if (decodedUrl.includes(pattern)) {
            return null;
        }
    }

    const hostname = urlObj.hostname.toLowerCase();
    const allowedDomains = [
        'netflix.com',
        'www.netflix.com',
        'nflxso.net',
        'www.nflxso.net',
        'email.netflix.com',
        'click.netflix.com',
    ];

    const isAllowed = allowedDomains.some(domain => {
        return hostname === domain || hostname.endsWith('.' + domain);
    });

    if (!isAllowed) {
        return null;
    }

    return trimmedUrl;
}

// এই ফাংশনটি এখন শুধু লিঙ্কগুলি স্যানিটাইজ করবে এবং গুরুত্বপূর্ণ বাটনগুলিতে স্টাইল যোগ করবে, কোনো অনুবাদ করবে না।
async function sanitizeAndStyleHtml(html) {
    if (!html || html.trim() === "") return html;

    let processedHtml = html
        // নিরাপত্তার জন্য script ট্যাগগুলি সরিয়ে দেওয়া হলো
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    // লিঙ্ক স্যানিটাইজেশন এবং স্টাইলিং:
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
    const errorMessage = error.message || error.toString();
    console.error("Raw IMAP Error:", errorMessage);

    if (errorMessage.includes("AUTHENTICATIONFAILED") || errorMessage.includes("Invalid credentials")) {
        return "Email login failed. The email or password may be incorrect or you need an App Password.";
    }
    if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("getaddrinfo")) {
        return "Could not connect to email server. Please check the server address or internet connection.";
    }
    if (errorMessage.includes("ETIMEDOUT") || errorMessage.includes("timeout")) {
        return "Connection timed out. Please try again.";
    }
    if (errorMessage.includes("ECONNREFUSED")) {
        return "Connection refused by email server. Please try again later.";
    }

    return "An unknown error occurred while searching emails. Check logs for details.";
}

// --- নতুন Helper: নির্দিষ্ট UID দিয়ে বডি নামানো ---
function fetchMessageBody(imap, uid) {
    return new Promise((resolve) => {
        console.log(`[IMAP] Attempting to fetch body for UID: ${uid}`);
        const fetch = imap.fetch(uid, { bodies: '' });
        
        fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
                simpleParser(stream, (err, parsed) => {
                    if (err) {
                        console.error(`[IMAP] Error parsing body for UID ${uid}:`, err);
                        resolve(null);
                    }
                    else resolve(parsed);
                });
            });
        });

        fetch.once('error', (err) => {
            console.error(`[IMAP] Fetch error for UID ${uid}:`, err);
            resolve(null);
        });
        fetch.once('end', () => {});
    });
}

// --- MAIN SEARCH FUNCTION ---

function searchNetflixEmails(imapConfig, userEmail) {
    return new Promise((resolve, reject) => {
        const imap = new Imap(imapConfig);
        // Serverless safety limit
        const TIMEOUT_MS = 9000; 
        let isResolved = false;

        const timeoutTimer = setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                console.warn(`[IMAP] Process timed out after ${TIMEOUT_MS / 1000}s. Ending IMAP connection.`);
                imap.end();
                reject(new Error("Search process timed out. (Serverless limit exceeded)"));
            }
        }, TIMEOUT_MS);

        imap.once("ready", () => {
            console.log("[IMAP] Connection Ready. Opening INBOX.");
            imap.openBox("INBOX", true, (err, box) => {
                if (err) {
                    console.error("[IMAP] Error opening INBOX:", err);
                    if (!isResolved) { isResolved = true; clearTimeout(timeoutTimer); reject(err); }
                    return;
                }
                console.log(`[IMAP] INBOX opened. Total messages: ${box.messages.total}`);

                const now = new Date();
                const todayDate = formatImapDate(now);
                
                // ১. IMAP সার্চ: আজকে আসা Netflix ইমেইল খুঁজুন (Date-level search)
                const searchCriteria = [
                    ['FROM', 'netflix.com'],
                    ['SINCE', todayDate] 
                ];
                console.log(`[IMAP] Searching with criteria: FROM 'netflix.com' SINCE ${todayDate}`);


                imap.search(searchCriteria, (err, results) => {
                    if (err) {
                        console.error("[IMAP] Search command failed:", err);
                        if (!isResolved) { isResolved = true; imap.end(); clearTimeout(timeoutTimer); reject(err); }
                        return;
                    }

                    if (!results || results.length === 0) {
                        console.log("[IMAP] No Netflix emails found since today.");
                        if (!isResolved) { isResolved = true; imap.end(); clearTimeout(timeoutTimer); resolve([]); }
                        return;
                    }
                    
                    const totalFound = results.length;
                    console.log(`[IMAP] Found ${totalFound} raw Netflix emails today. Processing last 50 for headers.`);

                    // ২. শুধুমাত্র HEADER ডাউনলোড করুন
                    const recentResults = results.slice(-50); 
                    const fetch = imap.fetch(recentResults, { bodies: 'HEADER.FIELDS (FROM TO DATE SUBJECT)', uid: true });
                    
                    const candidates = [];

                    fetch.on("message", (msg) => {
                        let headerData = "";
                        let uid = null; 

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

                            const emailDate = dateMatch ? new Date(dateMatch[1]) : new Date(0); // Fallback date
                            const toAddress = toMatch ? toMatch[1].toLowerCase() : "";
                            const subject = subjectMatch ? subjectMatch[1].trim() : "Netflix Email";

                            // ৩. JS Filter: ১৫ মিনিট এবং সঠিক ইউজার
                            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000); 
                            const userEmailLower = userEmail.toLowerCase().trim();

                            if (emailDate >= fifteenMinutesAgo && toAddress.includes(userEmailLower)) {
                                candidates.push({ uid, date: emailDate, subject });
                                console.log(`[IMAP] Candidate found (UID: ${uid}, Date: ${emailDate.toISOString()})`);
                            }
                        });
                    });

                    fetch.once("error", (err) => {
                        console.error("[IMAP] Header fetch error:", err);
                        if (!isResolved) { isResolved = true; imap.end(); clearTimeout(timeoutTimer); reject(err); }
                    });

                    fetch.once("end", async () => {
                        console.log(`[IMAP] Header fetch complete. ${candidates.length} candidates passed the 15-min and TO filter.`);

                        if (candidates.length === 0) {
                            if (!isResolved) { isResolved = true; imap.end(); clearTimeout(timeoutTimer); resolve([]); }
                            return;
                        }

                        // ৪. লেটেস্ট ইমেইল আগে পাওয়ার জন্য সর্ট করা
                        candidates.sort((a, b) => b.date - a.date);

                        let foundEmail = null;

                        try {
                            // ৫. লুপ চালিয়ে বডি চেক করা (প্রথম ৫টি)
                            const topCandidates = candidates.slice(0, 5); // শুধুমাত্র প্রথম ৫টি চেক করা হচ্ছে সার্ভার লোড কমানোর জন্য
                            console.log(`[IMAP] Checking body for ${topCandidates.length} best candidates for link...`);

                            for (const candidate of topCandidates) {
                                const parsedEmail = await fetchMessageBody(imap, candidate.uid);
                                
                                if (parsedEmail) {
                                    // লিঙ্ক চেক করা
                                    if (isRelevantNetflixLinkEmail(parsedEmail.html, parsedEmail.text)) {
                                        console.log(`[IMAP] Relevant link found in UID: ${candidate.uid}. Stopping search.`);
                                        
                                        const sanitizedHtml = await sanitizeAndStyleHtml(parsedEmail.html || "");
                                        
                                        foundEmail = {
                                            id: parsedEmail.messageId || candidate.uid.toString(),
                                            subject: candidate.subject,
                                            receivedAt: candidate.date.toISOString(),
                                            from: parsedEmail.from?.text || "Netflix",
                                            to: parsedEmail.to?.text || userEmail,
                                            rawHtml: sanitizedHtml
                                        };
                                        break; // প্রথম সঠিক ইমেইল পেলেই লুপ ব্রেক
                                    } else {
                                        console.log(`[IMAP] UID ${candidate.uid} passed time/user filter but failed link check.`);
                                    }
                                }
                            }
                        } catch (e) {
                            console.error("[IMAP] Error during body fetch/parse loop:", e);
                        }

                        // ৬. ফাইনাল রেজাল্ট পাঠানো
                        if (!isResolved) {
                            isResolved = true;
                            imap.end();
                            clearTimeout(timeoutTimer);
                            console.log(`[IMAP] Search finished. Found Email: ${!!foundEmail}`);
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
            console.error("[IMAP] Connection Error Occurred:", err);
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
        authTimeout: 3000
    };

    if (!imapConfig.user || !imapConfig.password) {
        return res.status(500).json({
            error: "Email service is not configured. Please contact the administrator (Missing environment variables)."
        });
    }

    console.log(`\n--- New Email Search Request Started for: ${email} ---`);

    try {
        const results = await searchNetflixEmails(imapConfig, email);
        if (results && results.length > 0) {
            console.log("--- Request Success: Email Found ---");
            res.status(200).json({ emails: results, totalCount: 1 });
        } else {
            console.log("--- Request Success: No Relevant Email Found ---");
            res.status(200).json({
                emails: [],
                message: "No Netflix verification email found in the last 15 minutes."
            });
        }
    } catch (error) {
        console.error("--- Request Failed at Handler Level ---");
        res.status(500).json({
            error: getUserFriendlyError(error)
        });
    }
}

