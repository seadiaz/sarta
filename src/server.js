const socketIO = require('socket.io')
const p2p = require('socket.io-p2p-server')
const Koa = require('koa')
const Router = require('koa-router')
const serve = require('koa-static')
const logger = require('winston')
const moment = require('moment')
const info = require('../package.json')
const renderer = require('koa-hbs-renderer')
const path = require('path')

class Server {
  constructor () {
    this._koa = new Koa()
    this._router = new Router()
  }
  start () {
    return new Promise((resolve, reject) => {
      this._configHealth()
      this._configViews()
      this._koa.use(renderer({
        cacheExpires: 0,
        paths: {
          views: path.join(__dirname, 'views')
        }
      }))

      this._koa
        .use(serve('./public'))
        .use(this._router.routes())
        .use(this._router.allowedMethods())
      this._server = this._koa.listen(3000, () => {
        logger.info('Server listening!!!')
      })
      this._configSocketIO()
      resolve()
    })
  }

  _configHealth () {
    let started = moment()
    this._router.get('/health', (ctx) => {
      ctx.body = {
        started: started.format('LLLL'),
        uptime: started.fromNow(),
        version: info.version,
        series: this._series
      }
    })
  }

  _configViews () {
    this._router.get('/chat', async (ctx) => {
      await ctx.render('chat', {})
    })
    this._router.get('/file', async (ctx) => {
      await ctx.render('file', {})
    })
  }

  _configSocketIO () {
    this._io = socketIO(this._server)
    this._io.use(p2p.Server)
    this._io.on('connect', (socket) => {
      logger.info('Client connected!')
      socket.emit('greetings', {message: 'Hi there!'})
      socket.on('greetings', (data) => {
        logger.info('Greetings:', data)
      })
      socket.on('peer-msg', (data) => {
        logger.info('From a peer: %s', JSON.stringify(data))
      })
      socket.on('disconnect', (reason) => {
        logger.info('Client disconnected: %s', reason)
      })
    })
  }
}

module.exports = Server
