const express = require('express')
const morgan = require('morgan');
const path = require('path');
const router = require('./routes');
const {db} = require('./db');
const authentication = require('./middleware/authentication')
const cookieParser = require('cookie-parser')

const app = express();

app.use(morgan('volleyball'));
app.use(express.json());

app.use(cookieParser())
app.use(authentication)
app.use(express.static(path.join(__dirname, '/public')));

app.use('/api', router)

app.use((req, res, next) => {
    res.status(404).send('Page not found');
})

app.use((err, req, res, next) => {
    res.status(500).send('Error:' + err.message);
  });



// const init = async () => {
// try {
//     await db.sync({force: true});
//     const port = process.env.PORT || 8080;
//     app.listen(port, () => console.log(`listening on port ${port}`));
// }
// catch (ex){
//     console.log(ex);
// }
// };

// init();
