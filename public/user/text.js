const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3070;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'college_db'
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('|->\tDatabase Connected Successfully...\n|');
    console.log('|\tEnter "Ctrl + C" to Close the Server...\n|');
});

// Routes for handling authentication
app.post('/auth/login', (req, res) => {
    // Assuming you have a database query to validate credentials
    const { username, password } = req.body;
    // Example query to validate credentials (replace with your own logic)
    db.query('SELECT * FROM users WHERE ID = ? AND Password = ?', [username, password], (err, results) => {
        if (err) {
            res.status(500).send('Internal Server Error');
        } else {
            if (results.length > 0) {
                // Credentials are valid, determine user role and redirect to dashboard
                const user = results[0];
                if (user.role === 'admin') {
                    res.redirect('/admin/admin_dashboard.html');
                } else if (user.role === 'student') {
                    res.redirect('/student/student_dashboard.html');
                } else if (user.role === 'faculty') {
                    res.redirect('/faculty/faculty_dashboard.html');
                } else {
                    // Unknown role, handle accordingly
                    res.status(500).send('Unknown user role');
                }
            } else {
                // Invalid credentials
                res.status(401).send('Invalid credentials');
            }
        }
    });
});

// Route to handle adding a new student
app.post('/admin/addStudent', (req, res) => {
    const studentName = req.body.studentName;
    const FName = req.body.FatherName;
    const stid = req.body.stid;
    const no = req.body.num;
    const dept = req.body.Dept;
    const year = req.body.Year;
    const pass = req.body.pas;
    const role = "student";
    // Insert the new student into the database
    db.query('INSERT INTO students (ID,Name,Father_Name,Mobile_Number, Department,Year, Password,role) VALUES(?,?,?,?,?,?,?,?)', [stid, studentName, FName,no, dept, year,pass,role], (err, result) => {
        if (err) {
            res.status(500).send('Error adding student');
        } else {
            res.status(200).send('Student added successfully');
        }
    });
});

// Route to handle adding a new faculty
app.post('/admin/addFaculty', (req, res) => {
    const id = req.body.id;
    const facultyName = req.body.facultyName;
    const FName = req.body.FatherName;
    const no = req.body.num;
    const dept = req.body.Dept;
    const sal = req.body.salary;
    const pass = req.body.pas;
    const role = "faculty";
    // Insert the new faculty member into the database
    db.query('INSERT INTO faculty (ID,Name,Father_Name,Mobile_Number, Department,Salary, Password,role) VALUES (?,?,?,?,?,?,?,?)', [id, facultyName, FName,no, dept,sal,pass,role], (err, result) => {
        if (err) {
            res.status(500).send('Error adding faculty');
        } else {
            res.status(200).send('Faculty added successfully');
        }
    });
});

//Route to handle deleting a student
app.post('/admin/removeStudent',(req, res) => {
    const stid = req.body.stid;
    db.query('DELETE FROM students WHERE ID = (?)',[stid],(err, result) => {
        if (err) {
            res.status(500).send('Error removing student');
        } else {
            res.status(200).send('Student removed successfully');
        }
    });
});

//Route to handle deleting a faculty
app.post('/admin/removeFaculty',(req, res) => {
    const id = req.body.id;
    db.query('DELETE FROM Faculty WHERE ID = (?)',[id],(err, result) => {
        if (err) {
            res.status(500).send('Error removing Faculty');
        } else {
            res.status(200).send('Faculty removed successfully');
        }
    });
});

// Route to retrieve and send existing students
app.get('/admin/students', (req, res) => {
    // Query the database to retrieve existing students
    db.query('SELECT * FROM students', (err, results) => {
        if (err) {
            res.status(500).send('Error retrieving students');
        } else {
            // Send the retrieved students as HTML or JSON, depending on your needs
            res.status(200).json(results);
        }
    });
});

// Route to retrieve and send existing faculty members
app.get('/admin/faculty', (req, res) => {
    // Query the database to retrieve existing faculty members
    db.query('SELECT * FROM faculty', (err, results) => {
        if (err) {
            res.status(500).send('Error retrieving faculty');
        } else {
            // Send the retrieved faculty members as HTML or JSON, depending on your needs
            res.status(200).json(results);
        }
    });
});


// Serve the index.html file at the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server and save the server instance
const server = app.listen(port, () => {
    console.log('\n--------------------------------------------------');
    console.log('|\tHi!, Welcome to Backend Server....\n|')
    console.log('|->\tServer Started!!\n|');
    console.log(`|->\tServer running at http://localhost:${port}/\n|`);

});

// Handle termination signal to gracefully shut down the server
process.on('SIGINT', () => {
    server.close(() => {
        console.log('|->\tServer closed!!! Bye! Bye!!');
        console.log('|\n--------------------------------------------------');
        process.exit(0); // Exit the process
    });
});
