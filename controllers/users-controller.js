const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');
const User = require('../models/user');

const getUsers = async (req, res, next) => {
    let allUsers;
    try {
        allUsers = await User.find({}, '-password');
    } catch (error) {
        return next(new HttpError('Error fething users, try again'), 500);
    }

    if (!allUsers || allUsers.length === 0) {
        return next(new HttpError('No users found'), 500);
    }
    res.json({ users: allUsers.map(user => user.toObject({ getters: true })) });
};

const signup = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return next(new HttpError('Invalid data received', 422));
    }
    const { name, email, password } = req.body;

    let existingUser;
    try {
        existingUser = await User.findOne({ email: email });
    } catch (error) {
        return next(new HttpError('Signup failed, try again later'), 500);
    }

    if (existingUser) {
        return next(new HttpError('Email already registered', 422));
    }

    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 12);
    } catch (err) {
        return next(new HttpError('Cannot create user', 500));
    };

    const newUser = new User({
        name,
        email,
        image: 'https://static.toiimg.com/thumb/resizemode-4,msid-76729750,imgsize-249247,width-720/76729750.jpg',
        password: hashedPassword,
        places: []
    });

    try {
        await newUser.save();
    } catch (error) {
        return next('Could not create user', 500);
    }

    let token;
    try {
        token = jwt.sign({ userId: newUser.id, email: newUser.email },
            process.env.JWT_KEY,
            { expiresIn: '1h' });
    } catch(err) {
        return next(new HttpError('Signup failed', 500));
    }

    res.status(201).json({ userId: newUser.id, email: newUser.email, token: token });
};

const login = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return next(new HttpError('Invalid data received', 422));
    }
    const { email, password } = req.body;

    let identifiedUser;
    try {
        identifiedUser = await User.findOne({ email: email });
    } catch (error) {
        return next(new HttpError('Email not found', 500));
    }

    if (!identifiedUser) {
        return next(new HttpError('Invalid password', 500));
    }

    let isValidPassword = false;
    try {
        isValidPassword = await bcrypt.compare(password, identifiedUser.password);
    } catch (err) {
        return next(new HttpError('Incorrect password', 500));
    }
    if (!isValidPassword) {
        return next(new HttpError('Invalid password', 500));
    }

    let token;
    try {
        token = jwt.sign({ userId: identifiedUser.id, email: identifiedUser.email },
            process.env.JWT_KEY,
            { expiresIn: '1h' });
    } catch(err) {
        return next(new HttpError('Login failed', 500));
    }

    res.json({ userId: identifiedUser.id, email: identifiedUser.email, token: token });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;