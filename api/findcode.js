import Imap from "imap";
import { simpleParser } from "mailparser";
import translatte from "translatte";

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

// --- আপনার বিদ্যমান Helper ফাংশন (পরিবর্তন করা হয়নি) ---

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

async function translateToEnglish(text) {
    if (!text || text.trim() === "") return text;

    try {
        if (text.length > 3000) {
            const chunks = [];
            const sentences = text.split(/(?<=[.!?])\s+/);
            let currentChunk = "";

            for (const sentence of sentences) {
                if ((currentChunk + sentence).length > 2000) {
                    if (currentChunk) chunks.push(currentChunk.trim());
                    currentChunk = sentence;
                } else {
                    currentChunk += " " + sentence;
                }
            }
            if (currentChunk) chunks.push(currentChunk.trim());

            const translatedChunks = [];
            for (const chunk of chunks) {
                try {
                    const result = await translatte(chunk, { to: "en" });
                    translatedChunks.push(result.text);
                } catch (e) {
                    translatedChunks.push(chunk);
                }
            }
            return translatedChunks.join(" ");
        }

        const result = await translatte(text, { to: "en" });
        return result.text;
    } catch (error) {
        // Translation error, return original text
        return text;
    }
}

async function translateHtmlContentPreserveOriginal(html) {
    if (!html || html.trim() === "") return html;

    let processedHtml = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    const textToTranslate = [];
    let textIndex = 0;

    processedHtml = processedHtml.replace(/>([^<]+)</g, (match, text) => {
        const trimmedText = text.trim();
        if (trimmedText && trimmedText.length > 1 && !/^[\s\d.,;:!?-_=+*#@$%^&()\[\]{}|\\\/<>"' ]+$/.test(trimmedText)) {
            const placeholder = `>___TEXT_${textIndex}___<`;
            textToTranslate.push({ index: textIndex, text: trimmedText });
            textIndex++;
            return placeholder;
        }
        return match;
    });

    for (const item of textToTranslate) {
        try {
            const translated = await translateToEnglish(item.text);
            item.translated = translated;
        } catch (e) {
            item.translated = item.text;
        }
    }

    for (const item of textToTranslate) {
        processedHtml = processedHtml.replace(`>___TEXT_${item.index}___<`, `>${escapeHtml(item.translated)}<`);
    }

    processedHtml = processedHtml.replace(/<a([^>]*)href\s*=\s*['"]([^'"]*)['"]([^>]*)>/gi, (match, preAttrs, url, postAttrs) => {
        const urlClean = url.replace(/&amp;/g, '&').toLowerCase();
        const safeUrl = sanitizeUrl(url.replace(/&amp;/g, '&'));

        if (!safeUrl) {
            return match;
        }

        const isYesItsMe = urlClean.includes('yesitwasme') ||
            urlClean.includes('yes-it-was-me') ||
            urlClean.includes('yes_it_was_me');

        const isGetCode = urlClean.includes('travel') && urlClean.includes('temporary');

        if (isYesItsMe || isGetCode) {
            let newAttrs = preAttrs + postAttrs;
            if (newAttrs.includes('style=')) {
                newAttrs = newAttrs.replace(/style\s*=\s*["']([^"']*)["']/i, (m, styles) => {
                    return `style="${styles}; color: #ffffff !important;"`;
                });
            } else {
                newAttrs = newAttrs + ' style="color: #ffffff !important;"';
            }
            return `<a${newAttrs} href="${safeUrl}" target="_blank" rel="noopener noreferrer">`;
        }

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

// --- মূল পরিবর্তন এই ফাংশনে ---

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
                const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
                
                // IMAP সার্চ: শুধুমাত্র আজকের বা তার পরের তারিখের Netflix ইমেইলগুলি খুঁজুন
                // NOTE: IMAP-এর SINCE কমান্ড সাধারণত শুধুমাত্র দিনের উপর ভিত্তি করে ফিল্টার করে। 
                const searchCriteria = [
                    'FROM', 'netflix.com', 
                    'SINCE', formatImapDate(fifteenMinutesAgo)
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
                    
                    // ইমেইলগুলি নতুন থেকে পুরানো ক্রমে সাজান এবং ফেচ করুন
                    // (যদিও SINCE ব্যবহার হচ্ছে, আমরা শেষ 50টা নিচ্ছি নিশ্চিত করার জন্য যে আমরা আজকের সব ইমেইল পাচ্ছি)
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
                                // ছোট বিলম্ব পার্সিং নিশ্চিত করার জন্য
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
                                .filter((email) => email !== null && email.date) // শুধু বৈধ ইমেইল ও তারিখ থাকলে
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

                            // অনুবাদ ছাড়াই দ্রুত লিঙ্ক-ভিত্তিক ফিল্টারিং
                            for (const email of sortedEmails) {
                                if (isRelevantNetflixLinkEmail(email.html, email.text)) {
                                    foundEmail = email;
                                    break; // প্রথম প্রাসঙ্গিক ইমেইলটি পেয়ে গেছি, আর খোঁজার দরকার নেই
                                }
                            }

                            imap.end();

                            if (!foundEmail) {
                                resolve([]);
                                return;
                            }

                            // শুধুমাত্র প্রাপ্ত ইমেইলটির অনুবাদ এবং HTML প্রসেসিং হবে
                            const htmlContent = foundEmail.html || "";
                            const translatedSubject = await translateToEnglish(foundEmail.subject || "Email");

                            let translatedHtml = htmlContent;
                            try {
                                // এই ফাংশনটি HTML কন্টেন্টকে অনুবাদ করে এবং লিঙ্কগুলি স্যানিটাইজ করে
                                translatedHtml = await translateHtmlContentPreserveOriginal(htmlContent);
                            } catch (e) {
                                // অনুবাদ ব্যর্থ হলে মূল HTML কন্টেন্ট ব্যবহার করুন
                                translatedHtml = htmlContent;
                            }

                            const formattedEmail = {
                                id: foundEmail.messageId || `${Date.now()}-${Math.random()}`,
                                subject: translatedSubject,
                                receivedAt: foundEmail.date ? foundEmail.date.toISOString() : new Date().toISOString(),
                                from: foundEmail.from?.text || "",
                                to: foundEmail.to?.text || "",
                                rawHtml: translatedHtml,
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
            // আপনার অনুরোধ অনুযায়ী, আউটপুট ফরম্যাট অপরিবর্তিত রাখা হয়েছে
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
