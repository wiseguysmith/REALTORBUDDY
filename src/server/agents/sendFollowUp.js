const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');

/**
 * RealtorBuddy Follow-Up Agent
 * Automates outreach cadence across WhatsApp + email
 * Hybrid model: auto for warm/cold, draft-approve for hot
 */
exports.sendFollowUp = onSchedule('every 1 hours', async (event) => {
  logger.info('Starting follow-up agent execution');

  try {
    const db = require('firebase-admin').firestore();
    
    // Get leads that need follow-up
    const leadsNeedingFollowUp = await getLeadsNeedingFollowUp(db);
    
    logger.info(`Found ${leadsNeedingFollowUp.length} leads needing follow-up`);
    
    for (const lead of leadsNeedingFollowUp) {
      await processFollowUp(lead, db);
    }
    
    logger.info('Follow-up agent execution completed successfully');
    
  } catch (error) {
    logger.error('Error in follow-up agent execution:', error);
  }
});

/**
 * Get leads that need follow-up based on their status and last contact
 */
async function getLeadsNeedingFollowUp(db) {
  const now = new Date();
  const leads = [];
  
  // Get Hot leads (contact every 2 days)
  const hotLeadsQuery = await db.collection('leads')
    .where('leadStatus', '==', 'Hot')
    .where('status', '==', 'Active')
    .get();
    
  for (const doc of hotLeadsQuery.docs) {
    const lead = { id: doc.id, ...doc.data() };
    const daysSinceContact = getDaysSinceContact(lead.lastContactDate);
    
    if (daysSinceContact >= 2) {
      leads.push({ ...lead, followUpType: 'Hot' });
    }
  }
  
  // Get Warm leads (contact weekly)
  const warmLeadsQuery = await db.collection('leads')
    .where('leadStatus', '==', 'Warm')
    .where('status', '==', 'Active')
    .get();
    
  for (const doc of warmLeadsQuery.docs) {
    const lead = { id: doc.id, ...doc.data() };
    const daysSinceContact = getDaysSinceContact(lead.lastContactDate);
    
    if (daysSinceContact >= 7) {
      leads.push({ ...lead, followUpType: 'Warm' });
    }
  }
  
  // Get Nurture leads (contact monthly)
  const nurtureLeadsQuery = await db.collection('leads')
    .where('leadStatus', '==', 'Nurture')
    .where('status', '==', 'Active')
    .get();
    
  for (const doc of nurtureLeadsQuery.docs) {
    const lead = { id: doc.id, ...doc.data() };
    const daysSinceContact = getDaysSinceContact(lead.lastContactDate);
    
    if (daysSinceContact >= 30) {
      leads.push({ ...lead, followUpType: 'Nurture' });
    }
  }
  
  return leads;
}

/**
 * Process follow-up for a single lead
 */
async function processFollowUp(lead, db) {
  try {
    // Check if lead has opted out
    const hasOptedOut = await checkOptOutStatus(lead.id, db);
    if (hasOptedOut) {
      logger.info(`Lead ${lead.id} has opted out, skipping follow-up`);
      return;
    }
    
    // Check for duplicate outreach (prevent spam)
    const hasRecentOutreach = await checkRecentOutreach(lead.id, db);
    if (hasRecentOutreach) {
      logger.info(`Lead ${lead.id} has recent outreach, skipping to prevent spam`);
      return;
    }
    
    if (lead.followUpType === 'Hot') {
      await handleHotLeadFollowUp(lead, db);
    } else {
      await handleAutomatedFollowUp(lead, db);
    }
    
  } catch (error) {
    logger.error(`Error processing follow-up for lead ${lead.id}:`, error);
  }
}

/**
 * Handle Hot lead follow-up (draft for approval)
 */
async function handleHotLeadFollowUp(lead, db) {
  logger.info(`Creating draft message for Hot lead: ${lead.id}`);
  
  const message = generatePersonalizedMessage(lead, 'Hot');
  
  // Create draft message in database
  await db.collection('messageLogs').add({
    leadId: lead.id,
    channel: 'Draft',
    content: message.content,
    subject: message.subject,
    direction: 'Outbound',
    status: 'Draft',
    followUpType: 'Hot',
    requiresApproval: true,
    createdAt: new Date(),
    userId: lead.userId
  });
  
  // Update lead's next action date
  await db.collection('leads').doc(lead.id).update({
    nextActionDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    updatedAt: new Date()
  });
}

/**
 * Handle automated follow-up for Warm/Nurture leads
 */
async function handleAutomatedFollowUp(lead, db) {
  logger.info(`Sending automated follow-up for ${lead.followUpType} lead: ${lead.id}`);
  
  const message = generatePersonalizedMessage(lead, lead.followUpType);
  
  // Send message via appropriate channel
  let messageStatus = 'Sent';
  try {
    if (lead.preferredChannel === 'WhatsApp' || !lead.preferredChannel) {
      await sendWhatsAppMessage(lead, message);
    } else {
      await sendEmailMessage(lead, message);
    }
  } catch (error) {
    logger.error(`Failed to send message to lead ${lead.id}:`, error);
    messageStatus = 'Failed';
  }
  
  // Log the message
  await db.collection('messageLogs').add({
    leadId: lead.id,
    channel: lead.preferredChannel || 'WhatsApp',
    content: message.content,
    subject: message.subject,
    direction: 'Outbound',
    status: messageStatus,
    followUpType: lead.followUpType,
    requiresApproval: false,
    sentAt: new Date(),
    userId: lead.userId
  });
  
  // Update lead's contact tracking
  const nextContactDate = calculateNextContactDate(lead.followUpType);
  await db.collection('leads').doc(lead.id).update({
    lastContactDate: new Date(),
    nextActionDate: nextContactDate,
    updatedAt: new Date()
  });
}

/**
 * Generate personalized message based on lead type
 */
function generatePersonalizedMessage(lead, followUpType) {
  const templates = {
    Hot: {
      subject: `Quick follow-up on your ${lead.timeline} home search`,
      content: `Hi ${lead.firstName},

I wanted to follow up on your home search with a ${lead.timeline} timeline. Given your budget of $${lead.budget?.toLocaleString()} and ${lead.lenderStatus.toLowerCase()} status, I have some exciting opportunities that just came on the market.

Would you be available for a quick 10-minute call this week to discuss your priorities and show you what's available?

Best regards,
Cizar`
    },
    Warm: {
      subject: `Market update for ${lead.firstName}`,
      content: `Hi ${lead.firstName},

I hope you're doing well! I wanted to share a quick market update and check in on your home search.

The market has been quite active, and I'm seeing some great opportunities in your price range. When you're ready to move forward, I'm here to help make the process smooth and successful.

Feel free to reach out if you have any questions or want to schedule a showing.

Best,
Cizar`
    },
    Nurture: {
      subject: `Monthly market insights + financing tip`,
      content: `Hi ${lead.firstName},

Here's your monthly real estate update:

📈 Market Stats: Home prices in your area are ${getMarketTrend()} this month
💰 Financing Tip: ${getFinancingTip()}
🏠 New Listings: ${getNewListingsCount()} homes in your budget range

I'm here whenever you're ready to take the next step in your home search. No pressure, just keeping you informed!

Best regards,
Cizar`
    }
  };
  
  return templates[followUpType] || templates.Warm;
}

/**
 * Send WhatsApp message via Twilio
 */
async function sendWhatsAppMessage(lead, message) {
  // This would integrate with Twilio WhatsApp API
  // For now, we'll simulate the API call
  logger.info(`Sending WhatsApp message to ${lead.phone}: ${message.content.substring(0, 50)}...`);
  
  // In production, this would be:
  // const twilio = require('twilio');
  // const client = twilio(accountSid, authToken);
  // await client.messages.create({
  //   from: 'whatsapp:+14155238886',
  //   to: `whatsapp:${lead.phone}`,
  //   body: message.content
  // });
}

/**
 * Send email message via SendGrid
 */
async function sendEmailMessage(lead, message) {
  // This would integrate with SendGrid API
  // For now, we'll simulate the API call
  logger.info(`Sending email to ${lead.email}: ${message.subject}`);
  
  // In production, this would be:
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // await sgMail.send({
  //   to: lead.email,
  //   from: 'noreply@realtorbuddy.com',
  //   subject: message.subject,
  //   text: message.content
  // });
}

/**
 * Utility functions
 */
function getDaysSinceContact(lastContactDate) {
  if (!lastContactDate) return 999; // Never contacted
  return (new Date() - new Date(lastContactDate)) / (1000 * 60 * 60 * 24);
}

function calculateNextContactDate(followUpType) {
  const now = new Date();
  switch (followUpType) {
    case 'Hot': return new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days
    case 'Warm': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    case 'Nurture': return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    default: return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
}

async function checkOptOutStatus(leadId, db) {
  const optOutQuery = await db.collection('complianceEvents')
    .where('leadId', '==', leadId)
    .where('eventType', '==', 'OptOut')
    .get();
    
  return !optOutQuery.empty;
}

async function checkRecentOutreach(leadId, db) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentOutreach = await db.collection('messageLogs')
    .where('leadId', '==', leadId)
    .where('direction', '==', 'Outbound')
    .where('createdAt', '>', oneDayAgo)
    .get();
    
  return !recentOutreach.empty;
}

function getMarketTrend() {
  const trends = ['up 2%', 'down 1%', 'stable'];
  return trends[Math.floor(Math.random() * trends.length)];
}

function getFinancingTip() {
  const tips = [
    'Consider getting pre-approved before shopping to strengthen your offers',
    'First-time buyer programs can save you thousands in down payment assistance',
    'Interest rates are currently favorable - lock in your rate early'
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}

function getNewListingsCount() {
  return Math.floor(Math.random() * 10) + 1;
}
