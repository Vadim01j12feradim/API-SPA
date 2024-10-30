const express = require('express')
const mysql = require('mysql2')
const cors = require('cors');
const io = require('socket.io-client');

const CryptoJS = require('crypto-js');

const secretKey = "?G&;3GCK0wB?!n5?;q0q_FQt(Adrqa"; 

const encryptPassword = (password) => {
  if (!password) {
    throw new Error("Password cannot be empty");
  }
  return CryptoJS.AES.encrypt(password, secretKey).toString();
};

const decryptPassword = (encryptedPassword) => {
  if (!encryptedPassword) {
    throw new Error("Encrypted password cannot be empty");
  }
  const bytes = CryptoJS.AES.decrypt(encryptedPassword, secretKey);
  const originalPassword = bytes.toString(CryptoJS.enc.Utf8);
  
  if (!originalPassword) {
    throw new Error("Decryption failed: Invalid encrypted password");
  }
  
  return originalPassword;
};




function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

// Connect to the Socket.IO server
const getCurrentFormatedData = () =>{
    const date = new Date();

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based in JS
        const day = String(date.getDate()).padStart(2, '0');
        
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        const mysqlDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    return mysqlDateTime
}


const socket = io('http://socket:3001');
// const socket = io('http://localhost:3001');


socket.on('connect', () => {
    console.log('Connected to socket server');
    
});

// Listen for a response from the server (optional)
socket.on('chatMessage', (data) => {
    console.log('Message from server:', data);
});

// Handle connection errors
socket.on('connect_error', async (error) => {
    // console.error('Connection error:', error);
    console.log("Tring socket connection");
    
    await sleep(2000)
    socket.connect();
});


const app = express();
app.use(cors());
const port = 3000;


let pool = null;

async function initializeDatabaseConnection() {
  while (true) {
    try {
      pool = mysql.createPool({
        host: 'db',
        // host: 'localhost',
        user: 'username',
        password: 'password',
        database: 'SPA',
        waitForConnections: true,
        connectionLimit: 40,
        queueLimit: 0
      });
      console.log("Database connection pool created successfully");
      break;
    } catch (error) {
      console.error("Error:", error.message);
      await sleep(2000);
    }
  }
}



initializeDatabaseConnection().then(() => {
    console.log(`Connected`);
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
    
    
    const querySelect = `SELECT 
        vehicles.id, 
        vehicles.plates,
        vehicles.brand,
        vehicles.color,
        vehicles.model,
        vehicles.latitude,
        vehicles.longitude,
        DATE_FORMAT(vehicles.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        DATE_FORMAT(vehicles.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at,
        vehicles.status,
        users.username 
        FROM vehicles INNER JOIN users ON vehicles.user_id = users.id 
    WHERE vehicles.id = ? and status = 1`;

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

});


app.put('/carsById', (req,res) => {
    const newItem = req.body
 
    let querySelect = `
        SELECT 1 
        FROM vehicles 
        WHERE plates = ? 
          AND id != ?`;


          
          //  executeQuery(querySelect, [newItem.placas, newItem.marca, newItem.color, newItem.modelo,current, newItem.id,newItem.placas,newItem.id])
          executeQuery(querySelect, [newItem.placas,newItem.id])
          .then(result => {
              var code = 300
              if (result.length == 0) {
                  code = 200
                  const current  = getCurrentFormatedData()
                  newItem.updated_at = current
                  querySelect = `
                    UPDATE vehicles 
                    SET plates = ?, brand = ?, color = ?, model = ?, updated_at = ? 
                    WHERE id = ?
                  `

                  executeQuery(querySelect, [newItem.placas, newItem.marca, newItem.color, newItem.modelo,current, newItem.id])
          .then(result => {
            code = 300
            if (result.affectedRows > 0) {
                code = 200
                socket.emit("message", newItem)
            }
          })
          .catch(err => {
              code = 500 
          });

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

 

app.put('/cars', (req,res) => {
   const newItem = req.body

    const querySelect = `UPDATE vehicles SET latitude = ?,  longitude = ?, updated_at = ? WHERE id = ? `;

    executeQuery(querySelect, [newItem.latitude, newItem.longitude, newItem.updated_at, newItem.id])
    .then(result => {
        var code = 300
        var message = "Not found"
        if (result.affectedRows > 0) {

            socket.emit("message", newItem);
            code = 200
            message = "Ok"
     
        }
        
        res.json({
            message: message,
            data: newItem,
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


app.get('/', (req,res) => {
    res.send('Welcome to Izmael API')
})



app.delete('/cars', (req,res) => {
    const { id } = req.query;
    var query = "UPDATE vehicles SET status = ? WHERE id = ?"
   
    executeQuery(query, [0, id])
    .then(result => {
        var code = 300

        if (result.affectedRows > 0) {
            code = 200
        }

        res.json({
            message: result == 300 ? "Not found":"Ok",
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
})

app.get('/cars', (req,res) => {
    const { role } = req.query;
    const { idUser } = req.query;
    var query = `SELECT  
        vehicles.id, 
        vehicles.plates,
        vehicles.brand,
        vehicles.color,
        vehicles.model,
        vehicles.latitude,
        vehicles.longitude,
        DATE_FORMAT(vehicles.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        DATE_FORMAT(vehicles.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at,
        vehicles.status,
        users.username 
        FROM vehicles INNER JOIN users ON 
          vehicles.user_id = users.id  where vehicles.status = 1`

    var params = []

    switch (role) {
        case "viewer":
            params = [idUser]
            query += " and user_id = ? "
            break;
        case "admin":
            break;    
        default:
            break;
    }

   query += " ORDER BY vehicles.id DESC"

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

app.post('/login', (req,res) => {
    const newItem = req.body
    const querySelect = `SELECT * FROM users WHERE username = ?`;

    executeQuery(querySelect, [newItem.username])
    .then(result => {
        var code = 300
        if (result.length > 0) {
            const temp  = result[0]
            const Preal = decryptPassword(temp.password)
            const pParam = decryptPassword(newItem.password)
            if (Preal ==  pParam) {
                code = 200
            }else{
                code = 300
            }

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
    
    const query = `INSERT INTO vehicles (user_id, plates, brand, color, model, latitude, longitude )
                    SELECT ?, ?, ?,?, ?, ?, ?
                    WHERE NOT EXISTS (
                    SELECT 1 FROM vehicles WHERE plates = ?  
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


