const express = require('express')
const mysql = require('mysql2')
const cors = require('cors');
const io = require('socket.io-client');

// Connect to the Socket.IO server
const socket = io('http://localhost:3001');


socket.on('connect', () => {
    console.log('Connected to server');
    
});

// Listen for a response from the server (optional)
socket.on('chatMessage', (data) => {
    console.log('Message from server:', data);
});

// Handle connection errors
socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
});


const app = express();
app.use(cors());
const port = 3000;

const pool = mysql.createPool({
    host:'localhost',
    user:'username',
    password:'password',
    database:'SPA',
    waitForConnections: true,
    connectionLimit: 40,
    queueLimit:0
});


function executeQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        pool.query(query, params, (err, result) => {
            if (err) {
                console.log('Query error: ', err);
                return reject(500); // Reject the promise with a status code
            }
            resolve(result); // Resolve the promise with the result
        });
    });
}

app.use(express.json());


app.get('/cars/:id', (req, res) => {
    const carId = parseInt(req.params.id, 10); // Extract ID from request parameters
    

    const querySelect = `SELECT * FROM vehicles WHERE id = ? `;

    executeQuery(querySelect, [carId])
    .then(result => {
        var code = 300
        if (result.length > 0) {
            code = 200
        }

        res.json({
            message: result == 300 ? "Error":"Ok",
            data: result,
            code: code
        });

    })
    .catch(err => {
        code = 500
        res.json({
            message: 'Error creating item',
            error: err,
            code: code
        });
    });


    if (car) {
        res.status(200).json(car); // Respond with the car data
    } else {
        res.status(404).json({ message: 'Car not found' }); // Respond with an error if not found
    }
});


app.put('/cars', (req,res) => {
   const newItem = req.body

    const querySelect = `UPDATE vehicles SET latitud = ?,  longitud = ?, updated_at = ? WHERE id = ? `;

    executeQuery(querySelect, [newItem.latitud, newItem.longitud, newItem.updated_at, newItem.id])
    .then(result => {
        var code = 300
        if (result.affectedRows > 0) {
            code = 200
        }

        res.json({
            message: result == 300 ? "Error":"Ok",
            data: newItem,
            code: code
        });
        socket.emit("message", newItem)

    })
    .catch(err => {
        code = 500
        res.json({
            message: 'Error creating item',
            error: err,
            code: code
        });
    });
})


app.get('/', (req,res) => {
    res.send('Welcome to Izmael API')
})


app.get('/cars', (req,res) => {
    const { role } = req.query;
    const { idUser } = req.query;
    var query = "SELECT vehicles.*, users.username FROM vehicles INNER JOIN users ON vehicles.user_id = users.id WHERE user_id = ?;"
    var params = []

    switch (role) {
        case "viewer":
            params = [idUser]
            break;
        case "root":
            query = "SELECT * FROM vehicles"
            break;    
        default:
            break;
    }
   
    executeQuery(query, params)
    .then(result => {
        

        res.json({
            message: result == 300 ? "Not found":"Ok",
            data: result,
            code: 200
        });

    })
    .catch(err => {
        code = 500
        res.json({
            message: 'Error creating item',
            error: err,
            code: code
        });
    });

    
})

app.get('/items', (req,res) => {
    const { username } = req.query;
    const { password } = req.query;
    console.log(username);
    console.log(password);
    
    
    const querySelect = `SELECT * FROM users WHERE username = ? and password = ?`;

    executeQuery(querySelect, [username, password])
    .then(result => {
        var code = 300
        if (result.length > 0) {
            code = 200
        }

        res.json({
            message: result == 300 ? "Not found":"Ok",
            data: result[0],
            code: code
        });

    })
    .catch(err => {
        code = 500
        res.json({
            message: 'Error creating item',
            error: err,
            code: code
        });
    });

    
})


app.post('/cars',(req, res) => {
    const newItem = req.body
    
    const query = `INSERT INTO vehicles (user_id, placas, marca, color, modelo, latitud, longitud )
                    SELECT ?, ?, ?,?, ?, ?, ?
                    WHERE NOT EXISTS (
                    SELECT 1 FROM vehicles WHERE placas = ?  
                    );`;
                    
    var code = 200;

    executeQuery(query, [newItem.user_id, newItem.placas, newItem.marca,newItem.color,newItem.modelo,newItem.latitud,newItem.longitud,newItem.placas])
        .then(result => {
            if (result.affectedRows == 0) {
                code = 300
            }
           
            res.json({
                message: code == 300 ? "Item already exists":"item created",
                item: newItem,
                code: code
            });

        })
        .catch(err => {
            code = 500
            res.json({
                message: 'Error creating item',
                error: err,
                code: code
            });
        });

})


app.post('/items',(req, res) => {
    const newItem = req.body
    
    const query = `INSERT INTO users (username, password, role)
                    SELECT ?, ?, ?
                    WHERE NOT EXISTS (
                    SELECT 1 FROM users WHERE username = ?
                    );`;
                    
    var code = 200;

    executeQuery(query, [newItem.username, newItem.password, newItem.role,newItem.username])
        .then(result => {
            if (result.affectedRows == 0) {
                code = 300
            }
           
            res.json({
                message: code == 300 ? "Item already exists":"item created",
                item: newItem,
                code: code
            });

        })
        .catch(err => {
            code = 500
            res.json({
                message: 'Error creating item',
                error: err,
                code: code
            });
        });

})


app.listen(port, () => {
    console.log(`API is running on http://localhost:${port}`)
})






