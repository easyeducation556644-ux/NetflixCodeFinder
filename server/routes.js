import Imap from "imap";
import { simpleParser } from "mailparser";
import translatte from "translatte";

async function translateToEnglish(text) {
  if (!text || text.trim() === "") return text;
  
  try {
    console.log("Translating text (length:", text.length, ")");
    
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
    console.log("Translation result:", result.text ? result.text.substring(0, 100) + "..." : "empty");
    return result.text;
  } catch (error) {
    console.error("Translation error:", error.message);
    return text;
  }
}

function getLinkLabel(url) {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes("yesitwasme") || urlLower.includes("yes-it-was-me") || urlLower.includes("yes_it_was_me")) {
    return "Yes, It Was Me";
  } else if (urlLower.includes("notme") || urlLower.includes("not-me") || urlLower.includes("not_me") || urlLower.includes("wasntme")) {
    return "No, It Wasn't Me";
  } else if (urlLower.includes("travel") || urlLower.includes("temporary-access") || urlLower.includes("getcode") || urlLower.includes("get-code")) {
    return "Get Code";
  } else if (urlLower.includes("password") || urlLower.includes("reset")) {
    return "Change Password";
  } else if (urlLower.includes("device") || urlLower.includes("signout") || urlLower.includes("sign-out") || urlLower.includes("manage")) {
    return "Manage Devices";
  } else if (urlLower.includes("verify") || urlLower.includes("confirm")) {
    return "Verify";
  } else if (urlLower.includes("loginhelp") || urlLower.includes("login-help")) {
    return "Login Help";
  } else if (urlLower.includes("/account")) {
    return "Get Code";
  }
  return "Get Code";
}

function categorizeLinkType(url) {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes("travel") || urlLower.includes("temporary") || urlLower.includes("getcode") || urlLower.includes("get-code")) {
    return "getCode";
  } else if (urlLower.includes("password") || urlLower.includes("reset")) {
    return "resetPassword";
  } else if (urlLower.includes("device") || urlLower.includes("signout") || urlLower.includes("sign-out") || urlLower.includes("manage") || urlLower.includes("/account")) {
    return "manageDevices";
  } else if (urlLower.includes("yesitwasme") || urlLower.includes("yes-it-was-me")) {
    return "yesItWasMe";
  } else if (urlLower.includes("notme") || urlLower.includes("not-me")) {
    return "notMe";
  }
  return "other";
}

function isMainActionLink(url) {
  const urlLower = url.toLowerCase();
  
  const promotionalPatterns = [
    /browse/i,
    /title/i,
    /watch/i,
    /latest/i,
    /tudum/i,
    /about/i,
    /jobs/i,
    /legal/i,
    /privacy/i,
    /terms/i,
    /help\.netflix/i,
    /media\.netflix/i,
    /unsubscribe/i,
    /mailto:/i,
    /notification/i,
    /settings/i,
  ];
  
  for (const pattern of promotionalPatterns) {
    if (pattern.test(urlLower)) {
      return false;
    }
  }
  
  const mainActionKeywords = [
    'yesitwasme',
    'yes-it-was-me',
    'yes_it_was_me',
    'notme',
    'not-me',
    'not_me',
    'wasntme',
    'travel',
    'temporary',
    'getcode',
    'get-code',
    'get_code',
    'account/travel',
    'account/update',
    'account/confirm',
    'account/verify',
    'password',
    'loginhelp',
    'login-help',
    'dnr',
    'nflink',
    '/e/',
    'accountaccess',
    'verify',
    'confirm',
    'reset',
    'signin',
    'sign-in',
    'activate',
    'action',
    'click.',
    'email.netflix',
  ];
  
  for (const keyword of mainActionKeywords) {
    if (urlLower.includes(keyword)) {
      return true;
    }
  }
  
  return false;
}

async function processContentWithLinks(html, text) {
  const seenUrls = new Set();
  const linkPlaceholders = [];
  let placeholderIndex = 0;
  
  const footerPatterns = [
    /we're here to help/i,
    /visit the help center/i,
    /the netflix team/i,
    /questions\?/i,
    /this message was mailed to/i,
    /this message was sent to/i,
    /netflix international/i,
    /notification settings/i,
    /terms of use/i,
    /privacy/i,
    /help center netflix/i,
    /netflix entretenimento/i,
    /netflix m[eé]xico/i,
    /netflix dream/i,
    /customer center/i,
    /please check the page/i,
    /for more detailed information/i,
    /contact our/i,
    /need help\??/i,
    /it's also good/i,
    /src:/i,
    /s\. de r\.l\./i,
    /do you have any questions/i,
  ];
  
  let processedHtml = html || "";
  
  if (processedHtml) {
    processedHtml = processedHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
    processedHtml = processedHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
    
    const linkRegex = /<a[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    
    processedHtml = processedHtml.replace(linkRegex, (match, url, linkContent) => {
      url = url.replace(/&amp;/g, "&");
      const urlLower = url.toLowerCase();
      
      const plainText = linkContent.replace(/<[^>]+>/g, '').trim();
      
      if (urlLower.includes("unsubscribe") || urlLower.includes("mailto:") || urlLower.includes("help.netflix") || urlLower.includes("notification") || urlLower.includes("privacy") || urlLower.includes("terms") || urlLower.includes("legal")) {
        return plainText;
      }
      
      const isNetflixUrl = urlLower.includes("netflix.com") || urlLower.includes("netflix") || urlLower.includes("nflx");
      
      if (isNetflixUrl && isMainActionLink(urlLower) && !seenUrls.has(urlLower)) {
        seenUrls.add(urlLower);
        const label = getLinkLabel(urlLower);
        const category = categorizeLinkType(urlLower);
        const placeholder = `___LINK_PLACEHOLDER_${placeholderIndex}___`;
        linkPlaceholders.push({
          placeholder,
          link: { type: "link", label, url, isMain: true, category }
        });
        placeholderIndex++;
        return `\n${placeholder}\n`;
      }
      
      return plainText;
    });
    
    processedHtml = processedHtml.replace(/<br\s*\/?>/gi, "\n");
    processedHtml = processedHtml.replace(/<\/p>/gi, "\n\n");
    processedHtml = processedHtml.replace(/<\/div>/gi, "\n");
    processedHtml = processedHtml.replace(/<\/tr>/gi, "\n");
    processedHtml = processedHtml.replace(/<[^>]+>/g, " ");
    processedHtml = processedHtml.replace(/&shy;/gi, "");
    processedHtml = processedHtml.replace(/\u00AD/g, "");
    processedHtml = processedHtml.replace(/&#173;/gi, "");
    processedHtml = processedHtml.replace(/&#x00AD;/gi, "");
    processedHtml = processedHtml.replace(/&nbsp;/gi, " ");
    processedHtml = processedHtml.replace(/&amp;/gi, "&");
    processedHtml = processedHtml.replace(/&lt;/gi, "<");
    processedHtml = processedHtml.replace(/&gt;/gi, ">");
    processedHtml = processedHtml.replace(/&quot;/gi, '"');
    processedHtml = processedHtml.replace(/&#39;/gi, "'");
    processedHtml = processedHtml.replace(/&#x27;/gi, "'");
    processedHtml = processedHtml.replace(/&#\d+;/gi, "");
  }
  
  let content = processedHtml || text || "";
  
  content = content.replace(/https?:\/\/[^\s]+/gi, "");
  content = content.replace(/[ \t]+/g, " ");
  content = content.replace(/\n\s*\n\s*\n/g, "\n\n");
  content = content.trim();
  
  const lines = content.split('\n');
  let cutoffIndex = lines.length;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes("___link_placeholder_")) continue;
    for (const pattern of footerPatterns) {
      if (pattern.test(line)) {
        cutoffIndex = i;
        break;
      }
    }
    if (cutoffIndex !== lines.length) break;
  }
  
  const cleanedLines = lines.slice(0, cutoffIndex)
    .filter(line => line.trim())
    .filter(line => !line.trim().match(/^\[+$/))
    .filter(line => !line.trim().match(/^\]+$/))
    .filter(line => line.trim() !== '[')
    .filter(line => line.trim() !== ']');
  const cleanedContent = cleanedLines.join('\n').trim();
  
  const segments = [];
  
  if (linkPlaceholders.length === 0) {
    if (cleanedContent) {
      const translated = await translateToEnglish(cleanedContent);
      segments.push({ type: "text", value: translated });
    }
    return segments;
  }
  
  const placeholderRegex = /___LINK_PLACEHOLDER_(\d+)___/g;
  let lastIndex = 0;
  let match;
  const contentParts = [];
  
  while ((match = placeholderRegex.exec(cleanedContent)) !== null) {
    if (match.index > lastIndex) {
      const textBefore = cleanedContent.slice(lastIndex, match.index).trim();
      if (textBefore) {
        contentParts.push({ type: "text", value: textBefore });
      }
    }
    const linkIndex = parseInt(match[1], 10);
    const linkData = linkPlaceholders.find(p => p.placeholder === match[0]);
    if (linkData) {
      contentParts.push({ type: "button", link: linkData.link });
    }
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < cleanedContent.length) {
    const textAfter = cleanedContent.slice(lastIndex).trim();
    if (textAfter) {
      contentParts.push({ type: "text", value: textAfter });
    }
  }
  
  for (const part of contentParts) {
    if (part.type === "text") {
      const translated = await translateToEnglish(part.value);
      segments.push({ type: "text", value: translated });
    } else if (part.type === "button") {
      segments.push({ type: "buttons", buttons: [part.link] });
    }
  }
  
  return segments;
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

function normalizeText(text) {
  return (text || "")
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function extractTempLink(text) {
  const match = text.match(/https:\/\/www\.netflix\.com\/account\S+/i);
  return match ? match[0] : null;
}

function hasAccountLink(htmlContent) {
  return /netflix\.com\/account/i.test(htmlContent);
}

function isHouseholdEmail(translatedSubject, htmlContent) {
  const subject = (translatedSubject || "").toLowerCase();
  
  const subjectKeywords = [
    "temporary",
    "household", 
    "temp",
    "home"
  ];
  const hasKeyword = subjectKeywords.some(kw => subject.includes(kw));
  
  const hasLink = hasAccountLink(htmlContent);
  
  return hasKeyword && hasLink;
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
      const results = await searchNetflixEmails(imapConfig, email);
      if (results && results.length > 0) {
        res.json({ emails: results, totalCount: results.length });
      } else {
        res.status(404).json({ 
          error: "No Netflix email found for this address." 
        });
      }
    } catch (error) {
      res.status(500).json({ 
        error: getUserFriendlyError(error)
      });
    }
  });

  return httpServer;
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
              
              const basicFilteredEmails = emails
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

              const sortedEmails = basicFilteredEmails.sort((a, b) => new Date(b.date) - new Date(a.date));

              imap.end();

              let householdEmail = null;
              
              for (const email of sortedEmails) {
                const subject = email.subject || "";
                const htmlContent = email.html || "";
                
                const translatedSubject = await translateToEnglish(subject);
                
                if (isHouseholdEmail(translatedSubject, htmlContent)) {
                  householdEmail = email;
                  break;
                }
              }

              if (!householdEmail) {
                resolve([]);
                return;
              }

              const htmlContent = householdEmail.html || "";
              const textContent = householdEmail.text || "";
              const combinedContent = textContent + " " + htmlContent;
              
              const translatedSubject = await translateToEnglish(householdEmail.subject || "Email");
              const contentSegments = await processContentWithLinks(htmlContent, textContent);
              const accessCode = extractAccessCode(combinedContent);
              
              let translatedHtml = htmlContent;
              try {
                const textOnly = htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                if (textOnly.length > 0 && textOnly.length < 15000) {
                  const translatedText = await translateToEnglish(textOnly);
                  const paragraphs = translatedText.split(/\n+/).filter(p => p.trim());
                  
                  let mainButtonHtml = '';
                  let deviceInfoHtml = '';
                  
                  for (const seg of contentSegments) {
                    if (seg.type === 'buttons' && seg.buttons) {
                      for (const btn of seg.buttons) {
                        if (btn.category === 'yesItWasMe') {
                          mainButtonHtml = `
                            <a href="${btn.url}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #E50914; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 500; font-size: 15px;">
                              ${btn.label}
                            </a>`;
                          break;
                        }
                      }
                    }
                  }
                  
                  const deviceMatch = translatedText.match(/request.*?from.*?device.*?(\w+.*?stick|\w+.*?tv|\w+.*?phone|\w+.*?tablet)/i);
                  const dateMatch = translatedText.match(/(\w+\s+\d+,?\s*\d*|\d+\s+\w+,?\s*\d*)/i);
                  
                  if (deviceMatch || dateMatch) {
                    deviceInfoHtml = `
                      <div style="background-color: #ffffff; border-radius: 8px; padding: 16px 20px; margin: 20px 0; display: flex; align-items: flex-start; gap: 16px;">
                        <div style="width: 40px; height: 40px; background-color: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                          <span style="font-size: 20px;">📺</span>
                        </div>
                        <div style="flex: 1; color: #333333; font-size: 14px; line-height: 1.5;">
                          <div>Request sent from device</div>
                          <div style="font-weight: bold; margin: 4px 0;">${deviceMatch ? deviceMatch[1] : 'Streaming Device'}</div>
                          <div style="color: #666666;">${dateMatch ? dateMatch[1] : ''}</div>
                        </div>
                      </div>
                      <div style="text-align: center; margin: 20px 0;">
                        ${mainButtonHtml}
                      </div>
                      <p style="color: #999999; font-size: 13px; margin-top: 16px;">* The link expires after 15 minutes.</p>
                    `;
                  }
                  
                  const bodyParagraphs = paragraphs.slice(0, Math.min(4, paragraphs.length));
                  
                  translatedHtml = `
                    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 100%; background-color: #000000; color: #ffffff; padding: 0;">
                      <div style="padding: 20px;">
                        <h1 style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0 0 20px 0; line-height: 1.3;">
                          Do you want to update your Netflix Household?
                        </h1>
                        ${bodyParagraphs.map(p => `<p style="margin: 0 0 16px 0; color: #ffffff; font-size: 15px; line-height: 1.6;">${p}</p>`).join('')}
                        ${deviceInfoHtml || (mainButtonHtml ? `<div style="text-align: center; margin: 24px 0;">${mainButtonHtml}</div>` : '')}
                      </div>
                    </div>`;
                }
              } catch (e) {
                console.log("Translation error:", e);
              }
              
              const formattedEmail = {
                id: householdEmail.messageId || `${Date.now()}-${Math.random()}`,
                subject: translatedSubject,
                receivedAt: householdEmail.date ? householdEmail.date.toISOString() : new Date().toISOString(),
                from: householdEmail.from?.text || "",
                to: householdEmail.to?.text || "",
                contentSegments: contentSegments,
                accessCode: accessCode,
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
