const pg = require('pg')
const {Pool} = pg
require('dotenv').config()

const pool = new Pool({connectionString: process.env.DATABASE_URL})

module.exports = {
  query: (text, params) => pool.query(text, params),
  /**
   * @returns {Promise<pg.PoolClient>}
   */
  getClient: () => pool.connect()
}