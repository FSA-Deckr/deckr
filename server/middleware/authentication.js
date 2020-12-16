const {PlayerSession} = require('../db')
const {A_DAY_IN_SECONDS} = require('../constants')

const authentication = async (req, res, next) => {

  //function to assign cookie
  const assignCookie = async () => {
    const createdSession = await PlayerSession.create();
    res.cookie('sid', createdSession.id, { 
      path: '/'
    });
    req.playerNumber = null;
    req.gameTableId = null;
  }

  //case 1: no cookie upon opening page
  if (!req.cookies || !req.cookies.sid) {
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
    //this is case where they x'd out a tab but still have session cookie. 
    //It will unassign their cookie before reassigning when they enter a room.
    else if (session.gameTableId === null) {
      req.playerNumber = null;
      req.gameTableId = null;
    }
    else {
      req.playerNumber = session.playerNumber
      req.gameTableId = session.gameTableId
    }

  }

  next();
}

module.exports = authentication
