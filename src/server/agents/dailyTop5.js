const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');

/**
 * RealtorBuddy Analytics Agent
 * Generates Daily Top 5 report and ROI dashboard
 * Sends via WhatsApp/email at 9am daily
 */
exports.dailyTop5 = onSchedule('0 9 * * *', async (event) => {
  logger.info('Starting Daily Top 5 report generation');

  try {
    const db = require('firebase-admin').firestore();
    
    // Get all active users (realtors)
    const users = await getActiveUsers(db);
    
    for (const user of users) {
      await generateUserReport(user, db);
    }
    
    logger.info('Daily Top 5 reports generated successfully');
    
  } catch (error) {
    logger.error('Error generating Daily Top 5 reports:', error);
  }
});

/**
 * Get all active users (realtors)
 */
async function getActiveUsers(db) {
  const usersQuery = await db.collection('users')
    .where('status', '==', 'active')
    .get();
    
  return usersQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Generate personalized report for a user
 */
async function generateUserReport(user, db) {
  try {
    // Get user's leads
    const leads = await getUserLeads(user.id, db);
    
    // Calculate top 5 leads
    const top5Leads = calculateTop5Leads(leads);
    
    // Generate ROI metrics
    const roiMetrics = await calculateROIMetrics(user.id, db);
    
    // Generate report content
    const report = generateReportContent(user, top5Leads, roiMetrics);
    
    // Send report via preferred channel
    await sendReport(user, report);
    
    // Log the report
    await logReport(user.id, report, db);
    
    logger.info(`Daily Top 5 report sent to user ${user.id}`);
    
  } catch (error) {
    logger.error(`Error generating report for user ${user.id}:`, error);
  }
}

/**
 * Get user's leads with relevant data
 */
async function getUserLeads(userId, db) {
  const leadsQuery = await db.collection('leads')
    .where('userId', '==', userId)
    .where('status', 'in', ['New', 'Active'])
    .get();
    
  const leads = leadsQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Enrich leads with engagement data
  for (const lead of leads) {
    lead.engagementScore = await calculateEngagementScore(lead.id, db);
  }
  
  return leads;
}

/**
 * Calculate top 5 leads based on score and engagement
 */
function calculateTop5Leads(leads) {
  return leads
    .sort((a, b) => {
      // Primary sort: Lead status (Hot > Warm > Nurture)
      const statusPriority = { Hot: 3, Warm: 2, Nurture: 1 };
      const statusDiff = (statusPriority[b.leadStatus] || 0) - (statusPriority[a.leadStatus] || 0);
      
      if (statusDiff !== 0) return statusDiff;
      
      // Secondary sort: Score * Engagement
      const scoreA = (a.score || 0) * (a.engagementScore || 0.5);
      const scoreB = (b.score || 0) * (b.engagementScore || 0.5);
      
      return scoreB - scoreA;
    })
    .slice(0, 5);
}

/**
 * Calculate engagement score for a lead
 */
async function calculateEngagementScore(leadId, db) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  // Count recent interactions
  const interactionsQuery = await db.collection('messageLogs')
    .where('leadId', '==', leadId)
    .where('createdAt', '>', oneWeekAgo)
    .get();
    
  const interactionCount = interactionsQuery.docs.length;
  
  // Calculate engagement score (0-1)
  if (interactionCount >= 5) return 1.0;
  if (interactionCount >= 3) return 0.8;
  if (interactionCount >= 1) return 0.6;
  return 0.3;
}

/**
 * Calculate ROI metrics
 */
async function calculateROIMetrics(userId, db) {
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  // Get message logs for the month
  const messageLogsQuery = await db.collection('messageLogs')
    .where('userId', '==', userId)
    .where('createdAt', '>', oneMonthAgo)
    .get();
    
  const messageCount = messageLogsQuery.docs.length;
  
  // Get closed deals for the month
  const closedDealsQuery = await db.collection('leads')
    .where('userId', '==', userId)
    .where('status', '==', 'Closed')
    .where('updatedAt', '>', oneMonthAgo)
    .get();
    
  const closedDeals = closedDealsQuery.docs.length;
  
  // Calculate hours saved (estimate: 5 minutes per automated message)
  const hoursSaved = Math.round((messageCount * 5) / 60);
  
  // Calculate revenue impact (estimate: $10k average deal value)
  const revenueImpact = closedDeals * 10000;
  
  return {
    messagesSent: messageCount,
    dealsClosed: closedDeals,
    hoursSaved,
    revenueImpact,
    efficiency: closedDeals > 0 ? (closedDeals / messageCount * 100).toFixed(1) : 0
  };
}

/**
 * Generate report content
 */
function generateReportContent(user, top5Leads, roiMetrics) {
  const currentDate = new Date().toLocaleDateString();
  
  let reportContent = `🏠 *Daily Top 5 Leads - ${currentDate}*\n\n`;
  
  if (top5Leads.length === 0) {
    reportContent += `📊 *No priority leads today*\n\n`;
    reportContent += `Focus on your nurture pool and consider running some lead generation campaigns.\n\n`;
  } else {
    top5Leads.forEach((lead, index) => {
      const emoji = lead.leadStatus === 'Hot' ? '🔥' : lead.leadStatus === 'Warm' ? '⚡' : '🌱';
      const status = lead.leadStatus || 'New';
      const score = lead.score || 0;
      const budget = lead.budget ? `$${lead.budget.toLocaleString()}` : 'Unknown';
      
      reportContent += `${index + 1}. ${emoji} *${lead.firstName} ${lead.lastName}* (${status})\n`;
      reportContent += `   Score: ${score}/100 | Budget: ${budget}\n`;
      if (lead.explainabilityCard) {
        reportContent += `   ${lead.explainabilityCard}\n`;
      }
      reportContent += `\n`;
    });
  }
  
  // Add ROI section
  reportContent += `📈 *This Month's Impact:*\n`;
  reportContent += `• ${roiMetrics.dealsClosed} deals closed\n`;
  reportContent += `• ${roiMetrics.hoursSaved} hours saved\n`;
  reportContent += `• $${roiMetrics.revenueImpact.toLocaleString()} revenue impact\n`;
  reportContent += `• ${roiMetrics.efficiency}% conversion efficiency\n\n`;
  
  // Add action items
  reportContent += `🎯 *Today's Action Items:*\n`;
  if (top5Leads.some(lead => lead.leadStatus === 'Hot')) {
    reportContent += `• Review and approve Hot lead draft messages\n`;
  }
  reportContent += `• Follow up on any pending showings\n`;
  reportContent += `• Check nurture pool for re-engagement opportunities\n\n`;
  
  reportContent += `💡 *Pro Tip:* Hot leads should be contacted within 2 hours for best results.\n\n`;
  reportContent += `_Generated by RealtorBuddy Analytics Agent_`;
  
  return {
    content: reportContent,
    top5Leads,
    roiMetrics,
    generatedAt: new Date()
  };
}

/**
 * Send report to user via preferred channel
 */
async function sendReport(user, report) {
  try {
    if (user.preferredChannel === 'WhatsApp' || !user.preferredChannel) {
      await sendWhatsAppReport(user, report);
    } else {
      await sendEmailReport(user, report);
    }
  } catch (error) {
    logger.error(`Failed to send report to user ${user.id}:`, error);
  }
}

/**
 * Send report via WhatsApp
 */
async function sendWhatsAppReport(user, report) {
  logger.info(`Sending WhatsApp report to ${user.phone}`);
  
  // In production, this would integrate with Twilio WhatsApp API
  // const twilio = require('twilio');
  // const client = twilio(accountSid, authToken);
  // await client.messages.create({
  //   from: 'whatsapp:+14155238886',
  //   to: `whatsapp:${user.phone}`,
  //   body: report.content
  // });
}

/**
 * Send report via email
 */
async function sendEmailReport(user, report) {
  logger.info(`Sending email report to ${user.email}`);
  
  // In production, this would integrate with SendGrid API
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // await sgMail.send({
  //   to: user.email,
  //   from: 'analytics@realtorbuddy.com',
  //   subject: `Daily Top 5 Leads - ${new Date().toLocaleDateString()}`,
  //   text: report.content,
  //   html: convertToHtml(report.content)
  // });
}

/**
 * Log the generated report
 */
async function logReport(userId, report, db) {
  await db.collection('analyticsReports').add({
    userId,
    reportType: 'DailyTop5',
    content: report.content,
    top5Leads: report.top5Leads.map(lead => lead.id),
    roiMetrics: report.roiMetrics,
    generatedAt: report.generatedAt,
    status: 'Sent'
  });
}

/**
 * Convert text report to HTML for email
 */
function convertToHtml(textContent) {
  return textContent
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
    .replace(/\•/g, '&bull;')
    .replace(/_/g, '<em>')
    .replace(/_/g, '</em>');
}
