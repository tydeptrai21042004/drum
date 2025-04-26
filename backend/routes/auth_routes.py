from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
import jwt, datetime
from extensions import mongo
from utils.mongo import to_obj_id, stringify_id

bp = Blueprint('auth', __name__, url_prefix='/api')

@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    if not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Missing fields'}), 400
    if mongo.db.users.find_one({'email': data['email']}):
        return jsonify({'message': 'Email exists'}), 400

    user = {
        'email': data['email'],
        'password': generate_password_hash(data['password']),
        'role': 'user',
        'created_at': datetime.datetime.utcnow()
    }
    res = mongo.db.users.insert_one(user)
    return jsonify({'message':'Registered','user_id':str(res.inserted_id)}), 201

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    user = mongo.db.users.find_one({'email': data.get('email')})
    if not user or not check_password_hash(user['password'], data.get('password','')):
        return jsonify({'message':'Invalid credentials'}), 401

    token = jwt.encode({
        'user_id': str(user['_id']),
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=current_app.config['JWT_EXPIRATION_HOURS'])
    }, current_app.config['SECRET_KEY'], algorithm="HS256")
    return jsonify({
        'message':'Login successful',
        'token': token,
        'user': stringify_id(user)
    }), 200

@bp.route('/logout', methods=['POST'])
@token_required
def logout(**kwargs):
    return jsonify({'message':'Logout successful'}), 200
