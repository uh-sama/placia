const fs = require('fs');
const path = require('path');
const express = require('express');
const HttpError = require('./models/http-error');
const mongoose = require('mongoose');

const placesRoutes = require('./routes/places-routes');
const userRoutes = require('./routes/users-routes');

const app = express();

app.use(express.json());

app.use('/uploads/images', express.static(path.join('uploads', 'images')));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE')
    next();
});

app.use('/api/places', placesRoutes);

app.use('/api/users', userRoutes);

app.use((req, res, next) => {
    throw new HttpError('Could not find the route', 404);
})

app.use((error, req, res, next) => {
    if(req.file) {
        fs.unlink(req.file.path, err => {
            console.log(err);
        })
    }
    if (res.headerSent) {
        return next(error)
    }
    res.status(error.code || 500);
    res.json({ message: error.message || 'An unknown error occured' });
});

mongoose.connect(`mongodb+srv://usama:usama@cluster0.r4fkm.mongodb.net/places?retryWrites=true&w=majority`, {useNewUrlParser: true, useUnifiedTopology: true}).then(() => {
    console.log('Connected');
    app.listen(5001);
}).catch(err => {
    console.log(err);
});