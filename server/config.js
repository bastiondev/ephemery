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

// Copy REDIS_URL value
if (envs['REDIS_URL']) {
  envs['REDIS_URL'] = envs[envs['REDIS_URL']]
}

module.exports = envs
