const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Export all RealtorBuddy agents
exports.intakeLead = require('./agents/intakeLead').intakeLead;
exports.scoreLead = require('./agents/scoreLead').scoreLead;
exports.sendFollowUp = require('./agents/sendFollowUp').sendFollowUp;
exports.dailyTop5 = require('./agents/dailyTop5').dailyTop5;
exports.healthCheck = require('./agents/healthCheck').healthCheck;

// RealtorBuddy-specific endpoints (replacing Agentic Marketplace endpoints)
const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');

/**
 * Get user's leads (replaces getUserAgents)
 */
exports.getLeads = onRequest(async (req, res) => {
  try {
    const userId = req.headers.authorization?.replace('Bearer ', '');
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const leadsSnapshot = await db.collection('leads')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const leads = leadsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ leads });

  } catch (error) {
    logger.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get lead logs/messages (replaces getAgentLogs)
 */
exports.getLeadLogs = onRequest(async (req, res) => {
  try {
    const userId = req.headers.authorization?.replace('Bearer ', '');
    const { leadId } = req.query;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let query = db.collection('messageLogs')
      .where('userId', '==', userId);

    if (leadId) {
      query = query.where('leadId', '==', leadId);
    }

    const logsSnapshot = await query
      .orderBy('createdAt', 'desc')
      .get();

    const logs = logsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ logs });

  } catch (error) {
    logger.error('Error fetching lead logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create new lead (replaces installInboxBot)
 */
exports.createLead = onRequest(async (req, res) => {
  try {
    const userId = req.headers.authorization?.replace('Bearer ', '');
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const leadData = {
      ...req.body,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'New'
    };

    const docRef = await db.collection('leads').add(leadData);

    res.json({ 
      id: docRef.id, 
      message: 'Lead created successfully',
      lead: { id: docRef.id, ...leadData }
    });

  } catch (error) {
    logger.error('Error creating lead:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update lead score manually (replaces installLeadGenBot stub)
 */
exports.updateLeadScore = onRequest(async (req, res) => {
  try {
    const userId = req.headers.authorization?.replace('Bearer ', '');
    const { leadId, score, classification, reason } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user owns the lead
    const leadDoc = await db.collection('leads').doc(leadId).get();
    if (!leadDoc.exists || leadDoc.data().userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update lead
    await db.collection('leads').doc(leadId).update({
      score: score,
      leadStatus: classification,
      explainabilityCard: reason,
      lastScoredAt: new Date(),
      updatedAt: new Date()
    });

    // Log score history
    await db.collection('scoreHistory').add({
      leadId,
      score,
      classification,
      explainabilityCard: reason,
      timestamp: new Date(),
      userId,
      manualUpdate: true
    });

    res.json({ 
      message: 'Lead score updated successfully',
      leadId,
      score,
      classification
    });

  } catch (error) {
    logger.error('Error updating lead score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Handle opt-out requests
 */
exports.handleOptOut = onRequest(async (req, res) => {
  try {
    const { phone, email, reason } = req.body;

    // Find lead by phone or email
    let leadQuery = null;
    
    if (phone) {
      leadQuery = await db.collection('leads')
        .where('phone', '==', phone)
        .limit(1)
        .get();
    } else if (email) {
      leadQuery = await db.collection('leads')
        .where('email', '==', email)
        .limit(1)
        .get();
    }

    if (!leadQuery || leadQuery.empty) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const leadDoc = leadQuery.docs[0];
    const leadId = leadDoc.id;
    const userId = leadDoc.data().userId;

    // Log compliance event
    await db.collection('complianceEvents').add({
      leadId,
      userId,
      eventType: 'OptOut',
      details: { reason: reason || 'User requested opt-out' },
      timestamp: new Date()
    });

    // Update lead status
    await db.collection('leads').doc(leadId).update({
      status: 'OptedOut',
      optOutReason: reason || 'User requested opt-out',
      optOutDate: new Date(),
      updatedAt: new Date()
    });

    res.json({ 
      message: 'Successfully opted out',
      leadId
    });

  } catch (error) {
    logger.error('Error handling opt-out:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get user analytics dashboard data
 */
exports.getUserAnalytics = onRequest(async (req, res) => {
  try {
    const userId = req.headers.authorization?.replace('Bearer ', '');
    const { period = '30' } = req.query; // days
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get leads created in period
    const leadsSnapshot = await db.collection('leads')
      .where('userId', '==', userId)
      .where('createdAt', '>=', startDate)
      .get();

    // Get messages sent in period
    const messagesSnapshot = await db.collection('messageLogs')
      .where('userId', '==', userId)
      .where('direction', '==', 'Outbound')
      .where('createdAt', '>=', startDate)
      .get();

    // Get closed deals in period
    const closedDealsSnapshot = await db.collection('leads')
      .where('userId', '==', userId)
      .where('status', '==', 'Closed')
      .where('updatedAt', '>=', startDate)
      .get();

    const analytics = {
      period: `${period} days`,
      leadsCreated: leadsSnapshot.docs.length,
      messagesSent: messagesSnapshot.docs.length,
      dealsClosed: closedDealsSnapshot.docs.length,
      hoursSaved: Math.round((messagesSnapshot.docs.length * 5) / 60), // 5 min per message
      revenueImpact: closedDealsSnapshot.docs.length * 10000, // $10k per deal
      efficiency: leadsSnapshot.docs.length > 0 ? 
        (closedDealsSnapshot.docs.length / leadsSnapshot.docs.length * 100).toFixed(1) : 0
    };

    res.json({ analytics });

  } catch (error) {
    logger.error('Error fetching user analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
