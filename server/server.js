const express = require('express')
const path = require('path')

const { NODE_ENV, PORT } = require('./config')

const app = express()

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/build')))

app.get('/data', (req, res) => {
  res.json('Hello')
})

app.listen(PORT)
console.log(`Listening on port ${PORT} in ${NODE_ENV}`)
