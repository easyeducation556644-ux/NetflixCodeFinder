import Imap from "imap";
import { simpleParser } from "mailparser";

// Helper function to extract clean text from HTML
function extractCleanText(html) {
  if (!html) return "";
  
  // Remove style and script tags with their content
  let text = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  
  // Replace common block elements with newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/tr>/gi, "\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n\n");
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/gi, " ");
  text = text.replace(/&amp;/gi, "&");
  text = text.replace(/&lt;/gi, "<");
  text = text.replace(/&gt;/gi, ">");
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#39;/gi, "'");
  text = text.replace(/&copy;/gi, "");
  text = text.replace(/&reg;/gi, "");
  text = text.replace(/&#\d+;/gi, "");
  
  // Clean up whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n\s*\n\s*\n/g, "\n\n");
  text = text.trim();
  
  // Remove lines that are just URLs or tracking pixels
  const lines = text.split("\n").filter(line => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (trimmed.match(/^https?:\/\/[^\s]+$/)) return false;
    if (trimmed.length < 3) return false;
    return true;
  });
  
  return lines.join("\n").trim();
}

// Convert error messages to user-friendly format
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

export async function registerRoutes(httpServer, app) {
  
  app.post("/api/findcode", async (req, res) => {
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
        res.json(result);
      } else {
        res.status(404).json({ 
          error: "No Netflix email found for this address. Please make sure the email exists in the inbox." 
        });
      }
    } catch (error) {
      console.error("IMAP Error:", error);
      res.status(500).json({ 
        error: getUserFriendlyError(error)
      });
    }
  });

  return httpServer;
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

        console.log(`Mailbox opened. Total messages: ${box.messages.total}`);

        // Search for ALL emails - no date limit
        // We search for ALL emails and filter later
        imap.search(["ALL"], (err, results) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          console.log(`Total emails found: ${results?.length || 0}`);

          if (!results || results.length === 0) {
            imap.end();
            return resolve(null);
          }

          // Get the last 200 emails to search through (most recent)
          const latestEmails = results.slice(-200);
          console.log(`Fetching last ${latestEmails.length} emails...`);
          
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
              console.log(`Parsed ${emails.filter(e => e !== null).length} emails successfully`);
              
              const userEmailLower = userEmail.toLowerCase().trim();
              
              // Step 1: Find ALL emails that contain the user's email address anywhere
              const userEmails = emails
                .filter((email) => email !== null)
                .filter((email) => {
                  const toAddresses = (email.to?.text || "").toLowerCase();
                  const ccAddresses = (email.cc?.text || "").toLowerCase();
                  const fromAddresses = (email.from?.text || "").toLowerCase();
                  const subject = (email.subject || "").toLowerCase();
                  const textContent = (email.text || "").toLowerCase();
                  const htmlContent = (email.html || "").toLowerCase();
                  
                  // Check if user email appears anywhere in the email
                  return (
                    toAddresses.includes(userEmailLower) ||
                    ccAddresses.includes(userEmailLower) ||
                    fromAddresses.includes(userEmailLower) ||
                    subject.includes(userEmailLower) ||
                    textContent.includes(userEmailLower) ||
                    htmlContent.includes(userEmailLower)
                  );
                });
              
              console.log(`Found ${userEmails.length} emails containing user address`);
              
              // Step 2: Filter for Netflix emails (from Netflix OR contains Netflix content)
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

              console.log(`Found ${netflixEmails.length} Netflix-related emails`);

              // Sort by date (newest first) and get the most recent one
              const sortedEmails = netflixEmails.sort((a, b) => new Date(b.date) - new Date(a.date));
              const latestNetflixEmail = sortedEmails[0];

              imap.end();

              if (!latestNetflixEmail) {
                return resolve(null);
              }

              const textContent = latestNetflixEmail.text || "";
              const htmlContent = latestNetflixEmail.html || "";
              const combinedContent = textContent + " " + htmlContent;

              // Look for 4-digit codes
              const codeMatch = combinedContent.match(/\b(\d{4})\b/);
              const accessCode = codeMatch ? codeMatch[1] : null;

              // Find all Netflix links
              const linkMatches = combinedContent.match(
                /https?:\/\/[^\s<>"']+netflix[^\s<>"']*/gi
              ) || [];
              const links = [...new Set(linkMatches.map(l => l.replace(/['">\]]+$/, "")))];
              const link = links[0] || null;

              // Extract clean readable text from email
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
