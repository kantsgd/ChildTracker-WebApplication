const Pool = require('pg').Pool

const pool = new Pool({
    user: 'postgres@childtrackerdbtest',
    host: 'childtrackerdbtest.postgres.database.azure.com',
    database: 'childtracker',
    password: 'Bkg5cWXM',
    port: 5432
})

module.exports = pool