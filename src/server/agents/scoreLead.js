const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');

/**
 * RealtorBuddy Scoring Agent
 * Prioritizes leads using a rules-based weighted model
 * Shows "explainability cards" so realtors trust the score
 */
exports.scoreLead = onDocumentUpdated('leads/{leadId}', async (event) => {
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();
  const leadId = event.params.leadId;
  
  // Only score if relevant fields changed
  const relevantFields = ['budget', 'timeline', 'motivation', 'lenderStatus', 'lastContactDate'];
  const hasRelevantChanges = relevantFields.some(field => 
    beforeData[field] !== afterData[field]
  );
  
  if (!hasRelevantChanges) {
    return;
  }

  logger.info(`Scoring lead: ${leadId}`, { beforeData, afterData });

  try {
    // Calculate new score
    const scoringResult = calculateLeadScore(afterData);
    
    // Update lead with new score and classification
    await event.data.after.ref.update({
      score: scoringResult.score,
      leadStatus: scoringResult.classification,
      explainabilityCard: scoringResult.explainabilityCard,
      lastScoredAt: new Date(),
      updatedAt: new Date()
    });

    // Log score history for audit trail
    await logScoreHistory(leadId, scoringResult);

    logger.info(`Lead ${leadId} scored: ${scoringResult.score} (${scoringResult.classification})`);

  } catch (error) {
    logger.error(`Error scoring lead ${leadId}:`, error);
    
    await event.data.after.ref.update({
      scoreError: error.message,
      updatedAt: new Date()
    });
  }
});

/**
 * Calculate lead score using rules-based weighted model
 */
function calculateLeadScore(leadData) {
  const weights = {
    budget: 30,        // 30% of score
    timeline: 25,      // 25% of score  
    lenderStatus: 20,  // 20% of score
    engagement: 15,    // 15% of score
    motivation: 10     // 10% of score
  };

  const scores = {
    budget: calculateBudgetScore(leadData.budget),
    timeline: calculateTimelineScore(leadData.timeline),
    lenderStatus: calculateLenderScore(leadData.lenderStatus),
    engagement: calculateEngagementScore(leadData),
    motivation: calculateMotivationScore(leadData.motivation)
  };

  // Calculate weighted total score
  const totalScore = Math.round(
    (scores.budget * weights.budget) +
    (scores.timeline * weights.timeline) +
    (scores.lenderStatus * weights.lenderStatus) +
    (scores.engagement * weights.engagement) +
    (scores.motivation * weights.motivation)
  );

  // Determine classification
  const classification = determineClassification(totalScore, scores);
  
  // Generate explainability card
  const explainabilityCard = generateExplainabilityCard(totalScore, scores, classification, leadData);

  return {
    score: totalScore,
    classification,
    explainabilityCard,
    scoreBreakdown: scores
  };
}

/**
 * Calculate budget score (0-100)
 */
function calculateBudgetScore(budget) {
  if (!budget || budget === 0) return 0;
  
  if (budget >= 500000) return 100;      // $500k+ = Hot
  if (budget >= 300000) return 80;       // $300k+ = Warm  
  if (budget >= 200000) return 60;       // $200k+ = Warm
  if (budget >= 100000) return 40;       // $100k+ = Nurture
  return 20;                             // Under $100k = Nurture
}

/**
 * Calculate timeline score (0-100)
 */
function calculateTimelineScore(timeline) {
  if (!timeline) return 30; // Unknown timeline = moderate score
  
  const timelineLower = timeline.toLowerCase();
  
  if (timelineLower.includes('immediate') || timelineLower.includes('asap')) return 100;
  if (timelineLower.includes('30 days') || timelineLower.includes('1 month')) return 90;
  if (timelineLower.includes('60 days') || timelineLower.includes('2 month')) return 80;
  if (timelineLower.includes('90 days') || timelineLower.includes('3 month')) return 70;
  if (timelineLower.includes('6 month')) return 50;
  if (timelineLower.includes('year') || timelineLower.includes('12 month')) return 30;
  
  return 40; // Default for unclear timelines
}

/**
 * Calculate lender status score (0-100)
 */
function calculateLenderScore(lenderStatus) {
  switch (lenderStatus) {
    case 'Pre-Approved': return 100;
    case 'Pre-Qualified': return 80;
    case 'Application Submitted': return 60;
    case 'Not Applied': return 30;
    case 'Unknown':
    default: return 40;
  }
}

/**
 * Calculate engagement score (0-100)
 */
function calculateEngagementScore(leadData) {
  let score = 50; // Base score
  
  // Recent contact bonus
  if (leadData.lastContactDate) {
    const daysSinceContact = (new Date() - new Date(leadData.lastContactDate)) / (1000 * 60 * 60 * 24);
    if (daysSinceContact <= 1) score += 30;
    else if (daysSinceContact <= 7) score += 20;
    else if (daysSinceContact <= 30) score += 10;
  }
  
  // Response rate bonus (if we track this)
  if (leadData.responseRate && leadData.responseRate > 0.5) {
    score += 20;
  }
  
  return Math.min(100, score);
}

/**
 * Calculate motivation score (0-100)
 */
function calculateMotivationScore(motivation) {
  if (!motivation) return 30;
  
  const motivationLower = motivation.toLowerCase();
  let score = 50; // Base score
  
  // High motivation indicators
  const highMotivationKeywords = ['relocating', 'job transfer', 'family', 'urgent', 'quick'];
  const highMotivationCount = highMotivationKeywords.filter(keyword => 
    motivationLower.includes(keyword)
  ).length;
  score += highMotivationCount * 10;
  
  // Low motivation indicators  
  const lowMotivationKeywords = ['just looking', 'browsing', 'not sure', 'maybe'];
  const lowMotivationCount = lowMotivationKeywords.filter(keyword => 
    motivationLower.includes(keyword)
  ).length;
  score -= lowMotivationCount * 15;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Determine lead classification
 */
function determineClassification(totalScore, scoreBreakdown) {
  // Hot: High score + short timeline + pre-approved
  if (totalScore >= 80 && scoreBreakdown.timeline >= 80 && scoreBreakdown.lenderStatus >= 80) {
    return 'Hot';
  }
  
  // Warm: Good score or specific indicators
  if (totalScore >= 60 || scoreBreakdown.budget >= 80 || scoreBreakdown.timeline >= 70) {
    return 'Warm';
  }
  
  // Nurture: Everything else
  return 'Nurture';
}

/**
 * Generate explainability card
 */
function generateExplainabilityCard(totalScore, scores, classification, leadData) {
  const reasons = [];
  
  // Budget reasoning
  if (scores.budget >= 80) {
    reasons.push(`High budget ($${leadData.budget?.toLocaleString()})`);
  } else if (scores.budget <= 40) {
    reasons.push(`Lower budget ($${leadData.budget?.toLocaleString()})`);
  }
  
  // Timeline reasoning
  if (scores.timeline >= 80) {
    reasons.push(`Short timeline (${leadData.timeline})`);
  } else if (scores.timeline <= 40) {
    reasons.push(`Long timeline (${leadData.timeline})`);
  }
  
  // Lender status reasoning
  if (scores.lenderStatus >= 80) {
    reasons.push(`Pre-approved lender status`);
  } else if (scores.lenderStatus <= 40) {
    reasons.push(`Unclear lender status`);
  }
  
  // Engagement reasoning
  if (leadData.lastContactDate) {
    const daysSince = (new Date() - new Date(leadData.lastContactDate)) / (1000 * 60 * 60 * 24);
    if (daysSince <= 1) {
      reasons.push(`Recent contact (${Math.round(daysSince)} days ago)`);
    }
  }
  
  const reasonText = reasons.length > 0 ? reasons.join(', ') : 'Standard scoring criteria';
  
  return `${classification} because: ${reasonText}. Score: ${totalScore}/100`;
}

/**
 * Log score history for audit trail
 */
async function logScoreHistory(leadId, scoringResult) {
  const db = require('firebase-admin').firestore();
  
  await db.collection('scoreHistory').add({
    leadId,
    score: scoringResult.score,
    classification: scoringResult.classification,
    scoreBreakdown: scoringResult.scoreBreakdown,
    explainabilityCard: scoringResult.explainabilityCard,
    timestamp: new Date()
  });
}
