const express = require('express')
const bcrypt = require('bcryptjs')
const morgan = require("morgan")
const bodyParser = require("body-parser")
const jwt = require('jsonwebtoken')
const db = require("./db/dbCon")

const app = express()

const SECRET_KEY = 'asjdas123912kdascl'

app.use(morgan("dev"))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.get('/', (req, res) => {
    res.send("Welcome to SBC Child Tracker services.")
})

app.post('/test', (req, res) => {
    if (!req.body.latitude || !req.body.longitude) {
        return res.status(400).send('Bad request')
    }

    db.query('UPDATE devices SET latitude=$1, longitude=$2 WHERE userid=1', [req.body.latitude, req.body.longitude], (err, result) => {
        if (err) {
            console.log(err.stack)
            return res.status(400).json({ status: "Fail" })
        }

        return res.status(200).json({ status: "Success", message: "Coordinates succesfully updated" })
    })
})

app.post('/api/login', async (req, res) => {
    if (req.body.auth) {
        try {
            const decoded = jwt.verify(req.body.auth, SECRET_KEY);

            return res.status(200).json({
                status: "Success",
                message: "Auth token present"
            })
        }
        catch (ex) {
            console.log(ex.message)
            return res.status(401).json({
                status: "Fail",
                message: "Bad auth token, login with credentials instead"
            })
        }
    }

    try {
        const user = { username: req.body.email, password: req.body.password }
        
        const queryResult = await db.query('SELECT userid, password FROM users WHERE $1 = email', [user.username])

        if (queryResult.rowCount !== 1) {
            console.log(user)
            return res.status(400).json({ status: "Fail", message: "User not exist" })
        }
        bcrypt.compare(user.password, queryResult.rows[0].password).then(isMatch => {
            if (isMatch) {
                const token = jwt.sign({ 'user': user.username }, SECRET_KEY, { expiresIn: '1h' })

                console.log(token)
                return res.status(200).json({
                    status: "Success",
                    message: "User succesfully logined",
                    auth: token
                })
            }
            else {
                return res.status(400).json({
                    status: "Fail",
                    message: "Wrong username or password"
                })
            }
        })
    } catch (err) {
        console.log(err.stack)
        return res.status(400).json({
            status: "Fail",
            message: 'There is an error with db'
        })
    }
})

app.post('/api/register', async (req, res) => {
    const user = { name: req.body.name, surname: req.body.surname, phone: req.body.phone, email: req.body.email, password: req.body.password };

    try {
        const isExist = await db.query('SELECT userid FROM users WHERE $1 = email', [user.email])

        if (isExist.rowCount !== 0) {
            return res.status(400).json({ message: "This email is already exists" })
        }
        else {
            bcrypt.hash(user.password, 10, (err, hash) => {
                if (err) {
                    console.log('There is an error in bcrypt hashing')
                    return res.status(500).json({ status: "Fail", message: "Internal server error" });
                }

                user.password = hash;

                db.query('INSERT INTO users(name, surname, email, phonenumber, password) VALUES($1, $2, $3, $4, $5)', [user.name, user.surname, user.email, user.phone, user.password], (err, result) => {
                    if (err) {
                        console.log(err.stack)
                        return res.status(400).json({ status: "Fail" })
                    }

                    return res.status(200).json({ status: "Success", message: "User succesfully created" })
                })
            })
        }
    }
    catch (err) {
        console.log(err.stack)
        return res.status(400).json({ status: "Fail" })

    }
})

app.post('/api/user/coordinates', async (req, res) => {

    if (!req.body.auth) {
        return res.status(401).json({
            status: 'Fail',
            message: 'Authorization token is missing'
        })
    }

    let decoded;

    try {
        decoded = jwt.verify(req.body.auth, SECRET_KEY)
    } catch (ex) {
        return res.status(401).json({
            status: 'Failed',
            message: 'Authorization token verification failed'
        })
    }

    const user = await db.query('SELECT userid FROM users WHERE $1 = email', [decoded.user])

    if (user.rowCount !== 1) {
        console.log('Db duplication error')

        return res.status(500).json({
            status: 'Fail',
            message: 'Internal Server Error'
        })
    }
    else {
        const coordinates = await db.query('SELECT latitude, longitude FROM devices WHERE $1 = userid', [user.rows[0].userid])

        console.log(coordinates.rows[0].latitude, coordinates.rows[0].longitude)
        return res.status(200).json({
            status: "Success",
            latitude: coordinates.rows[0].latitude,
            longitude: coordinates.rows[0].longitude
        })
    }
})

module.exports = app