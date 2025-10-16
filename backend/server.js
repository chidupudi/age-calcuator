const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('combined')); // Logging middleware

// In-memory storage
let persons = [];
let requestCount = 0;

// Utility function for logging
const log = (level, message, data = {}) => {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({
    timestamp,
    level,
    message,
    ...data
  }));
};

// Health check endpoints for K8s
app.get('/health', (req, res) => {
  log('INFO', 'Health check - liveness probe');
  res.status(200).json({
    status: 'UP',
    service: 'age-calculator-backend',
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', (req, res) => {
  log('INFO', 'Readiness check');
  res.status(200).json({
    status: 'READY',
    service: 'age-calculator-backend',
    personsCount: persons.length,
    timestamp: new Date().toISOString()
  });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  log('INFO', 'Metrics requested');
  res.status(200).json({
    totalPersons: persons.length,
    totalRequests: requestCount,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// Request counter middleware
app.use((req, res, next) => {
  requestCount++;
  next();
});

// API Routes
// Add a new person
app.post('/api/persons', (req, res) => {
  try {
    const { name, birthDate } = req.body;

    if (!name || !birthDate) {
      log('WARN', 'Invalid request - missing fields', { name, birthDate });
      return res.status(400).json({
        error: 'Name and birthDate are required'
      });
    }

    const person = {
      id: Date.now().toString(),
      name,
      birthDate,
      createdAt: new Date().toISOString()
    };

    persons.push(person);
    log('INFO', 'Person added successfully', { id: person.id, name: person.name });

    res.status(201).json({
      message: 'Person added successfully',
      person
    });
  } catch (error) {
    log('ERROR', 'Error adding person', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all persons
app.get('/api/persons', (req, res) => {
  try {
    log('INFO', 'Fetching all persons', { count: persons.length });
    res.status(200).json({
      count: persons.length,
      persons
    });
  } catch (error) {
    log('ERROR', 'Error fetching persons', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get person by ID
app.get('/api/persons/:id', (req, res) => {
  try {
    const { id } = req.params;
    const person = persons.find(p => p.id === id);

    if (!person) {
      log('WARN', 'Person not found', { id });
      return res.status(404).json({ error: 'Person not found' });
    }

    log('INFO', 'Person fetched', { id, name: person.name });
    res.status(200).json({ person });
  } catch (error) {
    log('ERROR', 'Error fetching person', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete person by ID
app.delete('/api/persons/:id', (req, res) => {
  try {
    const { id } = req.params;
    const index = persons.findIndex(p => p.id === id);

    if (index === -1) {
      log('WARN', 'Person not found for deletion', { id });
      return res.status(404).json({ error: 'Person not found' });
    }

    const deleted = persons.splice(index, 1);
    log('INFO', 'Person deleted', { id, name: deleted[0].name });

    res.status(200).json({
      message: 'Person deleted successfully',
      person: deleted[0]
    });
  } catch (error) {
    log('ERROR', 'Error deleting person', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear all persons (for testing)
app.delete('/api/persons', (req, res) => {
  try {
    const count = persons.length;
    persons = [];
    log('INFO', 'All persons cleared', { count });
    res.status(200).json({
      message: `Cleared ${count} persons`
    });
  } catch (error) {
    log('ERROR', 'Error clearing persons', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 404 handler
app.use((req, res) => {
  log('WARN', '404 Not Found', { path: req.path, method: req.method });
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  log('ERROR', 'Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('INFO', 'SIGTERM received, shutting down gracefully');
  server.close(() => {
    log('INFO', 'Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  log('INFO', 'SIGINT received, shutting down gracefully');
  server.close(() => {
    log('INFO', 'Server closed');
    process.exit(0);
  });
});

const server = app.listen(PORT, () => {
  log('INFO', `Server started on port ${PORT}`, {
    port: PORT,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
});
