const express = require('express')
const morgan = require('morgan');
const path = require('path');
const router = require('./routes');
const {db} = require('./db');
const authentication = require('./middleware/authentication')
const cookieParser = require('cookie-parser')
const io = require('socket.io');
const { setSocketServer }  = require('./socketServer');

const app = express();

app.use(morgan('dev'));
app.use(express.json());

app.use(cookieParser())
app.use(authentication)

app.use('/api', router)


app.use('/home', express.static(path.join(__dirname, '/public')));
app.use('/:gameTable', express.static(path.join(__dirname, '/public')))
app.use((req,res,next) => {
    res.redirect('/home')
})

app.use((req, res, next) => {
    res.status(404).send('Page not found');
})

console.log(process.env.APPID)

app.use((err, req, res, next) => {
    res.status(500).send('Error:' + err.message);
  });

const init = async () => {
try {
    await db.sync({force: true});
    const port = process.env.PORT || 8080;
    const server = app.listen(port, () => console.log(`listening on port ${port}`));
    setSocketServer(io(server))
}
catch (ex){
    console.log(ex);
}
};



init();

