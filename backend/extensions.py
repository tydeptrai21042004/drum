from flask import Flask
from flask_cors import CORS
from flask_pymongo import PyMongo

mongo = PyMongo()

def init_app(app: Flask):
    app.config.from_object('config.Config')
    CORS(app)
    mongo.init_app(app)
