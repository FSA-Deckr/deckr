const express = require('express')
const morgan = require('morgan');
const path = require('path');
const router = require('./routes');

const app = express();

app.use(morgan('volleyball'));
app.use(express.json());

console.log(__dirname);
app.use(express.static(path.join(__dirname, '/public')));

app.use('/api', router)

app.use((req, res, next) => {
    res.status(404).send('Page not found');
})

app.use((err, req, res, next) => {
    res.status(500).send('Error:' + err.message);
  });



  ///webRTC PART:

  
  
  const port = process.env.PORT || 8080;
  const server = app.listen(port, () => console.log(`listening on port ${port}`));
  

  var WebSocketServer = require('ws').Server; 

  //creating a websocket server at port 9090 
  var wss = new WebSocketServer({server}); 
  
  //all connected to the server users 
  var users = {};
    
  //when a user connects to our sever 
  wss.on('connection', function(connection) {
    
     console.log("User connected");
      
     //when server gets a message from a connected user 
     connection.on('message', function(message) { 
      
        var data; 
          
        //accepting only JSON messages 
        try { 
           data = JSON.parse(message); 
           console.log(data)
        } catch (e) { 
           console.log("Invalid JSON"); 
           data = {}; 
        }
          
        //switching type of the user message 
        switch (data.type) { 
           //when a user tries to login
           case "login": 
              console.log("User logged", data.name); 
                  
              //if anyone is logged in with this username then refuse 
              if(users[data.name]) { 
                 sendTo(connection, { 
                    type: "login", 
                    success: false 
                 }); 
              } else { 
                 //save user connection on the server 
                 users[data.name] = connection; 
                 connection.name = data.name; 
                      
                 sendTo(connection, { 
                    type: "login", 
                    success: true 
                 }); 
              } 
                  
              break;
                  
           case "offer": 
              //for ex. UserA wants to call UserB 
              console.log("Sending offer to: ", data.name);
                  
              //if UserB exists then send him offer details 
              var conn = users[data.name]; 
                  
              if(conn != null) { 
                 //setting that UserA connected with UserB 
                 connection.otherName = data.name; 
                      
                 sendTo(conn, { 
                    type: "offer", 
                    offer: data.offer, 
                    name: connection.name 
                 }); 
              }
                  
              break;
                  
           case "answer": 
              console.log("Sending answer to: ", data.name); 
              //for ex. UserB answers UserA 
              var conn = users[data.name]; 
                  
              if(conn != null) { 
                 connection.otherName = data.name; 
                 sendTo(conn, { 
                    type: "answer", 
                    answer: data.answer 
                 }); 
              } 
                  
              break; 
                  
           case "candidate": 
              console.log("Sending candidate to:",data.name); 
              var conn = users[data.name];
                  
              if(conn != null) { 
                 sendTo(conn, { 
                    type: "candidate", 
                    candidate: data.candidate 
                 }); 
              } 
                  
              break;
                  
           case "leave": 
              console.log("Disconnecting from", data.name); 
              var conn = users[data.name]; 
              conn.otherName = null; 
                  
              //notify the other user so he can disconnect his peer connection 
              if(conn != null) {
                 sendTo(conn, { 
                    type: "leave" 
                }); 
              }
                  
              break;
                  
           default: 
              sendTo(connection, { 
                 type: "error", 
                 message: "Command not found: " + data.type 
              }); 
                  
              break; 
        }
          
     }); 
      
     //when user exits, for example closes a browser window 
     //this may help if we are still in "offer","answer" or "candidate" state 
     connection.on("close", function() { 
      
        if(connection.name) { 
           delete users[connection.name]; 
              
           if(connection.otherName) { 
              console.log("Disconnecting from ", connection.otherName); 
              var conn = users[connection.otherName]; 
              conn.otherName = null;
                  
              if(conn != null) { 
                 sendTo(conn, { 
                    type: "leave" 
                 }); 
              }
           } 
        }
          
     });  
      
     connection.send("Hello world");  
  });
    
  function sendTo(connection, message) { 
     connection.send(JSON.stringify(message)); 
  }









  /////

// const init = () => {
// try {
//     const port = process.env.PORT || 8080;
//     app.listen(port, () => console.log(`listening on port ${port}`));
// }
// catch (ex){
//     console.log(ex);
// }
// };



// init();
