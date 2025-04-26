from bson import ObjectId
from extensions import mongo

db = mongo.db

def to_obj_id(id_str):
    try:
        return ObjectId(id_str)
    except:
        return None

def stringify_id(doc):
    doc['_id'] = str(doc['_id'])
    return doc
