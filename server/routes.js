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

        const searchCriteria = [
          ["FROM", "info@account.netflix.com"],
          ["TO", userEmail],
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

          const latestEmails = results.slice(-10);
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
              
              const householdEmail = emails
                .filter((email) => email !== null)
                .filter((email) => {
                  const subject = (email.subject || "").toLowerCase();
                  return (
                    subject.includes("household") ||
                    subject.includes("temporary access") ||
                    subject.includes("update your netflix household") ||
                    subject.includes("get a temporary code")
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

              const linkMatch = combinedContent.match(
                /https?:\/\/[^\s<>"]+netflix\.com[^\s<>"]*/i
              );
              const link = linkMatch ? linkMatch[0].replace(/['">\]]+$/, "") : null;

              resolve({
                subject: householdEmail.subject,
                receivedAt: householdEmail.date ? householdEmail.date.toISOString() : new Date().toISOString(),
                bodySnippet: textContent.substring(0, 500) || "Email content available",
                accessCode,
                link,
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
