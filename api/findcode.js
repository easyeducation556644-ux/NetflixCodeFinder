import Imap from "imap";
import { simpleParser } from "mailparser";
// import translatte from "translatte"; // অনুবাদ মডিউলটি আর প্রয়োজন নেই

// --- নতুন Helper ফাংশন ---

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

// --- আপনার বিদ্যমান Helper ফাংশন ---

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

// অনুবাদের প্রয়োজন নেই, তাই এই ফাংশনটি এখন শুধু মূল টেক্সটটি ফেরত দেবে।
async function translateToEnglish(text) {
    return text;
}

// এই ফাংশনটি এখন শুধু লিঙ্কগুলি স্যানিটাইজ করবে এবং গুরুত্বপূর্ণ বাটনগুলিতে স্টাইল যোগ করবে, কোনো অনুবাদ করবে না।
async function sanitizeAndStyleHtml(html) {
    if (!html || html.trim() === "") return html;

    let processedHtml = html
        // নিরাপত্তার জন্য script ট্যাগগুলি সরিয়ে দেওয়া হলো
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    // লিঙ্ক স্যানিটাইজেশন এবং স্টাইলিং:
    // Netflix-এর 'Yes it was me' বা 'Get Code' লিঙ্কে স্টাইল যোগ করা হচ্ছে
    processedHtml = processedHtml.replace(/<a([^>]*)href\s*=\s*['"]([^'"]*)['"]([^>]*)>/gi, (match, preAttrs, url, postAttrs) => {
        const urlClean = url.replace(/&amp;/g, '&').toLowerCase();
        const safeUrl = sanitizeUrl(url.replace(/&amp;/g, '&'));

        if (!safeUrl) {
            // লিঙ্কটি নিরাপদ না হলে, মূল ম্যাচটি ফেরত দেওয়া হচ্ছে
            return match;
        }

        const isYesItsMe = urlClean.includes('yesitwasme') ||
            urlClean.includes('yes-it-was-me') ||
            urlClean.includes('yes_it_was_me');

        const isGetCode = urlClean.includes('travel') && urlClean.includes('temporary');

        if (isYesItsMe || isGetCode) {
            let newAttrs = preAttrs + postAttrs;
            // গুরুত্বপূর্ণ লিঙ্কে লাল ব্যাকগ্রাউন্ড এবং সাদা টেক্সট স্টাইল যোগ করা হচ্ছে
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

        // অন্য লিঙ্কগুলির জন্য শুধু স্যানিটাইজড URL ব্যবহার করা হচ্ছে
        return `<a${preAttrs} href="${safeUrl}"${postAttrs} target="_blank" rel="noopener noreferrer">`;
    });

    const wrappedHtml = `<div class="netflix-email-original">${processedHtml}</div>`;

    return wrappedHtml;
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

// --- মূল ফাংশন: searchNetflixEmails ---

function searchNetflixEmails(imapConfig, userEmail) {
    return new Promise((resolve, reject) => {
        const imap = new Imap(imapConfig);

        imap.once("ready", () => {
            imap.openBox("INBOX", true, (err, box) => {
                if (err) {
                    imap.end();
                    return reject(err);
                }

                const now = new Date();
                
                // এখানে মিনিটের সংখ্যা পরিবর্তন করুন (যেমন: 5 বা 30)
                const minutesToFilter = 1555555555; 
                const fifteenMinutesAgo = new Date(now.getTime() - minutesToFilter * 60 * 1000);
                
                // IMAP সার্চ: নির্দিষ্ট সময়সীমার মধ্যে Netflix ইমেইলগুলি খুঁজুন
                const searchCriteria = [
                    ['FROM', 'netflix.com'], 
                    ['SINCE', formatImapDate(fifteenMinutesAgo)]
                ];

                imap.search(searchCriteria, (err, results) => {
                    if (err) {
                        imap.end();
                        return reject(err);
                    }

                    if (!results || results.length === 0) {
                        imap.end();
                        return resolve([]);
                    }
                    
                    const latestEmails = results.slice(-50); 
                    
                    if (latestEmails.length === 0) {
                        imap.end();
                        return resolve([]);
                    }


                    const fetch = imap.fetch(latestEmails, { bodies: "", struct: true });
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
                                setTimeout(() => resolveEmail(emailData), 50); 
                            });
                        });
                        emailPromises.push(emailPromise);
                    });

                    fetch.once("error", (err) => {
                        imap.end();
                        reject(err);
                    });

                    fetch.once("end", async () => {
                        try {
                            const emails = await Promise.all(emailPromises);

                            const userEmailLower = userEmail.toLowerCase().trim();

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
                                    
                                    // ব্যবহারকারীকে অ্যাড্রেস করা হয়েছে কিনা তা নিশ্চিত করুন
                                    return (
                                        toAddresses.includes(userEmailLower) ||
                                        ccAddresses.includes(userEmailLower) ||
                                        htmlContent.includes(userEmailLower)
                                    );
                                });

                            // Node.js এ মিনিট-লেভেলে ফিল্টার করুন
                            const timeFilteredEmails = netflixEmails
                                .filter((email) => {
                                    const emailDate = new Date(email.date);
                                    return emailDate >= fifteenMinutesAgo;
                                });

                            // প্রাপ্ত ইমেইলগুলিকে নতুন থেকে পুরানো ক্রমে সাজান
                            const sortedEmails = timeFilteredEmails.sort((a, b) => new Date(b.date) - new Date(a.date));

                            let foundEmail = null;

                            // দ্রুত লিঙ্ক-ভিত্তিক ফিল্টারিং
                            for (const email of sortedEmails) {
                                if (isRelevantNetflixLinkEmail(email.html, email.text)) {
                                    foundEmail = email;
                                    break;
                                }
                            }

                            imap.end();

                            if (!foundEmail) {
                                resolve([]);
                                return;
                            }

                            const htmlContent = foundEmail.html || "";
                            
                            // *** অনুবাদ বন্ধ: সরাসরি মূল বিষয়বস্তু ব্যবহার করা হচ্ছে ***
                            const subject = foundEmail.subject || "Email";

                            let sanitizedHtml = htmlContent;
                            try {
                                // শুধুমাত্র লিঙ্ক স্যানিটাইজেশন এবং স্টাইলিং করা হচ্ছে, কোনো অনুবাদ নয়
                                sanitizedHtml = await sanitizeAndStyleHtml(htmlContent);
                            } catch (e) {
                                // কোনো ত্রুটি হলে মূল HTML কন্টেন্ট ব্যবহার করা হচ্ছে
                                sanitizedHtml = htmlContent;
                            }

                            const formattedEmail = {
                                id: foundEmail.messageId || `${Date.now()}-${Math.random()}`,
                                subject: subject, // মূল সাবজেক্ট
                                receivedAt: foundEmail.date ? foundEmail.date.toISOString() : new Date().toISOString(),
                                from: foundEmail.from?.text || "",
                                to: foundEmail.to?.text || "",
                                rawHtml: sanitizedHtml, // স্যানিটাইজড কিন্তু অনুদিত নয় এমন HTML
                            };

                            resolve([formattedEmail]);
                        } catch (parseError) {
                            imap.end();
                            reject(parseError);
                        }
                    });
                });
            });
        });

        imap.once("error", (err) => {
            reject(err);
        });

        imap.connect();
    });
}

// --- আপনার মূল হ্যান্ডলার ফাংশন (পরিবর্তন করা হয়নি) ---
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
        res.status(500).json({
            error: getUserFriendlyError(error)
        });
    }
}
