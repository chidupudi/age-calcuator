import { useState, useEffect } from 'react';
import axios from 'axios';
import AddPersonForm from './components/AddPersonForm';
import PersonList from './components/PersonList';
import HealthStatus from './components/HealthStatus';

const API_URL = import.meta.env.VITE_API_URL || '';

function App() {
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backendHealth, setBackendHealth] = useState(null);

  useEffect(() => {
    fetchPersons();
    checkBackendHealth();

    // Check health every 30 seconds
    const healthInterval = setInterval(checkBackendHealth, 30000);

    return () => clearInterval(healthInterval);
  }, []);

  const checkBackendHealth = async () => {
    try {
      console.log('[Health Check] Checking backend health...');
      const response = await axios.get('/backend-health', { timeout: 5000 });
      console.log('[Health Check] Backend is healthy:', response.data);
      setBackendHealth(response.data);
    } catch (error) {
      console.error('[Health Check] Backend health check failed:', error.message);
      setBackendHealth({ status: 'DOWN', error: error.message });
    }
  };

  const fetchPersons = async () => {
    try {
      console.log('[Fetch] Fetching persons from backend...');
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/persons`);
      console.log('[Fetch] Received persons:', response.data.count);
      setPersons(response.data.persons);
    } catch (error) {
      console.error('[Fetch] Error fetching persons:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePersonAdded = (newPerson) => {
    console.log('[Add] Person added successfully:', newPerson);
    setPersons([...persons, newPerson]);
  };

  const handleDeletePerson = async (id) => {
    try {
      console.log('[Delete] Deleting person with ID:', id);
      await axios.delete(`${API_URL}/api/persons/${id}`);
      console.log('[Delete] Person deleted successfully');
      setPersons(persons.filter(p => p.id !== id));
    } catch (error) {
      console.error('[Delete] Error deleting person:', error.message);
      alert('Failed to delete person');
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Age Calculator</h1>
        <p>Calculate age from birth date - K8s Ready POC</p>
      </div>

      <HealthStatus health={backendHealth} />

      <div className="forms-container">
        <AddPersonForm onPersonAdded={handlePersonAdded} apiUrl={API_URL} />
        <PersonList
          persons={persons}
          loading={loading}
          onDelete={handleDeletePerson}
          onRefresh={fetchPersons}
        />
      </div>
    </div>
  );
}

export default App;
