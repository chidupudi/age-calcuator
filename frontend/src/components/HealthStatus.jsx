function HealthStatus({ health }) {
  if (!health) {
    return (
      <div className="health-status" style={{ marginBottom: '20px' }}>
        <h2>System Health</h2>
        <div className="loading">Checking backend health...</div>
      </div>
    );
  }

  const isHealthy = health.status === 'UP' || health.status === 'READY';

  return (
    <div className="health-status" style={{ marginBottom: '20px' }}>
      <h2>System Health</h2>
      <div className="health-grid">
        <div className={`health-item ${!isHealthy ? 'error' : ''}`}>
          <h3>Backend Status</h3>
          <p>{health.status}</p>
        </div>
        <div className="health-item">
          <h3>Service</h3>
          <p>{health.service || 'Frontend'}</p>
        </div>
        <div className="health-item">
          <h3>Last Check</h3>
          <p>{new Date(health.timestamp || Date.now()).toLocaleTimeString()}</p>
        </div>
        {health.personsCount !== undefined && (
          <div className="health-item">
            <h3>Persons Count</h3>
            <p>{health.personsCount}</p>
          </div>
        )}
        {health.error && (
          <div className="health-item error" style={{ gridColumn: '1 / -1' }}>
            <h3>Error</h3>
            <p>{health.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default HealthStatus;
