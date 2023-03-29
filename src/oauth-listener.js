const express = require('express')

const app = express()

function listener ({ oauthPort, oauthHost }) {
  return new Promise((resolve, reject) => {
    let server
    app.all('/oauth', (req, res) => {
      const {code, scope, state} = req.query

      res.send('You can safely close this window.')

      resolve({code, scope, state})
      server.close()
    })

    server = app.listen(oauthPort, oauthHost)
  })
}

module.exports = listener

