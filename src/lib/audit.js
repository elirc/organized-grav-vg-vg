export async function writeAuditLog(tx, entry) {
  const {
    organizationId = null,
    userId = null,
    action,
    resourceType,
    resourceId,
    changes = null,
    ipAddress = null,
    userAgent = null,
  } = entry;

  return tx.auditLog.create({
    data: {
      organizationId,
      userId,
      action,
      resourceType,
      resourceId,
      changes,
      ipAddress,
      userAgent,
    },
  });
}
