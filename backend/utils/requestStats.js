const STATUSES = {
  Pending: 'pendingRequests',
  'In Progress': 'inProgressRequests',
  Approved: 'approvedRequests',
  Resolved: 'resolvedRequests',
  Rejected: 'rejectedRequests',
};

const getRequestStatusCounts = async (models, filter) => {
  const statusGroups = await Promise.all(
    models.map((model) => model.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]))
  );
  const counts = Object.fromEntries(Object.values(STATUSES).map((field) => [field, 0]));

  statusGroups.flat().forEach(({ _id, count }) => {
    const field = STATUSES[_id];
    if (field) {
      counts[field] += count;
    }
  });

  counts.totalRequests = Object.values(counts).reduce((total, count) => total + count, 0);
  return counts;
};

module.exports = getRequestStatusCounts;
