const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const getCoordsOfAddress = require('../utils/location');
const Place = require('../models/place');
const User = require('../models/user');

const getPlaceById = async (req, res, next) => {
    const placeId = req.params.pid;
    let place
    try {
        place = await Place.findById(placeId);
    } catch (error) {
        return next(new HttpError('Something went wrong', 500));
    }
    if (!place || place.length === 0) {
        return next(new HttpError('Could not find place against the entered id', 404));
    }
    res.json({ place: place.toObject({ getters: true }) });
};

const getPlaceByUserId = async (req, res, next) => {
    const userId = req.params.uid;
    let userplaces;
    try {
        userplaces = await User.findById(userId).populate('places');
    } catch(error) {
        return next(new HttpError('Something went wrong', 500));
    }
    if (!userplaces || userplaces.places.length === 0) {
        return next(new HttpError('Could not find place against the entered user id', 404));
    }
    res.json({ places: userplaces.places.map(place => place.toObject({ getters: true }))});
};

const createPlace = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        next(new HttpError('Invalid data received', 422));
    }
    const { title, description, address } = req.body;
    let coordinates;
    try {
        coordinates = await getCoordsOfAddress(address);
        console.log(coordinates);
    } catch (error) {
        return next(error);
    }


    const createdPlace = new Place({
        title,
        description,
        address,
        location: coordinates,
        creator: req.userData.userId,
        image: 'https://imganuncios.mitula.net/end_your_search_for_house_here_and_sale_now_1440076623501565834.jpg'
    });

    let user;
    try{
        user = await User.findById(req.userData.userId);
    } catch(error) {
        return next(new HttpError('Failed creating the place', 500));
    }

    if(!user) {
        return next(new HttpError('User does not exist', 500));
    }

    try {
        const session = await mongoose.startSession();
        session.startTransaction();
        await createdPlace.save({ session: session });
        user.places.push(createdPlace);
        await user.save({ session: session });
        await session.commitTransaction();
    } catch (err) {
        const error = new HttpError('Failed to create new place', 500);
        return next(error);
    }
    res.status(201).json({ place: createdPlace });
};

const updatePlaceById = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        throw new HttpError('Invalid data received', 422);
    }
    const { title, description } = req.body;
    const placeId = req.params.pid;

    let place;
    try{
        place = await Place.findById(placeId);
    } catch(error) {
        return next(new HttpError('Could not find place by id'), 500);
    }

    if(place.creator.toString() !== req.userData.userId) {
        return next(new HttpError('You are not allowed to update place', 401));
    }

    place.title = title;
    place.description = description;

    try{
        await place.save();
    } catch(error) {
        return next(new HttpError('Could not update place', 500));
    }

    res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlaceById = async (req, res, next) => {
    const placeId = req.params.pid;

    let place;
    try{
        place = await Place.findById(placeId).populate('creator');
    } catch(error) {
        return next(new HttpError('Could not find place id to delete', 500));
    }

    if(!place) {
        return next(new HttpError('Could not find the place for this id', 404));
    }

    if(place.creator.id !== req.userData.userId) {
        return next(new HttpError('You are not allowed to delete this place.', 401));
    }

    try{
        const session = await mongoose.startSession();
        session.startTransaction();
        await place.remove({ session });
        place.creator.places.pull(place);
        await place.creator.save({ session });
        await session.commitTransaction();
    } catch(error) {
        return next(new HttpError('Could not delete place', 500));
    }

    res.status(200).json({ message: "Place deleted successfully" });
};

exports.getPlaceById = getPlaceById;
exports.getPlaceByUserId = getPlaceByUserId;
exports.createPlace = createPlace;
exports.updatePlaceById = updatePlaceById;
exports.deletePlaceById = deletePlaceById;