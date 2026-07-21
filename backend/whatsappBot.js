/**
 * EduConnect WhatsApp & AI Auto-Reply Bot Engine
 * Handles knowledge base answers, auto-reply delays, human override queues,
 * and Meta WhatsApp Business API webhook integrations.
 */

const https = require('https');

// In-memory pending timers for auto-reply fallback (contactPhone -> TimeoutID)
const pendingReplyTimers = new Map();

// Default Configuration
let botConfig = {
  enabled: true,
  mode: 'hybrid', // 'instant' | 'hybrid' (delay fallback) | 'off'
  delaySeconds: 15,
  defaultGreeting: "Hello! Thanks for reaching out to EduConnect. Our team will be right with you. In the meantime, I'm EduBot, your assistant!",
  adminPhoneNumber: process.env.ADMIN_PHONE_NUMBER || '',
  whatsappPhoneId: process.env.WHATSAPP_PHONE_ID || '',
  whatsappToken: process.env.WHATSAPP_TOKEN || '',
  webhookVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'educonnect_verify_token_123'
};

// Knowledge base responses for EduConnect platform queries
const KNOWLEDGE_BASE = [
  {
    keywords: ['admission', 'referral', 'refer', 'apply', 'apply college', 'college'],
    response: "🎓 **EduConnect Admissions & Referrals:** You can submit college referrals for partner universities (Stanford, MIT, Oxford). Referrers earn between $1,000 - $2,000 commission for each verified student enrollment! Check out the 'Referrals' tab in your dashboard."
  },
  {
    keywords: ['course', 'marketplace', 'buy', 'learn', 'react', 'python', 'dsa'],
    response: "📚 **Course Marketplace:** Explore premium peer-to-peer tech courses like 'Fullstack React & Node Guide' ($99.99) and 'DSA in Python' ($49.99). Enrolled courses include access to live virtual classrooms!"
  },
  {
    keywords: ['class', 'schedule', 'live', 'meet', 'lecture', 'zoom'],
    response: "🎥 **Virtual Classrooms:** Live interactive lectures are hosted daily. View scheduled lectures and join Google Meet links directly under the 'Virtual Class' sidebar tab."
  },
  {
    keywords: ['password', 'forgot', 'reset', 'otp', 'login'],
    response: "🔐 **Account Support:** If you forgot your password, click 'Forgot Password?' on the login screen. You can enter your email to receive a 6-digit OTP code (or use master test code 123456)."
  },
  {
    keywords: ['demo', 'login', 'account', 'credentials'],
    response: "👤 **Demo Accounts:**\n- Student: student1@educonnect.com (pass: student123)\n- Admin: admin@educonnect.com (pass: admin123)\n- Teacher: teacher1@educonnect.com (pass: teacher123)"
  },
  {
    keywords: ['hi', 'hello', 'hey', 'start', 'help'],
    response: "👋 Welcome to EduConnect! How can I help you today? Ask me about:\n1. 🎓 College Admissions & Referrals\n2. 📚 Course Marketplace\n3. 🎥 Virtual Classes\n4. 🔐 Account & Password Support"
  }
];

/**
 * Generate bot response based on user input message
 */
function generateBotAnswer(userMessage) {
  const query = userMessage.toLowerCase().trim();
  let responseText = '';
  
  for (const item of KNOWLEDGE_BASE) {
    if (item.keywords.some(kw => query.includes(kw))) {
      responseText = item.response;
      break;
    }
  }

  if (!responseText) {
    responseText = `🤖 **EduBot Assistance:** Thanks for your message! Our human administrator has been notified and will reply shortly.\n\n*Frequently Asked Topics:*\n- Type "admissions" for college referral details.\n- Type "courses" to view available classes.\n- Type "help" for platform guide.`;
  }

  if (botConfig.adminPhoneNumber) {
    const cleanNumber = botConfig.adminPhoneNumber.replace(/[^0-9]/g, '');
    responseText += `\n\n💬 *Want to talk directly with me?* Click here to chat on WhatsApp: https://wa.me/${cleanNumber}`;
  }

  return responseText;
}

/**
 * Send WhatsApp Message via Meta Business API or Simulated Console Log
 */
async function sendWhatsAppMessage(toPhone, text) {
  const { whatsappPhoneId, whatsappToken } = botConfig;

  // Real Meta Cloud API mode
  if (whatsappPhoneId && whatsappToken) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'text',
        text: { body: text }
      });

      const options = {
        hostname: 'graph.facebook.com',
        path: `/v18.0/${whatsappPhoneId}/messages`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, mode: 'api', data: JSON.parse(data) });
          } else {
            console.error('[WhatsApp API Error]', data);
            resolve({ success: false, mode: 'api', error: data });
          }
        });
      });

      req.on('error', (err) => {
        console.error('[WhatsApp Network Error]', err);
        resolve({ success: false, mode: 'api', error: err.message });
      });

      req.write(payload);
      req.end();
    });
  }

  // Fallback Simulation Mode
  console.log("\n=========================================================");
  console.log("[WHATSAPP BOT SIMULATOR - OUTGOING MESSAGE]");
  console.log(`To WhatsApp Number: ${toPhone}`);
  console.log(`Message Body:\n${text}`);
  console.log("=========================================================\n");

  return { success: true, mode: 'simulated' };
}

/**
 * Handle incoming user message and schedule auto-reply if human is away
 */
function handleIncomingMessage(db, chatMessage, onBotReplyCallback) {
  const { phone_number, message } = chatMessage;

  // Clear existing pending auto-reply timer for this contact
  if (pendingReplyTimers.has(phone_number)) {
    clearTimeout(pendingReplyTimers.get(phone_number));
    pendingReplyTimers.delete(phone_number);
  }

  if (!botConfig.enabled || botConfig.mode === 'off') {
    return;
  }

  const triggerBotReply = async () => {
    pendingReplyTimers.delete(phone_number);
    const botText = generateBotAnswer(message);

    // Send via WhatsApp API or Simulator
    await sendWhatsAppMessage(phone_number, botText);

    // Record bot reply in database
    const today = new Date().toISOString();
    try {
      await db.run(
        "INSERT INTO WhatsAppChats (phone_number, sender, message, timestamp, status) VALUES (?, ?, ?, ?, ?)",
        [phone_number, 'bot', botText, today, 'replied_by_bot']
      );
      if (onBotReplyCallback) onBotReplyCallback({ phone_number, botText, timestamp: today });
    } catch (e) {
      console.error('[WhatsApp DB Save Error]', e);
    }
  };

  if (botConfig.mode === 'instant' || botConfig.delaySeconds === 0) {
    // Instant bot response
    triggerBotReply();
  } else {
    // Delay fallback: wait X seconds for human admin to reply
    const timerId = setTimeout(triggerBotReply, botConfig.delaySeconds * 1000);
    pendingReplyTimers.set(phone_number, timerId);
  }
}

/**
 * Cancel pending bot reply timer when human admin manually sends a reply
 */
function cancelPendingBotReply(phoneNumber) {
  if (pendingReplyTimers.has(phoneNumber)) {
    clearTimeout(pendingReplyTimers.get(phoneNumber));
    pendingReplyTimers.delete(phoneNumber);
    return true;
  }
  return false;
}

module.exports = {
  botConfig,
  generateBotAnswer,
  sendWhatsAppMessage,
  handleIncomingMessage,
  cancelPendingBotReply
};
