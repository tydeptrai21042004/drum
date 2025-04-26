import jwt
from functools import wraps
from flask import request, jsonify, current_app
from .mongo import db, to_obj_id

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('x-access-token')
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=["HS256"])
            user = db.users.find_one({'_id': to_obj_id(data['user_id'])})
            if not user:
                return jsonify({'message': 'User not found!'}), 401
            kwargs['current_user'] = user
        except Exception:
            return jsonify({'message': 'Token is invalid!'}), 401
        return f(*args, **kwargs)
    return decorated

def role_required(role):
    def decorator(f):
        @wraps(f)
        @token_required
        def wrapped(*args, **kwargs):
            user = kwargs.get('current_user', {})
            if user.get('role') != role:
                return jsonify({'message': f'{role.capitalize()} privilege required'}), 403
            return f(*args, **kwargs)
        return wrapped
    return decorator

user_required  = role_required('user')
admin_required = role_required('admin')
