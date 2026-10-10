// Date range filter utility for Admin Analytics and Reports

export const parseDateRange = (rangeOrQuery = '30d', customStart = null, customEnd = null) => {
  const now = new Date();
  let range = '30d';
  let start = customStart;
  let end = customEnd;

  if (typeof rangeOrQuery === 'object' && rangeOrQuery !== null) {
    range = rangeOrQuery.dateRange || rangeOrQuery.range || '30d';
    start = rangeOrQuery.startDate || rangeOrQuery.start || customStart;
    end = rangeOrQuery.endDate || rangeOrQuery.end || customEnd;
  } else if (typeof rangeOrQuery === 'string') {
    range = rangeOrQuery;
  }

  let startDate = null;
  let endDate = new Date(now);

  if (range === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (range === '7d') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === '30d') {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (range === '90d') {
    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else if (range === 'year') {
    startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  } else if (range === 'custom' && start) {
    startDate = new Date(start);
    if (end) {
      endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
    }
  } else {
    // Default 30 days
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const queryFilter = {};
  if (startDate) {
    queryFilter.createdAt = { $gte: startDate, $lte: endDate };
  }

  return {
    startDate,
    endDate,
    queryFilter,
    dateRangeLabel: range,
  };
};

export default parseDateRange;
