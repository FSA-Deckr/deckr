# deckr

Deckr is an online card table/sandbox that allows users to play a game of cards. Deckr itself has no rule enforcement, so users are encouraged to play with trusted friends in an agreed-upon game.

## Installation

Getting project running locally

Deckr uses several node libraries, including Phaser and Agora. Begin by installing node modules:

```
npm install
```

Build the js files:

```
npm run build:dev
```

And start the local server:

```
npm run start:dev
```

## Deployment

https://fsa-deckr.herokuapp.com

heroku  https://git.heroku.com/fsa-deckr.git (fetch)

heroku  https://git.heroku.com/fsa-deckr.git (push)

heroku git:remote -a fsa-deckr

git push heroku HEAD:master

## Built with

* [Phaser](https://photonstorm.github.io/phaser3-docs/) - Game/physics engine
* [Agora](https://docs.agora.io/en) - Video chat
* [Socket.io](https://socket.io/docs/v3) - Websockets
