const {PlayerSession} = require('../db')
const {A_DAY_IN_SECONDS} = require('../../src')

const authentication = async (req, res, next) => {

  //function to assign cookie
  const assignCookie = async () => {
    const createdSession = await PlayerSession.create();
    res.cookie('sid', createdSession.id, {
      maxAge: new Date(Date.now() + A_DAY_IN_SECONDS),
      path: '/'
    });
    req.playerNumber = null;
    req.gameTableId = null;
  }

  //case 1: no cookie upon opening page
  if (!req.cookies.sid) {
    await assignCookie();
  }
  //case 2: cookie upon opening page
  else {
    //look for session in DB
    const session = await PlayerSession.findOne({
        where: {
            id: req.cookies.sid
        }
    })

    //if session not in database, clear and assign a new one. Otherwise, do nothing.
    if (!session){
        res.clearCookie('sid', req.cookies.sid, {
            path: '/'
        })
        await assignCookie();
    }

  }
  next();
}

module.exports = authentication
