import Imap from "imap";
import { simpleParser } from "mailparser";
import translatte from "translatte";

async function translateToEnglish(text) {
  if (!text || text.trim() === "") return text;
  
  try {
    const result = await translatte(text, { to: "en" });
    return result.text;
  } catch (error) {
    return text;
  }
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

function decodeHtmlEntities(html) {
  if (!html) return '';
  return html
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x22;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&#x26;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&#x3C;/g, '<')
    .replace(/&lt;/g, '<')
    .replace(/&#x3E;/g, '>')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
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

function isHouseholdEmail(subject) {
  const subjectLower = (subject || "").toLowerCase();
  
  const subjectKeywords = [
    "temporary",
    "household", 
    "temp",
    "home"
  ];
  
  return subjectKeywords.some(kw => subjectLower.includes(kw));
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

function searchNetflixEmails(imapConfig, userEmail) {
  return new Promise((resolve, reject) => {
    const imap = new Imap(imapConfig);
    
    const timeoutId = setTimeout(() => {
      try { imap.end(); } catch(e) {}
      reject(new Error("timeout"));
    }, 25000);

    imap.once("ready", () => {
      imap.openBox("INBOX", true, (err, box) => {
        if (err) {
          clearTimeout(timeoutId);
          imap.end();
          return reject(err);
        }

        const today = new Date();
        const searchDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        
        imap.search([
          ["SINCE", searchDate]
        ], (err, results) => {
          if (err) {
            clearTimeout(timeoutId);
            imap.end();
            return reject(err);
          }

          if (!results || results.length === 0) {
            clearTimeout(timeoutId);
            imap.end();
            return resolve([]);
          }

          const latestEmails = results.slice(-200);
          
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
            clearTimeout(timeoutId);
            imap.end();
            reject(err);
          });

          fetch.once("end", async () => {
            try {
              clearTimeout(timeoutId);
              const emails = await Promise.all(emailPromises);
              
              const userEmailLower = userEmail.toLowerCase().trim();
              const now = new Date();
              const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              
              const netflixEmails = emails
                .filter((email) => email !== null)
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
                })
                .filter((email) => {
                  const emailDate = new Date(email.date);
                  return emailDate >= twentyFourHoursAgo;
                });

              const sortedEmails = netflixEmails.sort((a, b) => new Date(b.date) - new Date(a.date));

              imap.end();

              let householdEmail = null;
              
              for (const email of sortedEmails) {
                const subject = email.subject || "";
                let translatedSubject = subject;
                
                try {
                  translatedSubject = await translateToEnglish(subject);
                } catch (e) {
                  translatedSubject = subject;
                }
                
                if (isHouseholdEmail(translatedSubject) || isHouseholdEmail(subject)) {
                  householdEmail = email;
                  break;
                }
              }

              if (!householdEmail) {
                resolve([]);
                return;
              }

              const htmlContent = householdEmail.html || "";
              const decodedHtml = decodeHtmlEntities(htmlContent);
              
              const formattedEmail = {
                id: householdEmail.messageId || `${Date.now()}-${Math.random()}`,
                subject: decodeHtmlEntities(householdEmail.subject || "Netflix Email"),
                receivedAt: householdEmail.date ? householdEmail.date.toISOString() : new Date().toISOString(),
                from: householdEmail.from?.text || "",
                to: householdEmail.to?.text || "",
                rawHtml: `<div class="netflix-email-original">${decodedHtml}</div>`,
              };

              resolve([formattedEmail]);
            } catch (parseError) {
              clearTimeout(timeoutId);
              imap.end();
              reject(parseError);
            }
          });
        });
      });
    });

    imap.once("error", (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });

    imap.connect();
  });
}

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
    connTimeout: 10000,
    authTimeout: 8000,
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
        error: "No Netflix email found for this address in the last 24 hours." 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      error: getUserFriendlyError(error)
    });
  }
}
