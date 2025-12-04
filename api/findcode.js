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

function getLinkLabel(url) {
  if (url.includes("netflix.com/account/travel")) {
    return "Get Code";
  } else if (url.includes("netflix.com/account")) {
    return "Go to Account";
  } else if (url.includes("netflix.com/password")) {
    return "Change Password";
  } else if (url.includes("netflix.com/help")) {
    return "Help Center";
  } else if (url.includes("netflix.com")) {
    return "Open Netflix";
  }
  return "Open Link";
}

async function processContentWithLinks(html, text) {
  const segments = [];
  let content = text || "";
  
  if (html && !content) {
    content = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
    content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
    content = content.replace(/<br\s*\/?>/gi, "\n");
    content = content.replace(/<\/p>/gi, "\n\n");
    content = content.replace(/<\/div>/gi, "\n");
    content = content.replace(/<[^>]+>/g, " ");
    content = content.replace(/&nbsp;/gi, " ");
    content = content.replace(/&amp;/gi, "&");
    content = content.replace(/&lt;/gi, "<");
    content = content.replace(/&gt;/gi, ">");
    content = content.replace(/&quot;/gi, '"');
    content = content.replace(/&#39;/gi, "'");
    content = content.replace(/&#x27;/gi, "'");
    content = content.replace(/&#\d+;/gi, "");
  }
  
  content = content.replace(/[ \t]+/g, " ");
  content = content.replace(/\n\s*\n\s*\n/g, "\n\n");
  content = content.trim();
  
  const urlRegex = /\[?(https?:\/\/[^\s\[\]<>"']+)\]?/gi;
  let lastIndex = 0;
  let match;
  
  const seenUrls = new Set();
  
  while ((match = urlRegex.exec(content)) !== null) {
    const url = match[1].replace(/['">\].,;:]+$/, "");
    
    if (url.includes("unsubscribe") || url.includes("mailto:")) {
      continue;
    }
    
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index).trim();
      if (textBefore) {
        segments.push({ type: "text", value: textBefore });
      }
    }
    
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      const label = getLinkLabel(url);
      segments.push({ type: "link", label, url });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex).trim();
    if (remainingText) {
      segments.push({ type: "text", value: remainingText });
    }
  }
  
  const translatedSegments = await Promise.all(
    segments.map(async (segment) => {
      if (segment.type === "text") {
        const translated = await translateToEnglish(segment.value);
        return { type: "text", value: translated };
      } else if (segment.type === "link") {
        return segment;
      }
      return segment;
    })
  );
  
  return translatedSegments;
}

function extractAccessCode(content) {
  const codePatterns = [
    /\b(\d{4})\b/,
    /code[:\s]+(\d{4})/i,
    /verification[:\s]+(\d{4})/i,
  ];
  
  for (const pattern of codePatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
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

    imap.once("ready", () => {
      imap.openBox("INBOX", true, (err, box) => {
        if (err) {
          imap.end();
          return reject(err);
        }

        imap.search(["ALL"], (err, results) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          if (!results || results.length === 0) {
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
                setTimeout(() => resolveEmail(emailData), 100);
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
              const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
              
              const netflixEmails = emails
                .filter((email) => email !== null)
                .filter((email) => {
                  const fromAddress = (email.from?.text || "").toLowerCase();
                  return fromAddress.includes("netflix");
                })
                .filter((email) => {
                  const toAddresses = (email.to?.text || "").toLowerCase();
                  const ccAddresses = (email.cc?.text || "").toLowerCase();
                  const subject = (email.subject || "").toLowerCase();
                  const textContent = (email.text || "").toLowerCase();
                  const htmlContent = (email.html || "").toLowerCase();
                  
                  return (
                    toAddresses.includes(userEmailLower) ||
                    ccAddresses.includes(userEmailLower) ||
                    subject.includes(userEmailLower) ||
                    textContent.includes(userEmailLower) ||
                    htmlContent.includes(userEmailLower)
                  );
                });

              const recentEmails = netflixEmails.filter((email) => {
                const emailDate = new Date(email.date);
                return emailDate >= twentyFourHoursAgo;
              });

              const sortedEmails = recentEmails.sort((a, b) => new Date(b.date) - new Date(a.date));

              imap.end();

              const formattedEmails = await Promise.all(sortedEmails.map(async (email) => {
                const htmlContent = email.html || "";
                const textContent = email.text || "";
                const combinedContent = textContent + " " + htmlContent;
                
                const translatedSubject = await translateToEnglish(email.subject || "Email");
                const contentSegments = await processContentWithLinks(htmlContent, textContent);
                const accessCode = extractAccessCode(combinedContent);
                
                return {
                  id: email.messageId || `${Date.now()}-${Math.random()}`,
                  subject: translatedSubject,
                  receivedAt: email.date ? email.date.toISOString() : new Date().toISOString(),
                  from: email.from?.text || "",
                  to: email.to?.text || "",
                  contentSegments: contentSegments,
                  accessCode: accessCode,
                };
              }));

              resolve(formattedEmails);
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
        error: "No Netflix email found for this address in the last 24 hours." 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      error: getUserFriendlyError(error)
    });
  }
}
