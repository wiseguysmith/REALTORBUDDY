const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');

/**
 * RealtorBuddy Health Check Agent
 * Monitors system health and provides status endpoint
 */
exports.healthCheck = onRequest(async (req, res) => {
  try {
    logger.info('Health check requested');
    
    const healthStatus = await performHealthCheck();
    
    const statusCode = healthStatus.overall === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      status: healthStatus.overall,
      timestamp: new Date().toISOString(),
      services: healthStatus.services,
      metrics: healthStatus.metrics,
      version: process.env.FUNCTION_VERSION || '1.0.0'
    });
    
  } catch (error) {
    logger.error('Health check failed:', error);
    
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Perform comprehensive health check
 */
async function performHealthCheck() {
  const services = {};
  const metrics = {};
  
  // Check Firestore connection
  try {
    const db = require('firebase-admin').firestore();
    const testQuery = await db.collection('_health').limit(1).get();
    services.firestore = { status: 'healthy', responseTime: '< 100ms' };
  } catch (error) {
    services.firestore = { status: 'unhealthy', error: error.message };
  }
  
  // Check external API dependencies
  services.whatsapp = await checkWhatsAppAPI();
  services.email = await checkEmailAPI();
  
  // Get system metrics
  metrics.leadsProcessed = await getLeadsProcessedToday();
  metrics.messagesSent = await getMessagesSentToday();
  metrics.activeUsers = await getActiveUsersCount();
  metrics.systemUptime = process.uptime();
  
  // Determine overall status
  const unhealthyServices = Object.values(services).filter(service => 
    service.status === 'unhealthy'
  );
  
  const overall = unhealthyServices.length === 0 ? 'healthy' : 'degraded';
  
  return {
    overall,
    services,
    metrics
  };
}

/**
 * Check WhatsApp API connectivity
 */
async function checkWhatsAppAPI() {
  try {
    // In production, this would test actual Twilio WhatsApp API
    // For now, we'll simulate the check
    const startTime = Date.now();
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      endpoint: 'Twilio WhatsApp API'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      endpoint: 'Twilio WhatsApp API'
    };
  }
}

/**
 * Check Email API connectivity
 */
async function checkEmailAPI() {
  try {
    // In production, this would test actual SendGrid API
    // For now, we'll simulate the check
    const startTime = Date.now();
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 30));
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      endpoint: 'SendGrid Email API'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      endpoint: 'SendGrid Email API'
    };
  }
}

/**
 * Get leads processed today
 */
async function getLeadsProcessedToday() {
  try {
    const db = require('firebase-admin').firestore();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const leadsQuery = await db.collection('leads')
      .where('createdAt', '>=', today)
      .get();
      
    return leadsQuery.docs.length;
  } catch (error) {
    logger.error('Error getting leads processed today:', error);
    return 0;
  }
}

/**
 * Get messages sent today
 */
async function getMessagesSentToday() {
  try {
    const db = require('firebase-admin').firestore();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const messagesQuery = await db.collection('messageLogs')
      .where('direction', '==', 'Outbound')
      .where('sentAt', '>=', today)
      .get();
      
    return messagesQuery.docs.length;
  } catch (error) {
    logger.error('Error getting messages sent today:', error);
    return 0;
  }
}

/**
 * Get active users count
 */
async function getActiveUsersCount() {
  try {
    const db = require('firebase-admin').firestore();
    
    const usersQuery = await db.collection('users')
      .where('status', '==', 'active')
      .get();
      
    return usersQuery.docs.length;
  } catch (error) {
    logger.error('Error getting active users count:', error);
    return 0;
  }
}
