const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_safe_key_123';

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

if (process.env.DOCKER_ENV === 'true') {
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();
  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('[Redis Highway] Socket.io instances linked successfully!');
  });
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id} on ${process.env.HOSTNAME || 'Local'}`);

  socket.on('join_list', (listId) => {
    socket.join(`list:${listId}`);
    console.log(`Socket ${socket.id} joined list:${listId}`);
  });

  socket.on('leave_list', (listId) => {
    socket.leave(`list:${listId}`);
  });
});

app.use(express.json());
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.DOCKER_ENV === 'true' ? 'postgres' : 'localhost',
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

pool.connect((err, client, release) => {
  if (err) return console.error('Error connecting to PostgreSQL:', err.stack);
  console.log('Connected to PostgreSQL!');
  release();
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

app.get('/', (req, res) => {
  res.send('Welcome to the Task Manager API!');
});

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const result = await pool.query(
      'INSERT INTO users(username, password_hash) VALUES($1, $2) RETURNING id, username',
      [username, hashedPassword]
    );
    res.status(201).json({ message: 'User registered successfully!', user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Username already taken.' });
    console.error(err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userResult.rows.length === 0) return res.status(401).json({ error: 'Invalid username or password.' });
    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid username or password.' });
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: 'Login successful!', token, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

app.get('/users/search', authenticateToken, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  try {
    const result = await pool.query(
      'SELECT id, username FROM users WHERE username ILIKE $1 AND id != $2 LIMIT 10',
      [`%${q}%`, req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed.' });
  }
});

app.post('/lists', authenticateToken, async (req, res) => {
  const { name, type } = req.body;
  if (!name) return res.status(400).json({ error: 'List name is required.' });
  const listType = type === 'shared' ? 'shared' : 'private';
  try {
    const result = await pool.query(
      'INSERT INTO task_lists (name, owner_id, type) VALUES ($1, $2, $3) RETURNING *',
      [name, req.user.userId, listType]
    );
    const list = result.rows[0];
    if (listType === 'shared') {
      await pool.query(
        'INSERT INTO task_list_members (list_id, user_id, invited_by) VALUES ($1, $2, $2)',
        [list.id, req.user.userId]
      );
    }
    res.status(201).json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create list.' });
  }
});

app.get('/lists', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT tl.*, u.username as owner_name
      FROM task_lists tl
      JOIN users u ON tl.owner_id = u.id
      LEFT JOIN task_list_members tlm ON tl.id = tlm.list_id
      WHERE tl.owner_id = $1 OR tlm.user_id = $1
      ORDER BY tl.created_at DESC
    `, [req.user.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch lists.' });
  }
});

app.get('/lists/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const memberCheck = await pool.query(`
      SELECT 1 FROM task_lists tl
      LEFT JOIN task_list_members tlm ON tl.id = tlm.list_id
      WHERE tl.id = $1 AND (tl.owner_id = $2 OR tlm.user_id = $2)
    `, [id, req.user.userId]);
    if (memberCheck.rows.length === 0) return res.status(403).json({ error: 'Access denied.' });

    const listResult = await pool.query(
      'SELECT tl.*, u.username as owner_name FROM task_lists tl JOIN users u ON tl.owner_id = u.id WHERE tl.id = $1',
      [id]
    );
    if (listResult.rows.length === 0) return res.status(404).json({ error: 'List not found.' });

    const membersResult = await pool.query(`
      SELECT u.id, u.username FROM task_list_members tlm
      JOIN users u ON tlm.user_id = u.id
      WHERE tlm.list_id = $1
    `, [id]);

    const tasksResult = await pool.query(
      'SELECT t.*, u.username as created_by_name, uc.username as completed_by_name FROM tasks t LEFT JOIN users u ON t.created_by = u.id LEFT JOIN users uc ON t.completed_by = uc.id WHERE t.list_id = $1 ORDER BY t.created_at DESC',
      [id]
    );

    res.json({
      ...listResult.rows[0],
      members: membersResult.rows,
      tasks: tasksResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch list.' });
  }
});

app.post('/lists/:id/share', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { username } = req.body;
  try {
    const listCheck = await pool.query('SELECT * FROM task_lists WHERE id = $1 AND owner_id = $2', [id, req.user.userId]);
    if (listCheck.rows.length === 0) return res.status(403).json({ error: 'Only the owner can share this list.' });

    const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found.' });

    const targetUser = userResult.rows[0];
    await pool.query(
      'INSERT INTO task_list_members (list_id, user_id, invited_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [id, targetUser.id, req.user.userId]
    );

    const userInfo = await pool.query('SELECT id, username FROM users WHERE id = $1', [targetUser.id]);
    const listInfo = await pool.query('SELECT id, name FROM task_lists WHERE id = $1', [id]);
    const list = listInfo.rows[0];

    io.to(`list:${id}`).emit('list:shared', {
      message: `Shared with ${username}`,
      member: userInfo.rows[0],
      listId: Number(id)
    });

    res.json({ message: 'List shared successfully!', member: userInfo.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to share list.' });
  }
});

app.delete('/lists/:id/members/:userId', authenticateToken, async (req, res) => {
  const { id, userId } = req.params;
  try {
    const listCheck = await pool.query('SELECT owner_id FROM task_lists WHERE id = $1', [id]);
    if (listCheck.rows.length === 0) return res.status(404).json({ error: 'List not found.' });
    if (listCheck.rows[0].owner_id !== req.user.userId) return res.status(403).json({ error: 'Only the owner can remove members.' });
    if (Number(userId) === req.user.userId) return res.status(400).json({ error: 'Owner cannot be removed.' });

    await pool.query('DELETE FROM task_list_members WHERE list_id = $1 AND user_id = $2', [id, userId]);
    io.to(`list:${id}`).emit('list:member_removed', { userId: Number(userId), listId: Number(id) });
    res.json({ message: 'Member removed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove member.' });
  }
});

app.delete('/lists/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const listCheck = await pool.query('SELECT owner_id FROM task_lists WHERE id = $1', [id]);
    if (listCheck.rows.length === 0) return res.status(404).json({ error: 'List not found.' });
    if (listCheck.rows[0].owner_id !== req.user.userId) return res.status(403).json({ error: 'Only the owner can delete the list.' });
    await pool.query('DELETE FROM task_lists WHERE id = $1', [id]);
    io.emit('list:deleted', { listId: Number(id) });
    res.json({ message: 'List deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete list.' });
  }
});

app.post('/lists/:id/tasks', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { task } = req.body;
  if (!task) return res.status(400).json({ error: 'Task content is required.' });
  try {
    const memberCheck = await pool.query(`
      SELECT 1 FROM task_lists tl
      LEFT JOIN task_list_members tlm ON tl.id = tlm.list_id
      WHERE tl.id = $1 AND (tl.owner_id = $2 OR tlm.user_id = $2)
    `, [id, req.user.userId]);
    if (memberCheck.rows.length === 0) return res.status(403).json({ error: 'Access denied.' });

    const result = await pool.query(
      'INSERT INTO tasks (list_id, task, created_by) VALUES ($1, $2, $3) RETURNING *',
      [id, task, req.user.userId]
    );
    const newTask = result.rows[0];
    newTask.created_by_name = req.user.username;

    io.to(`list:${id}`).emit('task:created', { task: newTask, listId: Number(id) });
    res.status(201).json(newTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task.' });
  }
});

app.put('/tasks/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { task, completed } = req.body;
  try {
    const taskResult = await pool.query(
      'SELECT t.*, tl.owner_id FROM tasks t JOIN task_lists tl ON t.list_id = tl.id WHERE t.id = $1',
      [id]
    );
    if (taskResult.rows.length === 0) return res.status(404).json({ error: 'Task not found.' });

    const t = taskResult.rows[0];
    const memberCheck = await pool.query(
      'SELECT 1 FROM task_list_members WHERE list_id = $1 AND user_id = $2',
      [t.list_id, req.user.userId]
    );
    if (t.owner_id !== req.user.userId && memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    let query = 'UPDATE tasks SET updated_at = NOW()';
    const params = [];
    let paramIndex = 1;

    if (task !== undefined) {
      query += `, task = $${paramIndex++}`;
      params.push(task);
    }
    if (completed !== undefined) {
      query += `, completed = $${paramIndex++}, completed_by = $${paramIndex++}`;
      params.push(completed);
      params.push(completed ? req.user.userId : null);
    }
    query += ` WHERE id = $${paramIndex++} RETURNING *`;
    params.push(id);

    const result = await pool.query(query, params);
    const updated = result.rows[0];
    updated.completed_by_name = completed ? req.user.username : null;

    io.to(`list:${t.list_id}`).emit('task:updated', { task: updated, listId: t.list_id });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

app.delete('/tasks/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const taskResult = await pool.query(
      'SELECT t.*, tl.owner_id FROM tasks t JOIN task_lists tl ON t.list_id = tl.id WHERE t.id = $1',
      [id]
    );
    if (taskResult.rows.length === 0) return res.status(404).json({ error: 'Task not found.' });

    const t = taskResult.rows[0];
    const memberCheck = await pool.query(
      'SELECT 1 FROM task_list_members WHERE list_id = $1 AND user_id = $2',
      [t.list_id, req.user.userId]
    );
    if (t.owner_id !== req.user.userId && memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    io.to(`list:${t.list_id}`).emit('task:deleted', { taskId: Number(id), listId: t.list_id });
    res.json({ message: 'Task deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
