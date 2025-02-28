const express = require('express');
const session = require('express-session');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const MySQLStore = require('express-mysql-session')(session);

const app = express();
const port = 5600;

const secretKey = crypto.randomBytes(32).toString('hex');
console.log(secretKey);  // This will give you a random 256-bit key

// Middleware setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MySQL Database Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'voting_system'
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('|->\tDatabase Connected Successfully...\n|');
    console.log('|\tEnter "Ctrl + C" to Close the Server...\n|');
});

// Set up MySQL session store
const sessionStore = new MySQLStore({}, db);

app.use(session({
    secret: secretKey,
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
    cookie: { 
        secure: false,  // Set to true in production with HTTPS
        maxAge: 86400000  // 24 hours expiration
    }
}));

app.use(express.static(path.join(__dirname, 'public')));

// Routes for admin login
app.post('/auth/admin/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM admin WHERE admin_id = ? AND password = ?', [username, password], (err, results) => {
        if (err) {
            res.status(500).send('Internal Server Error');
        } else {
            if (results.length > 0) {
                res.redirect('/admin/admin_dashboard.html');
            } else {
                res.status(401).send('Invalid admin credentials');
            }
        }
    });
});

// Routes for voter login
app.post('/auth/user/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM users WHERE epic_id = ? AND password = ?', [username, password], (err, results) => {
        if (err) {
            res.status(500).send('Internal Server Error');
        } else {
            if (results.length > 0) {
                // Save user data in session
                req.session.user = results[0]; // Assuming the first result is the user
                res.redirect('/user/user_dashboard.html');
            } else {
                res.status(401).send('Invalid voter credentials');
            }
        }
    });
});

// Routes for user registration
app.post('/auth/user/register', (req, res) => {
    const { epic, name, dob, aadhaar, constituency_name, password } = req.body;

    const query = `INSERT INTO users (epic_id, name, dob, aadhaar, constituency_name, voted, password) VALUES (?, ?, ?, ?, ?, 0, ?)`;
    const values = [epic, name, dob, aadhaar, constituency_name, password];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error inserting data: ', err);
            res.status(500).send('Database error');
        } else {
            res.status(200).send('Registration Successfully Completed.');
        }
    });
});

// Route for logging out
app.get('/auth/user/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error logging out');
        }
        res.redirect('/');
    });
});


// Prevent caching for sensitive pages
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    next();
});


// Route for getting user info
app.get('/user/getInfo', (req, res) => {
    if (req.session.user) {
        res.json({ name: req.session.user.name });
    } else {
        res.status(401).send('Unauthorized');
    }
});


app.get('/user/myInfo', (req, res) => {
    const epicId = req.session.user.epic_id;  // Correct extraction of epic_id
    const query = 'SELECT * FROM users WHERE epic_id = ?';  // SQL query to get user info

    db.query(query, [epicId], (err, result) => {
        if (err) {
            console.log("SQL Error:", err.sqlMessage);  // Log detailed SQL error message
            console.log("Query Error:", query);  // Log the query to identify issues
            res.status(500).send('Error fetching user info');
        } else if (result.length > 0) {
            res.json(result[0]);  // Send user data as JSON response
        } else {
            res.status(404).send('No user found with the given epic_id');
        }
    });
});




// Route for deleting a voter
app.post('/admin/removeVoter', (req, res) => {
    const stid = req.body.stid;
    db.query('DELETE FROM users WHERE epic_id = ?', [stid], (err, result) => {
        if (err) {
            res.status(500).send('Error removing voter');
        } else {
            res.status(200).send('Voter removed successfully');
        }
    });
});

// Route for getting all voters
app.get('/admin/voters', (req, res) => {
    db.query('SELECT * FROM users', (err, results) => {
        if (err) {
            res.status(500).send('Error retrieving voters');
        } else {
            res.status(200).json(results);
        }
    });
});

// Route to fetch election results
app.post("/admin/fetch_results", (req, res) => {
    const constituency_name = req.body.constituency_name;

    if (!constituency_name) {
        return res.status(400).send("Constituency name is required.");
    }

    const query = "SELECT * FROM results WHERE constituency_name = ? ORDER BY votes DESC"; // Sorting by votes in descending order
    db.query(query, [constituency_name], (err, results) => {
        if (err) {
            console.error("Error fetching results:", err);
            return res.status(500).send("An error occurred while fetching results.");
        }

        // Render the results with styles
        if (results.length > 0) {
            let resultHTML = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body {
                            font-family: 'Times New Roman', Times, serif;
                            background-color: #f4f4f4;
                            margin: 0;
                            padding: 0;
                        }
                        .header {
                            background-color: #f89040;
                            padding: 20px;
                            text-align: center;
                            color: white;
                            font-size: 2em;
                            font-weight: bold;
                            text-shadow: 2px 2px 5px #000000;
                        }
                        table {
                            width: 80%;
                            margin: 20px auto;
                            border-collapse: collapse;
                            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                            background-color: #fff;
                        }
                        th, td {
                            padding: 15px;
                            text-align: left;
                            border: 1px solid #ddd;
                        }
                        th {
                            background-color: #6495ed;
                            color: white;
                        }
                        tr:nth-child(even) {
                            background-color: #f2f2f2;
                        }
                        tr:hover {
                            background-color: #ddd;
                        }
                        footer {
                            background-color: #000;
                            color: white;
                            text-align: center;
                            padding: 10px;
                            position: fixed;
                            width: 100%;
                            bottom: 0;
                        }
                    </style>
                    <title>Results for ${constituency_name}</title>
                </head>
                <body>
                    <div class="header">Results for ${constituency_name}</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Candidate Name</th>
                                <th>Party</th>
                                <th>Votes</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            results.forEach(row => {
                resultHTML += `
                    <tr>
                        <td>${row.candidate_name}</td>
                        <td>${row.party}</td>
                        <td>${row.votes}</td>
                    </tr>
                `;
            });

            resultHTML += `
                        </tbody>
                    </table>
                    <footer>&copy; 2025 Online Voting Services. All rights reserved.</footer>
                </body>
                </html>
            `;

            res.send(resultHTML);
        } else {
            res.send(`<h2>No results found for ${constituency_name}</h2>`);
        }
    });
});


// Fetch candidates based on user's constituency
app.get('/user/candidates/:constituency_name', (req, res) => {
    const constituency = req.params.constituency_name;
    console.log('Fetching candidates for constituency:', constituency); // Log constituency
    db.query(
        'SELECT candidate_name, party FROM results WHERE constituency_name = ?',
        [constituency],
        (err, results) => {
            if (err) {
                console.error('Error fetching candidates:', err);
                res.status(500).send('Error fetching candidates');
                return;
            }
            console.log('Fetched candidates:', results); // Log the fetched results
            res.json(results); // Send candidates as JSON
        }
    );
});

// Handle vote submission
app.post('/user/vote', async (req, res) => {
    const epicId = req.session.user ? req.session.user.epic_id : null; // Ensure epic_id exists in session
    if (!epicId) {
        return res.status(401).send('Unauthorized');
    }
    const selectedCandidate = req.body.candidate_name;

    // Check if user has already voted
    try {
        // Check if the user has already voted
        const [userResults] = await db.promise().query(
            'SELECT voted, constituency_name FROM users WHERE epic_id = ?', [epicId]
        );

        if (userResults.length === 0) {
            return res.status(404).send('User not found');
        }

        const { voted, constituency_name } = userResults[0];

        if (voted) {
            return res.status(400).send('You have already voted');
        }

        // Update vote count
        await db.promise().query(
            'UPDATE results SET votes = votes + 1 WHERE constituency_name = ? AND candidate_name = ?', 
            [constituency_name, selectedCandidate]
        );

        // Mark user as voted
        await db.promise().query(
            'UPDATE users SET voted = 1 WHERE epic_id = ?', [epicId]
        );

        res.send('Vote submitted successfully');
    } catch (err) {
        console.error("Error during vote submission:", err);
        res.status(500).send('Error submitting vote');
    }
});


// Serve the index.html file at the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
const server = app.listen(port, () => {
    console.log('\n--------------------------------------------------');
    console.log('|\tHi!, Welcome to Backend Server....\n|');
    console.log('|->\tServer Started!!\n|');
    console.log(`|->\tServer running at http://localhost:${port}/\n|`);
});

// Gracefully handle server termination
process.on('SIGINT', () => {
    server.close(() => {
        console.log('|->\tServer closed!!! Bye! Bye!!');
        console.log('|\n--------------------------------------------------');
        process.exit(0);
    });
});
