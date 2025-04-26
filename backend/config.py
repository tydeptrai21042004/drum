import datetime

class Config:
    SECRET_KEY = '12345'  # replace in prod
    MONGO_URI = "mongodb://localhost:27017/mixer_db"
    JWT_EXPIRATION_HOURS = 2
