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

const init = () => {
try {
    const port = process.env.PORT || 8080;
    app.listen(port, () => console.log(`listening on port ${port}`));
}
catch (ex){
    console.log(ex);
}
};



init();
