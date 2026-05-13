import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
const authToken = process.env.TWILIO_AUTH_TOKEN || '';
const fromNumber = process.env.TWILIO_FROM_NUMBER || '';

let client: twilio.Twilio | null = null;

function getClient() {
  if (!client && accountSid && authToken) {
    client = twilio(accountSid, authToken);
  }
  return client;
}

export async function sendSMS(to: string, body: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  const c = getClient();
  if (!c) {
    return { success: false, error: 'Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.' };
  }

  try {
    // Normalize phone number - ensure it has + prefix
    const normalized = to.startsWith('+') ? to : `+${to}`;
    const message = await c.messages.create({
      body,
      from: fromNumber,
      to: normalized,
    });
    return { success: true, sid: message.sid };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to send SMS' };
  }
}
