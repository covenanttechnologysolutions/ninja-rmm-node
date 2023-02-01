const axios = require('axios')

/**
 *
 * @param region ['na', 'eu', 'oc'}
 * @returns {string}
 */
const REGION_API_URL = (region) => {
  switch (region) {
    case 'na':
      return `https://app.ninjarmm.com`
    case 'eu':
      return `https://eu.ninjarmm.com`
    case 'oc':
      return `https://oc.ninjarmm.com`
    default:
      throw new Error('Invalid region defined. Must be one of: na, eu, oc')
  }
}

/**
 *
 * @param region ['na', 'eu', 'oc'}
 * @returns {string}
 */
const REGION_TOKEN_URL = (region) => {
  switch (region) {
    case 'na':
      return `https://app.ninjarmm.com/ws/oauth/token`
    case 'eu':
      return `https://eu.ninjarmm.com/ws/oauth/token`
    case 'oc':
      return `https://oc.ninjarmm.com/ws/oauth/token`
    default:
      throw new Error('Invalid region defined. Must be one of: na, eu, oc')
  }
}

class NinjaRMM {
  region
  clientSecret
  clientId
  scope
  accessToken
  tokenExpiration

  constructor ({
    region = 'na',
    clientSecret,
    clientId,
    scope = 'monitoring management control',
  }) {
    if (!clientSecret || !clientId) {
      throw new Error('clientSecret and clientId must be defined')
    }
    this.region = region
    this.clientSecret = clientSecret
    this.clientId = clientId
    this.scope = scope
    this.tokenExpiration = 0
  }

  /**
   * see https://app.ninjarmm.com/apidocs-beta/core-resources
   * @param {string} path
   * @param {string} method
   * @param {object} [params]
   * @param {object} [data]
   * @returns {Promise<void>}
   */
  async request ({ path, method, params, data }) {
    if (!this.accessToken || Date.now() >= this.tokenExpiration) {
      const token = await NinjaRMM.generateToken({
        region: this.region,
        clientSecret: this.clientSecret,
        clientId: this.clientId,
        scope: this.scope,
      })
      this.accessToken = token.access_token
      this.tokenExpiration = Date.now() + token.expires_in * 1000
    }

    const options = {
      headers: {
        authorization: `Bearer ${this.accessToken}`,
      },
      method,
      baseURL: REGION_API_URL(this.region),
      url: path,
      params,
      data,
    }
    let result
    try {
      result = await axios(options)
    } catch (err) {
      // console.error(err)
      throw new Error(`api request failed: ${err.message}`)
    }

    return result.data
  }

  /**
   *
   * @param region
   * @param clientSecret
   * @param clientId
   * @param scope
   * @returns {Promise<{access_token, expires_in}>}
   */
  static async generateToken ({ region, clientSecret, clientId, scope }) {
    const options = {
      method: 'POST',
      url: REGION_TOKEN_URL(region),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope,
      },
    }

    let result
    try {
      result = await axios.request(options)
    } catch (err) {
      // console.error(err)
      throw new Error(`Error retrieving access token: ${err.message}`)
    }

    if (!result.data?.access_token) {
      throw new Error('No access_token returned from request')
    }
    return result.data
  }
}

module.exports = NinjaRMM
