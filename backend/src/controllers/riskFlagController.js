import riskDetectionService from '../services/riskDetectionService.js';

export async function getRiskFlags(req, res) {
  try {
    const { status, riskLevel, riskCategory, page, limit, search } = req.query;
    const result = await riskDetectionService.getRiskFlags({
      status,
      riskLevel,
      riskCategory,
      page,
      limit,
      search,
    });
    return res.status(200).json({
      success: true,
      data: result.flags,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to fetch risk flags' },
    });
  }
}

export async function getRiskStats(req, res) {
  try {
    const stats = await riskDetectionService.getRiskStatistics();
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to fetch risk statistics' },
    });
  }
}

export async function getRiskFlagById(req, res) {
  try {
    const flag = await riskDetectionService.getRiskFlagById(req.params.id);
    if (!flag) {
      return res.status(404).json({
        success: false,
        error: { message: 'Risk flag not found' },
      });
    }
    return res.status(200).json({
      success: true,
      data: flag,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to fetch risk flag' },
    });
  }
}

export async function scanRiskFlags(req, res) {
  try {
    const limit = req.body?.limit ? parseInt(req.body.limit, 10) : 50;
    const result = await riskDetectionService.scanPlatformRiskFlags({ limit });
    return res.status(200).json({
      success: true,
      data: result,
      message: `Scanned ${result.scannedUsersCount} users, identified/updated ${result.flagsCreatedOrUpdated} flags`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to run risk scan' },
    });
  }
}

export async function updateRiskFlagStatus(req, res) {
  try {
    const { status, resolution } = req.body;
    const allowed = ['new', 'under_review', 'false_positive', 'confirmed_issue', 'resolved', 'dismissed'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { message: `Invalid status. Must be one of: ${allowed.join(', ')}` },
      });
    }

    const updated = await riskDetectionService.updateFlagStatus(
      req.params.id,
      { status, resolution },
      req.user
    );

    return res.status(200).json({
      success: true,
      data: updated,
      message: `Risk flag marked as ${status}`,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: { message: error.message || 'Failed to update flag status' },
    });
  }
}

export async function assignAdmin(req, res) {
  try {
    const { assignedAdminId } = req.body;
    if (!assignedAdminId) {
      return res.status(400).json({
        success: false,
        error: { message: 'assignedAdminId is required' },
      });
    }

    const updated = await riskDetectionService.assignAdminToFlag(
      req.params.id,
      assignedAdminId,
      req.user
    );

    return res.status(200).json({
      success: true,
      data: updated,
      message: 'Admin assigned successfully',
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: { message: error.message || 'Failed to assign admin' },
    });
  }
}

export async function addReviewNote(req, res) {
  try {
    const { note } = req.body;
    if (!note || typeof note !== 'string' || !note.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Review note text is required' },
      });
    }

    const updated = await riskDetectionService.addReviewNote(
      req.params.id,
      note.trim(),
      req.user
    );

    return res.status(201).json({
      success: true,
      data: updated,
      message: 'Review note added successfully',
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: { message: error.message || 'Failed to add review note' },
    });
  }
}

export default {
  getRiskFlags,
  getRiskStats,
  getRiskFlagById,
  scanRiskFlags,
  updateRiskFlagStatus,
  assignAdmin,
  addReviewNote,
};
