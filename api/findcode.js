import Imap from "imap";
import { simpleParser } from "mailparser";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password, imapHost, imapPort } = req.body;

  if (!email || !password || !imapHost || !imapPort) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const imapConfig = {
    user: email,
    password,
    host: imapHost,
    port: Number(imapPort),
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
  };

  const TARGET_LINK_1 = "https://www.netflix.com/account/travel/verify";
  const TARGET_LINK_2 =
    "https://www.netflix.com/account/update-primary-location";

  function containsTargetNetflixLink(html = "", text = "") {
    const lowerHtml = (html || "").toLowerCase();
    const lowerText = (text || "").toLowerCase();

    return (
      lowerHtml.includes(TARGET_LINK_1.toLowerCase()) ||
      lowerHtml.includes(TARGET_LINK_2.toLowerCase()) ||
      lowerText.includes(TARGET_LINK_1.toLowerCase()) ||
      lowerText.includes(TARGET_LINK_2.toLowerCase())
    );
  }

  function searchLast15Min(imapConfig, userEmail) {
    return new Promise((resolve, reject) => {
      const imap = new Imap(imapConfig);

      imap.once("ready", () => {
        imap.openBox("INBOX", true, async (err, box) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

          // Search emails "SINCE last-15-min" – much faster
          const searchDate = fifteenMinutesAgo.toISOString().slice(0, 10); // YYYY-MM-DD

          imap.search(["SINCE", searchDate], (err, results) => {
            if (err) {
              imap.end();
              return reject(err);
            }

            if (!results || results.length === 0) {
              imap.end();
              return resolve([]);
            }

            const fetch = imap.fetch(results.slice(-50), { bodies: "", struct: true });

            const emailPromises = [];

            fetch.on("message", (msg, seqno) => {
              const p = new Promise((resolveMsg) => {
                let parsedEmail = null;

                msg.on("body", (stream) => {
                  simpleParser(stream, (err, data) => {
                    parsedEmail = data || null;
                  });
                });

                msg.once("end", () => {
                  resolveMsg(parsedEmail);
                });
              });

              emailPromises.push(p);
            });

            fetch.once("end", async () => {
              imap.end();
              const emails = (await Promise.all(emailPromises)).filter(Boolean);

              const filtered = emails
                .filter((e) => {
                  if (!e.date) return false;
                  return new Date(e.date) >= fifteenMinutesAgo;
                })
                .filter((e) => containsTargetNetflixLink(e.html, e.text))
                .sort((a, b) => new Date(b.date) - new Date(a.date));

              if (filtered.length === 0) return resolve([]);

              const latest = filtered[0];

              return resolve([
                {
                  id: latest.messageId || `${Date.now()}`,
                  subject: latest.subject || "",
                  receivedAt: latest.date
                    ? new Date(latest.date).toISOString()
                    : new Date().toISOString(),
                  from: latest.from?.text || "",
                  to: latest.to?.text || "",
                  rawHtml: latest.html || latest.textAsHtml || "",
                },
              ]);
            });
          });
        });
      });

      imap.once("error", (err) => reject(err));
      imap.connect();
    });
  }

  try {
    const emails = await searchLast15Min(imapConfig, email);
    return res.status(200).json({ success: true, emails });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Something went wrong",
    });
  }
                    }
