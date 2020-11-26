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

  const ws = require('ws');
  
  const port = process.env.PORT || 8080;
  const server = app.listen(port, () => console.log(`listening on port ${port}`));
  
  const wsServer = new ws.Server({
    server,
  });
  
  const peersByCode = {};
  
  wsServer.on('request', request => {
    const connection = request.accept();
    const id = (Math.random() * 10000);
    clients.push({ connection, id });
  
    connection.on('message', message => {
      console.log(message);
      clients
        .filter(client => client.id !== id)
        .forEach(client => client.connection.send(message.utf8Data));
    });
  
    connection.on('close', () => {
      clients = clients.filter(client => client.id !== id);
    });
  });








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
