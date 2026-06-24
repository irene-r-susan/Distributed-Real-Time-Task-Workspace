const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');       // For password hashing
const jwt = require('jsonwebtoken'); 
const cors = require('cors');   // For issuing session tokens
const app = express();
const PORT = 3000;
const JWT_SECRET = 'your_super_secret_safe_key_123';

const http=require('http');
const {Server}=require('socket.io');
const {createClient} =require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

const server=http.createServer(app);
const io=new Server(server,{
    cors:{ origin : '*' }
});

if(process.env.DOCKER_ENV === 'true'){
    const pubClient=createClient({url: process.env.REDIS_URL});
    const subClient=pubClient.duplicate();
    Promise.all([pubClient.connect(),subClient.connect()]).then(()=>{
        io.adapter(createAdapter(pubClient,subClient));
        console.log("[Redis Highway] Socket.io instances linked successfully!");
    });
}
io.on('connection',(socket)=>{
    console.log(`User connected via WebSocket: ${socket.id} on Container: ${process.env.HOSTNAME || 'Local'}`);
});

app.use(express.json());

app.use(cors({
    origin: 'http://localhost:5173', 
    credentials: true
}));

// 1. Configure Connection for Local Native PostgreSQL
const pool = new Pool({
    user: process.env.POSTGRES_USER,          // Your default local Postgres user
    host: process.env.DOCKER_ENV === 'true' ? 'host.docker.internal' : 'localhost',         // Tells the code to look inside your physical laptop
    database: process.env.POSTGRES_DB,     // Your database name
    password: process.env.POSTGRES_PASSWORD, // ⚠️ Put your real pgAdmin login password here
    port: 5432,                // Standard local port
});



// --- AUTHENTICATION MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    // 1. Grab the token from the HTTP Authorization header
    console.log(`🛡️ [Middleware Shield] Request caught by Container: ${process.env.HOSTNAME || 'Local'}`);
    const authHeader = req.headers['authorization'];
    // Headers are typically formatted as: "Bearer eyJhbGciOi..."
    const token = authHeader && authHeader.split(' ')[1];

    // If there is no token at all, reject them immediately
    if (!token) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    try {
        // 2. Cryptographically verify the token signature using our secret key
        const verified = jwt.verify(token, JWT_SECRET);
        
        // 3. Attach the verified user details directly to the 'req' object
        req.user = verified; 
        
        // Move to the next function (the actual route handler)
        next(); 
    } catch (err) {
        // If the token was tampered with or expired, reject it
        return res.status(403).json({ error: "Invalid or expired token." });
    }
};



// Test the connection immediately on startup
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client configuration:', err.stack);
    }
    console.log('Successfully connected directly to local PostgreSQL engine!');
});

// --- API ROUTES ---

app.get('/', (req, res) => {
    res.send('Welcome to the Todo API! Use /todos to fetch or save tasks.');
});




// 1. CREATE: Add a task linked to this specific user
app.post('/todo', authenticateToken, async (req, res) => {
    const { task } = req.body;
    
    if (!task) {
        return res.status(400).json({ error: "Task content is required." });
    }

    try {
        // req.user.userId comes straight from our middleware passport verification!
        const queryText = 'INSERT INTO todo (task, user_id) VALUES ($1, $2) RETURNING *;';
        const result = await pool.query(queryText, [task, req.user.userId]);
        io.emit('task_created', { message: "A new task was created live!", task: result.rows[0] });
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create task." });
    }
});

// 2. READ: Get only the tasks owned by this specific user
app.get('/todo', authenticateToken, async (req, res) => {
    try {
        // Strict data isolation: WHERE user_id = $1
        const result = await pool.query('SELECT * FROM todo WHERE user_id = $1;', [req.user.userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch tasks." });
    }
});







// Add authenticateToken right here! 👇
app.get('/todo/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    if(isNaN(id)){
        return res.status(400).json({ error: "Invalid ID format" });
    }
    try {
        // Strict data isolation check: ensure id matches AND user_id matches!
        const result = await pool.query('SELECT * FROM todo WHERE id = $1 AND user_id = $2;', [id, req.user.userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Task not found" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// --- AUTHENTICATION ROUTES ---

// 1. SIGNUP: Register a new user
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }

    try {
        // Hash the password cleanly (10 salt rounds is the industry standard balance of speed/security)
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Save to PostgreSQL disk
        const queryText = 'INSERT INTO users(username, password_hash) VALUES($1, $2) RETURNING id, username;';
        const result = await pool.query(queryText, [username, hashedPassword]);

        res.status(201).json({ 
            message: "User registered successfully!", 
            user: result.rows[0] 
        });
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // PostgreSQL unique_violation error code
            return res.status(400).json({ error: "Username already taken." });
        }
        res.status(500).json({ error: "Registration failed." });
    }
});

// 2. LOGIN: Verify user and return a JWT passport token
app.post('/login', async (req, res) => {
    console.log(`>>> Request handled by Container Instance ID: ${process.env.HOSTNAME || 'Local'}`);
    const { username, password } = req.body;

    try {
        // Look up the user by their unique username
        const userResult = await pool.query('SELECT * FROM users WHERE username = $1;', [username]);
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: "Invalid username or password." });
        }

        const user = userResult.rows[0];

        // Compare incoming password with the secure hash stored on disk
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid username or password." });
        }

        // Issue a JWT signed passport containing the user's ID (expires in 1 hour)
        const token = jwt.sign(
            { userId: user.id, username: user.username }, 
            JWT_SECRET, 
            { expiresIn: '1h' }
        );

        res.json({ message: "Login successful!", token: token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Login failed." });
    }
});

// Change this from app.listen to server.listen so Socket.io can use it! 👇
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});