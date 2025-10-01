const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');

/**
 * RealtorBuddy Intake Agent
 * Processes new leads from manual input, chatbot conversations, or imports
 * Standardizes them into the Lead Object with validation
 */
exports.intakeLead = onDocumentCreated('leads/{leadId}', async (event) => {
  const leadData = event.data.data();
  const leadId = event.params.leadId;
  
  logger.info(`Processing new lead: ${leadId}`, { leadData });

  try {
    // Validate mandatory fields
    const validationResult = validateLeadData(leadData);
    
    if (!validationResult.isValid) {
      logger.warn(`Lead validation failed for ${leadId}:`, validationResult.errors);
      
      // Update lead status to Incomplete
      await event.data.ref.update({
        status: 'Incomplete',
        validation_errors: validationResult.errors,
        updatedAt: new Date()
      });
      
      return;
    }

    // Normalize data
    const normalizedData = normalizeLeadData(leadData);

    // Check for duplicates
    const duplicateCheck = await checkForDuplicates(normalizedData.email, normalizedData.phone);
    
    if (duplicateCheck.isDuplicate) {
      logger.info(`Duplicate lead detected for ${leadId}, merging with ${duplicateCheck.existingLeadId}`);
      
      await event.data.ref.update({
        status: 'Duplicate',
        merged_with: duplicateCheck.existingLeadId,
        updatedAt: new Date()
      });
      
      return;
    }

    // Update lead with normalized data and set status to New
    await event.data.ref.update({
      ...normalizedData,
      status: 'New',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Log compliance event
    await logComplianceEvent(leadId, 'LeadIntake', {
      source: normalizedData.source,
      consent_given: normalizedData.consent_given || false
    });

    logger.info(`Lead ${leadId} successfully processed and ready for scoring`);

  } catch (error) {
    logger.error(`Error processing lead ${leadId}:`, error);
    
    await event.data.ref.update({
      status: 'Error',
      error_message: error.message,
      updatedAt: new Date()
    });
  }
});

/**
 * Validate mandatory lead fields
 */
function validateLeadData(leadData) {
  const errors = [];
  const requiredFields = ['firstName', 'lastName', 'email', 'budget', 'timeline'];
  
  for (const field of requiredFields) {
    if (!leadData[field] || leadData[field].toString().trim() === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Email validation
  if (leadData.email && !isValidEmail(leadData.email)) {
    errors.push('Invalid email format');
  }

  // Phone validation
  if (leadData.phone && !isValidPhone(leadData.phone)) {
    errors.push('Invalid phone format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Normalize lead data
 */
function normalizeLeadData(leadData) {
  return {
    firstName: leadData.firstName?.trim(),
    lastName: leadData.lastName?.trim(),
    email: leadData.email?.toLowerCase().trim(),
    phone: normalizePhone(leadData.phone),
    budget: parseFloat(leadData.budget) || 0,
    timeline: leadData.timeline?.trim(),
    motivation: leadData.motivation?.trim(),
    lenderStatus: leadData.lenderStatus || 'Unknown',
    source: leadData.source || 'Manual',
    consent_given: leadData.consent_given || false
  };
}

/**
 * Check for duplicate leads
 */
async function checkForDuplicates(email, phone) {
  const db = require('firebase-admin').firestore();
  
  // Check by email
  const emailQuery = await db.collection('leads')
    .where('email', '==', email)
    .limit(1)
    .get();
    
  if (!emailQuery.empty) {
    return {
      isDuplicate: true,
      existingLeadId: emailQuery.docs[0].id
    };
  }

  // Check by phone
  const phoneQuery = await db.collection('leads')
    .where('phone', '==', phone)
    .limit(1)
    .get();
    
  if (!phoneQuery.empty) {
    return {
      isDuplicate: true,
      existingLeadId: phoneQuery.docs[0].id
    };
  }

  return { isDuplicate: false };
}

/**
 * Log compliance event
 */
async function logComplianceEvent(leadId, eventType, details) {
  const db = require('firebase-admin').firestore();
  
  await db.collection('complianceEvents').add({
    leadId,
    eventType,
    details,
    timestamp: new Date(),
    userId: details.userId // This would come from the lead's owner
  });
}

/**
 * Utility functions
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/[\s\-\(\)]/g, '');
}
