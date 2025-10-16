import { useState } from 'react';
import axios from 'axios';

function AddPersonForm({ onPersonAdded, apiUrl }) {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !birthDate) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      console.warn('[Form] Validation failed: Empty fields');
      return;
    }

    try {
      console.log('[Form] Submitting new person:', { name, birthDate });
      setLoading(true);
      setMessage({ type: '', text: '' });

      const response = await axios.post(`${apiUrl}/api/persons`, {
        name: name.trim(),
        birthDate
      });

      console.log('[Form] Person added successfully:', response.data);
      setMessage({ type: 'success', text: 'Person added successfully!' });
      onPersonAdded(response.data.person);

      // Clear form
      setName('');
      setBirthDate('');

      // Clear success message after 3 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('[Form] Error adding person:', error.message);
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to add person'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-card">
      <h2>Add Person</h2>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="birthDate">Birth Date</label>
          <input
            type="date"
            id="birthDate"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            disabled={loading}
          />
        </div>

        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Adding...' : 'Add Person'}
        </button>
      </form>
    </div>
  );
}

export default AddPersonForm;
