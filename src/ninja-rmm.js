const axios = require('axios')
const uuid = require('uuid')
const oauth = require('./oauth-listener')

const REGIONS = ['na', 'eu', 'oc', 'ca']
const GRANT_CLIENT_CREDENTIALS = 'client_credentials'
const GRANT_AUTHORIZATION_CODE = 'authorization_code'
const GRANT_REFRESH_TOKEN = 'refresh_token'
const OAUTH_DEFAULT_PORT = '4099'
const OAUTH_DEFAULT_HOST = 'localhost'

/**
 *
 * @param region ['na', 'eu', 'oc', 'ca']
 * @returns {string}
 */
const REGION_HOST_URL = (region) => {
  switch (region) {
    case 'na':
      return `https://app.ninjarmm.com`
    case 'eu':
      return `https://eu.ninjarmm.com`
    case 'oc':
      return `https://oc.ninjarmm.com`
    case 'ca':
      return `https://ca.ninjarmm.com`
    default:
      throw new Error(
        `Invalid region defined. Must be one of: ${REGIONS.join(', ')}`)
  }
}

/**
 *
 * @param region ['na', 'eu', 'oc', 'ca']
 * @returns {string}
 */
const REGION_TOKEN_URL = (region) => {
  if (!REGIONS.includes(region)) {
    throw new Error(
      `Invalid region defined. Must be one of: ${REGIONS.join(', ')}`)
  }

  return `${REGION_HOST_URL(region)}/ws/oauth/token`
}

/**
 *
 * @param region ['na', 'eu', 'oc', 'ca']
 * @returns {string}
 */
const REGION_AUTHORIZATION_CODE_URL = (region) => {
  if (!REGIONS.includes(region)) {
    throw new Error(
      `Invalid region defined. Must be one of: ${REGIONS.join(', ')}`)
  }

  return `${REGION_HOST_URL(region)}/ws/oauth/authorize`
}

class NinjaRMM {
  grantType
  region
  clientSecret
  clientId
  scope
  accessToken
  tokenExpiration
  refreshToken
  oauthPort
  oauthHost

  /**
   *
   * @param grantType ['client_credentials', 'authorization_code', 'refresh_token']
   * @param region ['na', 'eu', 'oc', 'ca']
   * @param clientSecret
   * @param clientId
   * @param scope defaults to 'monitoring management control'
   * @param refreshToken required if grantType is 'refresh_token'
   * @param oauthPort
   * @param oauthHost
   */
  constructor ({
    grantType = GRANT_CLIENT_CREDENTIALS,
    region = 'na',
    clientSecret,
    clientId,
    scope = 'monitoring management control',
    refreshToken,
    oauthPort = OAUTH_DEFAULT_PORT,
    oauthHost = OAUTH_DEFAULT_HOST,
  }) {
    if (!clientSecret || !clientId) {
      throw new Error('clientSecret and clientId must be defined')
    }

    if (grantType === GRANT_REFRESH_TOKEN && !refreshToken) {
      throw new Error('refreshToken must be defined if grantType is refresh_token')
    }

    this.grantType = grantType
    this.region = region
    this.clientSecret = clientSecret
    this.clientId = clientId
    this.scope = scope
    this.tokenExpiration = 0
    this.refreshToken = refreshToken
    this.oauthPort = oauthPort
    this.oauthHost = oauthHost
  }

  /**
   * see https://app.ninjarmm.com/apidocs-beta/core-resources
   * @param {string} path
   * @param {string} [method]
   * @param {object} [params]
   * @param {object} [data]
   * @returns {Promise<*>}
   */
  async request ({ path, method = 'GET', params, data }) {
    if (!this.accessToken || Date.now() >= this.tokenExpiration) {
      const token = await NinjaRMM.generateToken({
        region: this.region,
        clientSecret: this.clientSecret,
        clientId: this.clientId,
        scope: this.scope,
        grantType: this.grantType,
        refreshToken: this.refreshToken,
        oauthHost: this.oauthHost,
        oauthPort: this.oauthPort,
      })
      this.accessToken = token.access_token
      this.tokenExpiration = Date.now() + token.expires_in * 1000
      console.log({ accessToken: this.accessToken })
    }

    const options = {
      headers: {
        authorization: `Bearer ${this.accessToken}`,
      },
      method,
      baseURL: REGION_HOST_URL(this.region),
      url: path,
      params,
      data,
    }
    let result
    try {
      result = await axios(options)
    } catch (err) {
      console.error(err)
      throw new Error(`api request failed: ${err.message}`)
    }

    return result.data
  }

  /**
   *
   * @param grantType
   * @returns {Promise<{access_token, expires_in}>}
   */
  static async generateToken ({ grantType, ...rest }) {
    if (![
      GRANT_REFRESH_TOKEN,
      GRANT_CLIENT_CREDENTIALS,
      GRANT_AUTHORIZATION_CODE].includes(grantType)) {
      throw new Error(`grantType must be one of ${[
        GRANT_REFRESH_TOKEN,
        GRANT_CLIENT_CREDENTIALS,
        GRANT_AUTHORIZATION_CODE].join(', ')}`)
    }

    switch (grantType) {
      case GRANT_CLIENT_CREDENTIALS:
        return this.generateTokenClientCredentials({ ...rest })
      case GRANT_AUTHORIZATION_CODE:
        return this.generateTokenAuthorizationCode({ ...rest })
      case GRANT_REFRESH_TOKEN:
        return this.generateTokenRefresh({...rest})
    }
  }

  /**
   * @param region
   * @param clientSecret
   * @param clientId
   * @param scope
   * @param oauthHost
   * @param oauthPort
   * @returns {Promise<{access_token, expires_in}>}
   */
  static async generateTokenAuthorizationCode ({
    region,
    clientSecret,
    clientId,
    scope,
    oauthHost,
    oauthPort,
  }) {
    const { default: open } = await import('open')
    const redirectUri = `http://${oauthHost}:${oauthPort}/oauth`
    const authUrlParams = {
      response_type: 'code',
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
      scope,
      state: uuid.v4(),
    }

    const authUrl = REGION_AUTHORIZATION_CODE_URL(region) + '?' +
      new URLSearchParams(authUrlParams).toString()

    // open browser to authenticate
    // swallow promise to avoid IDE error
    const swallow = open(authUrl)

    // open express server listener and wait for successful response
    const { code } = await oauth({ oauthPort, oauthHost })

    const tokenRequestOptions = {
      method: 'POST',
      url: REGION_TOKEN_URL(region),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: {
        grant_type: GRANT_AUTHORIZATION_CODE,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      },
    }

    let result
    try {
      result = await axios.request(tokenRequestOptions)
    } catch (err) {
      console.error(err)
      throw new Error(`Error retrieving access token: ${err.message}`)
    }

    if (!result.data?.access_token) {
      throw new Error('No access_token returned from request')
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
  static async generateTokenClientCredentials ({
    region,
    clientSecret,
    clientId,
    scope,
  }) {
    const options = {
      method: 'POST',
      url: REGION_TOKEN_URL(region),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: {
        grant_type: GRANT_CLIENT_CREDENTIALS,
        client_id: clientId,
        client_secret: clientSecret,
        scope,
      },
    }

    let result
    try {
      result = await axios.request(options)
    } catch (err) {
      console.error(err)
      throw new Error(`Error retrieving access token: ${err.message}`)
    }

    if (!result.data?.access_token) {
      throw new Error('No access_token returned from request')
    }
    return result.data
  }

  static async generateTokenRefresh({clientId, clientSecret, refreshToken, region}) {
    const options = {
      method: 'POST',
      url: REGION_TOKEN_URL(region),
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      data: {
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }
    }

    let result
    try {
      result = await axios.request(options)
    } catch (err) {
      console.error(err)
      throw new Error(`Error retrieving access token: ${err.message}`)
    }

    if (!result.data?.access_token) {
      throw new Error('No access_token returned from request')
    }
    return result.data
  }
}

module.exports = NinjaRMM
