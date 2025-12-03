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
          error: "No Netflix verification code found for this email address. Make sure the email was sent within the last 30 days." 
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

        // Search for ALL recent emails to catch forwarded ones too
        // We'll filter by Netflix content later in code
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const searchCriteria = [
          ["SINCE", thirtyDaysAgo],
        ];

        imap.search(searchCriteria, (err, results) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          if (!results || results.length === 0) {
            imap.end();
            return resolve(null);
          }

          // Fetch more emails to find forwarded ones too
          const latestEmails = results.slice(-50);
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
              
              // Filter emails that contain the user's email (direct or forwarded)
              const userEmailLower = userEmail.toLowerCase();
              
              const householdEmail = emails
                .filter((email) => email !== null)
                .filter((email) => {
                  // Check if email is for this user (TO field, CC, or in body for forwarded)
                  const toAddresses = (email.to?.text || "").toLowerCase();
                  const ccAddresses = (email.cc?.text || "").toLowerCase();
                  const textContent = (email.text || "").toLowerCase();
                  const htmlContent = (email.html || "").toLowerCase();
                  
                  return (
                    toAddresses.includes(userEmailLower) ||
                    ccAddresses.includes(userEmailLower) ||
                    textContent.includes(userEmailLower) ||
                    htmlContent.includes(userEmailLower)
                  );
                })
                .filter((email) => {
                  // Check if email is from Netflix OR contains Netflix content (for forwarded emails)
                  const fromAddress = (email.from?.text || "").toLowerCase();
                  const subject = (email.subject || "").toLowerCase();
                  const textContent = (email.text || "").toLowerCase();
                  const htmlContent = (email.html || "").toLowerCase();
                  
                  const isFromNetflix = fromAddress.includes("netflix.com");
                  const hasNetflixContent = 
                    subject.includes("netflix") ||
                    textContent.includes("netflix.com") ||
                    htmlContent.includes("netflix.com");
                  
                  return isFromNetflix || hasNetflixContent;
                })
                .filter((email) => {
                  const subject = (email.subject || "").toLowerCase();
                  const textContent = (email.text || "").toLowerCase();
                  const htmlContent = (email.html || "").toLowerCase();
                  const combinedContent = subject + " " + textContent + " " + htmlContent;
                  
                  return (
                    combinedContent.includes("household") ||
                    combinedContent.includes("temporary access") ||
                    combinedContent.includes("update your netflix household") ||
                    combinedContent.includes("get a temporary code") ||
                    combinedContent.includes("verification code") ||
                    combinedContent.includes("access code")
                  );
                })
                .filter((email) => {
                  const subject = (email.subject || "").toLowerCase();
                  return (
                    !subject.includes("sign-in") &&
                    !subject.includes("signin") &&
                    !subject.includes("password reset") &&
                    !subject.includes("reset your password")
                  );
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

              imap.end();

              if (!householdEmail) {
                return resolve(null);
              }

              const textContent = householdEmail.text || "";
              const htmlContent = householdEmail.html || "";
              const combinedContent = textContent + " " + htmlContent;

              const codeMatch = combinedContent.match(/\b(\d{4})\b/);
              const accessCode = codeMatch ? codeMatch[1] : null;

              // Find all Netflix links
              const linkMatches = combinedContent.match(
                /https?:\/\/[^\s<>"]+netflix\.com[^\s<>"]*/gi
              ) || [];
              const links = [...new Set(linkMatches.map(l => l.replace(/['">\]]+$/, "")))];
              const link = links[0] || null;

              // Extract clean readable text from email
              const cleanText = extractCleanText(htmlContent) || textContent;
              
              resolve({
                subject: householdEmail.subject,
                receivedAt: householdEmail.date ? householdEmail.date.toISOString() : new Date().toISOString(),
                from: householdEmail.from?.text || "",
                to: householdEmail.to?.text || "",
                textContent: cleanText,
                htmlContent: htmlContent,
                accessCode,
                link,
                allLinks: links,
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
