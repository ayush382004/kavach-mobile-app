const twilio = require('twilio');

class SMSClient {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromPhone = process.env.TWILIO_PHONE_NUMBER;
    this.isConfigured = !!(this.accountSid && this.authToken && this.fromPhone);

    if (this.isConfigured) {
      this.client = twilio(this.accountSid, this.authToken);
    } else {
      console.warn('⚠️ Twilio SMS not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER to .env');
    }
  }

  async sendOTP(toPhone, otp) {
    const formattedPhone = toPhone.startsWith('+91') ? toPhone : `+91${toPhone}`;
    const message = `KavachForWork verification code: ${otp}. Do not share this code with anyone.`;

    if (!this.isConfigured) {
      console.log(`[SMS MOCK] To: ${formattedPhone} | Message: ${message}`);
      return { success: true, mock: true };
    }

    try {
      const response = await this.client.messages.create({
        body: message,
        from: this.fromPhone,
        to: formattedPhone,
      });
      console.log(`[SMS SENT] To: ${formattedPhone} | SID: ${response.sid}`);
      return { success: true, sid: response.sid };
    } catch (error) {
      console.error(`[SMS ERROR] Failed to send SMS to ${formattedPhone}:`, error.message);
      throw new Error('Failed to send SMS message');
    }
  }
}

module.exports = new SMSClient();
