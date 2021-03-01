const dotenv = require('dotenv')
const { each } = require('lodash')

const result = dotenv.config()

let envs

if (!('error' in result)) {
  envs = result.parsed
} else {
  envs = {}
  each(process.env, (value, key) => envs[key] = value)
}

module.exports = envs
