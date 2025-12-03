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

function extractCleanText(html) {
  if (!html) return "";
  
  let text = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/tr>/gi, "\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n\n");
  
  text = text.replace(/<[^>]+>/g, " ");
  
  text = text.replace(/&nbsp;/gi, " ");
  text = text.replace(/&amp;/gi, "&");
  text = text.replace(/&lt;/gi, "<");
  text = text.replace(/&gt;/gi, ">");
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#39;/gi, "'");
  text = text.replace(/&copy;/gi, "");
  text = text.replace(/&reg;/gi, "");
  text = text.replace(/&#\d+;/gi, "");
  
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n\s*\n\s*\n/g, "\n\n");
  text = text.trim();
  
  const lines = text.split("\n").filter(line => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (trimmed.match(/^https?:\/\/[^\s]+$/)) return false;
    if (trimmed.length < 3) return false;
    return true;
  });
  
  return lines.join("\n").trim();
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

function searchNetflixEmail(imapConfig, userEmail) {
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
            return resolve(null);
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
              
              const userEmails = emails
                .filter((email) => email !== null)
                .filter((email) => {
                  const toAddresses = (email.to?.text || "").toLowerCase();
                  const ccAddresses = (email.cc?.text || "").toLowerCase();
                  const fromAddresses = (email.from?.text || "").toLowerCase();
                  const subject = (email.subject || "").toLowerCase();
                  const textContent = (email.text || "").toLowerCase();
                  const htmlContent = (email.html || "").toLowerCase();
                  
                  return (
                    toAddresses.includes(userEmailLower) ||
                    ccAddresses.includes(userEmailLower) ||
                    fromAddresses.includes(userEmailLower) ||
                    subject.includes(userEmailLower) ||
                    textContent.includes(userEmailLower) ||
                    htmlContent.includes(userEmailLower)
                  );
                });
              
              const netflixEmails = userEmails.filter((email) => {
                const fromAddress = (email.from?.text || "").toLowerCase();
                const subject = (email.subject || "").toLowerCase();
                const textContent = (email.text || "").toLowerCase();
                const htmlContent = (email.html || "").toLowerCase();
                
                const isFromNetflix = fromAddress.includes("netflix");
                const hasNetflixInSubject = subject.includes("netflix");
                const hasNetflixContent = 
                  textContent.includes("netflix") ||
                  htmlContent.includes("netflix");
                
                return isFromNetflix || hasNetflixInSubject || hasNetflixContent;
              });

              const sortedEmails = netflixEmails.sort((a, b) => new Date(b.date) - new Date(a.date));
              const latestNetflixEmail = sortedEmails[0];

              imap.end();

              if (!latestNetflixEmail) {
                return resolve(null);
              }

              const textContent = latestNetflixEmail.text || "";
              const htmlContent = latestNetflixEmail.html || "";
              const combinedContent = textContent + " " + htmlContent;

              const codeMatch = combinedContent.match(/\b(\d{4})\b/);
              const accessCode = codeMatch ? codeMatch[1] : null;

              const linkMatches = combinedContent.match(
                /https?:\/\/[^\s<>"']+netflix[^\s<>"']*/gi
              ) || [];
              const links = [...new Set(linkMatches.map(l => l.replace(/['">\]]+$/, "")))];
              const link = links[0] || null;

              const cleanText = extractCleanText(htmlContent) || textContent;
              
              resolve({
                subject: latestNetflixEmail.subject,
                receivedAt: latestNetflixEmail.date ? latestNetflixEmail.date.toISOString() : new Date().toISOString(),
                from: latestNetflixEmail.from?.text || "",
                to: latestNetflixEmail.to?.text || "",
                textContent: cleanText,
                htmlContent: htmlContent,
                accessCode,
                link,
                allLinks: links,
                totalNetflixEmails: netflixEmails.length,
              });
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
    const result = await searchNetflixEmail(imapConfig, email);
    if (result) {
      const translatedSubject = await translateToEnglish(result.subject);
      const translatedContent = await translateToEnglish(result.textContent);
      
      res.status(200).json({
        ...result,
        subject: translatedSubject,
        textContent: translatedContent
      });
    } else {
      res.status(404).json({ 
        error: "No Netflix email found for this address. Please make sure the email exists in the inbox." 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      error: getUserFriendlyError(error)
    });
  }
}
