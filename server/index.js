const express = require('express')
const morgan = require('morgan');
const path = require('path');
const router = require('./routes');
const {db} = require('./db');
const authentication = require('./middleware/authentication')
const cookieParser = require('cookie-parser')
const io = require('socket.io');
const { setSocketServer }  = require('./socketServer');
const enforce = require('express-sslify')

const app = express();

if (app.get("env")==="production") app.use(enforce.HTTPS({ trustProtoHeader: true }));

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
    res.sendStatus(404)
})


app.use((err, req, res, next) => {
    res.sendStatus(500)
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

