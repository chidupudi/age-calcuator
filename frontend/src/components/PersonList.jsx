function PersonList({ persons, loading, onDelete, onRefresh }) {
  const calculateAge = (birthDate) => {
    const birth = new Date(birthDate);
    const today = new Date();

    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    return { years, months, days };
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      console.log('[List] Deleting person:', name);
      onDelete(id);
    }
  };

  return (
    <div className="list-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Persons List ({persons.length})</h2>
        <button
          onClick={() => {
            console.log('[List] Refreshing persons list');
            onRefresh();
          }}
          className="btn"
          style={{ width: 'auto', padding: '8px 16px', fontSize: '0.9rem' }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading persons...</div>
      ) : persons.length === 0 ? (
        <div className="empty-state">
          No persons added yet. Add someone to see their age!
        </div>
      ) : (
        <div className="person-list">
          {persons.map((person) => {
            const age = calculateAge(person.birthDate);
            return (
              <div key={person.id} className="person-card">
                <div className="person-header">
                  <div className="person-name">{person.name}</div>
                  <button
                    onClick={() => handleDelete(person.id, person.name)}
                    className="btn btn-danger"
                  >
                    Delete
                  </button>
                </div>
                <div className="person-details">
                  <div>Birth Date: {formatDate(person.birthDate)}</div>
                  <div className="age-highlight">
                    Age: {age.years} years, {age.months} months, {age.days} days
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#999', marginTop: '5px' }}>
                    Added: {new Date(person.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PersonList;
