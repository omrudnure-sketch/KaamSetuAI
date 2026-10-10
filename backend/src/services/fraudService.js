import { User, JobApplication, Dispute, Complaint } from '../models/index.js';

export const analyzeUserFraudRisk = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  let riskScore = 0;
  const flags = [];

  // Check 1: Duplicate or similar contact details
  const phoneDuplicates = await User.countDocuments({ phone: user.phone, _id: { $ne: user._id } });
  if (phoneDuplicates > 0) {
    riskScore += 40;
    flags.push('DUPLICATE_PHONE_DETECTED');
  }

  // Check 2: High Dispute Ratio
  const disputesAgainst = await Dispute.countDocuments({ againstUserId: user._id });
  if (disputesAgainst >= 3) {
    riskScore += 35;
    flags.push(`MULTIPLE_DISPUTES_RAISED_AGAINST (${disputesAgainst})`);
  }

  // Check 3: Rapid Application Spam (for workers)
  if (user.role === 'worker') {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentApps = await JobApplication.countDocuments({
      workerId: user._id,
      createdAt: { $gte: twentyFourHoursAgo },
    });

    if (recentApps > 15) {
      riskScore += 25;
      flags.push(`HIGH_APPLICATION_VELOCITY (${recentApps}/24h)`);
    }
  }

  // Check 4: Complaints filed against user
  const complaintsAgainst = await Complaint.countDocuments({ targetUserId: user._id });
  if (complaintsAgainst >= 2) {
    riskScore += 30;
    flags.push(`MULTIPLE_COMPLAINTS_FILED (${complaintsAgainst})`);
  }

  let riskLevel = 'LOW';
  if (riskScore >= 60) riskLevel = 'HIGH';
  else if (riskScore >= 30) riskLevel = 'MEDIUM';

  return {
    userId: user._id,
    userName: user.name,
    role: user.role,
    riskScore: Math.min(riskScore, 100),
    riskLevel,
    flags,
    analyzedAt: new Date(),
  };
};

export const getFlaggedFraudUsers = async () => {
  const users = await User.find({ status: { $ne: 'blocked' } }).limit(50);
  const assessments = await Promise.all(users.map((u) => analyzeUserFraudRisk(u._id)));
  return assessments.filter((a) => a.riskScore > 0).sort((a, b) => b.riskScore - a.riskScore);
};
