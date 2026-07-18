export async function publishDomainEvent(tx, event) {
  const {
    organizationId = null,
    eventType,
    aggregateType,
    aggregateId,
    payload,
    availableAt,
  } = event;

  return tx.domainEvent.create({
    data: {
      organizationId,
      eventType,
      aggregateType,
      aggregateId,
      payload,
      availableAt,
    },
  });
}
