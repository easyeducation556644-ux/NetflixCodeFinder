import Imap from "imap";
import { simpleParser } from "mailparser";

export async function registerRoutes(httpServer, app) {
  
  app.post("/api/findcode", async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email address is required" });
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
        error: "Email configuration missing. Please set EMAIL_ADDRESS and EMAIL_PASSWORD environment variables." 
      });
    }

    try {
      const result = await searchNetflixEmail(imapConfig, email);
      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ 
          error: "No Netflix Household or Temporary Access code email found for this address." 
        });
      }
    } catch (error) {
      console.error("IMAP Error:", error);
      res.status(500).json({ 
        error: "Failed to search emails. Please check your email configuration.",
        details: error.message 
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

              resolve({
                subject: householdEmail.subject,
                receivedAt: householdEmail.date ? householdEmail.date.toISOString() : new Date().toISOString(),
                from: householdEmail.from?.text || "",
                to: householdEmail.to?.text || "",
                textContent: textContent,
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
