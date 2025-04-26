# backend/app.py
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
from functools import wraps
import random
import io
from fpdf import FPDF  # For PDF export

app = Flask(__name__)
app.config['SECRET_KEY'] = '12345'  # Use a strong secret key in production
CORS(app)

# Connect to MongoDB (adjust connection string as needed)
client = MongoClient("mongodb://localhost:27017/")
db = client["mixer_db"]

# --------------------------
# Decorators for Authentication with Debug Info
# --------------------------
from bson import ObjectId  # Add this import at the top

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('x-access-token')
        if not token:
            print("DEBUG: No token provided in headers.")
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            print("DEBUG: Received token:", token)
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            print("DEBUG: Decoded token data:", data)
            # Convert token's user_id to an ObjectId for the database query
            current_user = db.users.find_one({"_id": ObjectId(data['user_id'])})
            if not current_user:
                print("DEBUG: No user found for token data:", data)
                return jsonify({'message': 'User not found!'}), 401
            kwargs['current_user'] = current_user
        except Exception as e:
            print("DEBUG: Token decode error in token_required:", e)
            print("DEBUG: Received token causing error:", token)
            return jsonify({'message': 'Token is invalid!'}), 401
        return f(*args, **kwargs)
    return decorated


def user_required(f):
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        current_user = kwargs.get('current_user')
        if current_user.get('role', 'user') != 'user':
            print("DEBUG: Only regular users can access this endpoint. Current role:", current_user.get('role', 'user'))
            return jsonify({'message': 'Only regular users can access this endpoint'}), 403
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        current_user = kwargs.get('current_user')
        if current_user.get('role', 'user') != 'admin':
            print("DEBUG: Admin privilege required. Current user role:", current_user.get('role', 'user'))
            return jsonify({'message': 'Admin privilege required'}), 403
        return f(*args, **kwargs)
    return decorated

# --------------------------
# 1. User Registration
# --------------------------
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Missing required fields'}), 400

    if db.users.find_one({'email': data['email']}):
        return jsonify({'message': 'Email already exists'}), 400

    hashed_password = generate_password_hash(data['password'], method='pbkdf2:sha256')
    user = {
        'email': data['email'],
        'password': hashed_password,
        'role': 'user',  # default role
        'created_at': datetime.datetime.utcnow()
    }
    result = db.users.insert_one(user)
    return jsonify({'message': 'Registration successful!', 'user_id': str(result.inserted_id)}), 201

# --------------------------
# 2. User Login
# --------------------------
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Missing required fields'}), 400

    user = db.users.find_one({'email': data['email']})
    if not user or not check_password_hash(user['password'], data['password']):
        return jsonify({'message': 'Invalid email or password'}), 401

    token = jwt.encode({
        'user_id': str(user['_id']),
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=2)
    }, app.config['SECRET_KEY'], algorithm="HS256")
    
    # Ensure token is a string
    if isinstance(token, bytes):
        token = token.decode('utf-8')
    print("DEBUG: Generated token for login:", token)
    
    # Return token along with user details
# in /api/login
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': {
            '_id': str(user['_id']),
            'email': user['email'],
            'role': user.get('role', 'user')
        }
    }), 200




# --------------------------
# 3. User Logout (Client-side removal of token)
# --------------------------
@app.route('/api/logout', methods=['POST'])
@token_required
def logout(**kwargs):
    return jsonify({'message': 'Logout successful! Please remove your token on client side.'}), 200

# --------------------------
# 4. Create Workspace (Regular Users Only)
# --------------------------
from bson import ObjectId

def get_member_details(member_ids):
    if not member_ids:
        return []
    
    # Convert all member IDs to ObjectId safely
    object_ids = []
    for uid in member_ids:
        try:
            object_ids.append(ObjectId(uid))
        except Exception as e:
            print(f"DEBUG: Invalid ObjectId in members: {uid} | Error: {e}")

    print("DEBUG: Converted member IDs to ObjectIds:", object_ids)

    members = list(db.users.find({'_id': {'$in': object_ids}}))
    for member in members:
        member['_id'] = str(member['_id'])  # Convert back to string for JSON
    print("DEBUG: Retrieved member details:", members)
    return members


# --------------------------
# 4. Create Workspace (Regular Users Only)
# --------------------------
@app.route('/api/workspace/create', methods=['POST'])
@user_required
def create_workspace(current_user):
    data = request.get_json()
    workspace_code = str(random.randint(100000, 999999))
    workspace = {
        'name': data.get('name', 'Untitled Workspace'),
        'code': workspace_code,
        'owner': str(current_user['_id']),
        'members': [str(current_user['_id'])],
        'created_at': datetime.datetime.utcnow()
    }
    print("DEBUG: Creating workspace with data:", workspace)
    result = db.workspaces.insert_one(workspace)
    workspace['_id'] = str(result.inserted_id)
    workspace['created_at'] = workspace['created_at'].isoformat()
    # Look up full member details for the created workspace
    workspace['members'] = get_member_details(workspace['members'])
    print("DEBUG: Created workspace:", workspace)
    return jsonify({'message': 'Workspace created', 'workspace': workspace}), 201

# --------------------------
# 5. Join Workspace by Code (Regular Users Only)
# --------------------------
@app.route('/api/workspace/join', methods=['POST'])
@user_required
def join_workspace(current_user):
    data = request.get_json()
    if not data or not data.get('code'):
        print("DEBUG: No workspace code provided in join request.")
        return jsonify({'message': 'Workspace code is required'}), 400

    workspace = db.workspaces.find_one({'code': data['code']})
    if not workspace:
        print("DEBUG: Workspace with code", data['code'], "not found.")
        return jsonify({'message': 'Workspace not found'}), 404

    if str(current_user['_id']) in workspace.get('members', []):
        print("DEBUG: User already a member:", current_user['_id'])
        return jsonify({'message': 'Already a member'}), 400

    db.workspaces.update_one(
        {'code': data['code']},
        {'$push': {'members': str(current_user['_id'])}}
    )
    print("DEBUG: User", current_user['_id'], "joined workspace with code", data['code'])
    # Re-fetch the updated workspace
    workspace = db.workspaces.find_one({'code': data['code']})
    workspace['_id'] = str(workspace['_id'])
    if 'created_at' in workspace:
        workspace['created_at'] = workspace['created_at'].isoformat()
    # Replace the members list with detailed user objects
    workspace['members'] = get_member_details(workspace['members'])
    print("DEBUG: Updated workspace after join:", workspace)
    return jsonify({'message': 'Joined workspace successfully', 'workspace': workspace}), 200

# --------------------------
# 6. Leave Workspace (Regular Users Only)
# --------------------------
@app.route('/api/workspace/leave', methods=['POST'])
@user_required
def leave_workspace(current_user):
    data = request.get_json()
    if not data or not data.get('workspace_id'):
        print("DEBUG: Workspace ID not provided for leave request.")
        return jsonify({'message': 'Workspace ID required'}), 400

    workspace = db.workspaces.find_one({'_id': data['workspace_id']})
    if not workspace:
        print("DEBUG: Workspace with ID", data['workspace_id'], "not found.")
        return jsonify({'message': 'Workspace not found'}), 404

    if workspace.get('owner') == str(current_user['_id']):
        print("DEBUG: Owner", current_user['_id'], "attempted to leave their own workspace.")
        return jsonify({'message': 'Owner cannot leave workspace. Consider deleting it or transferring ownership.'}), 400

    db.workspaces.update_one(
        {'_id': data['workspace_id']},
        {'$pull': {'members': str(current_user['_id'])}}
    )
    print("DEBUG: User", current_user['_id'], "left workspace", data['workspace_id'])
    return jsonify({'message': 'Left workspace successfully'}), 200

# --------------------------
# 7. Delete Workspace (Only Owner can delete)
# --------------------------
@app.route('/api/workspace/delete', methods=['DELETE'])
@user_required
def delete_workspace(current_user):
    data = request.get_json()
    if not data or not data.get('workspace_id'):
        print("DEBUG: Workspace ID not provided for delete request.")
        return jsonify({'message': 'Workspace ID required'}), 400

    workspace = db.workspaces.find_one({'_id': data['workspace_id']})
    if not workspace:
        print("DEBUG: Workspace with ID", data['workspace_id'], "not found for deletion.")
        return jsonify({'message': 'Workspace not found'}), 404

    if workspace.get('owner') != str(current_user['_id']):
        print("DEBUG: User", current_user['_id'], "is not owner and cannot delete workspace.")
        return jsonify({'message': 'Only owner can delete the workspace'}), 403

    db.workspaces.delete_one({'_id': data['workspace_id']})
    db.calculations.delete_many({'workspace_id': data['workspace_id']})
    db.chats.delete_many({'workspace_id': data['workspace_id']})
    print("DEBUG: Workspace", data['workspace_id'], "deleted by owner", current_user['_id'])
    return jsonify({'message': 'Workspace deleted successfully'}), 200

# --------------------------
# 8. List Workspaces Joined by the User
# --------------------------
@app.route('/api/workspace/list', methods=['GET'])
@user_required
def list_workspaces(current_user):
    user_id = str(current_user['_id'])
    workspaces_cursor = db.workspaces.find({'members': user_id})
    workspaces = []
    for ws in workspaces_cursor:
        ws['_id'] = str(ws['_id'])
        if 'created_at' in ws:
            ws['created_at'] = ws['created_at'].isoformat()
        # Replace members list with full details
        ws['members'] = get_member_details(ws.get('members', []))
        workspaces.append(ws)
    print("DEBUG: Listing workspaces for user", user_id, ":", workspaces)
    return jsonify({'workspaces': workspaces}), 200
@app.route('/api/workspace/detail/<code>', methods=['GET'])
@user_required
def workspace_detail(current_user, code):
    ws = db.workspaces.find_one({'code': code})
    if not ws:
        return jsonify({'message': 'Workspace not found'}), 404

    user_id = str(current_user['_id'])
    if user_id not in ws.get('members', []):
        return jsonify({'message': 'Access denied'}), 403

    # Convert types
    ws['_id'] = str(ws['_id'])
    ws['created_at'] = ws['created_at'].isoformat()

    # Only return safe member fields
    object_ids = [ObjectId(uid) for uid in ws['members']]
    members = db.users.find({'_id': {'$in': object_ids}}, {'email': 1})
    ws['members'] = [{'_id': str(m['_id']), 'email': m['email']} for m in members]

    return jsonify({'workspace': ws}), 200

@app.route('/api/workspace/kick', methods=['POST'])
@user_required
def kick_member(current_user):
    data = request.get_json()
    workspace_id = data.get('workspace_id')
    member_id = data.get('member_id')

    if not workspace_id or not member_id:
        return jsonify({'message': 'workspace_id and member_id are required'}), 400

    # Fetch the workspace; ensure you convert the ID to ObjectId if necessary.
    try:
        workspace = db.workspaces.find_one({'_id': ObjectId(workspace_id)})
    except Exception as e:
        return jsonify({'message': 'Invalid workspace ID'}), 400

    if not workspace:
        return jsonify({'message': 'Workspace not found'}), 404

    # Only the owner can kick members.
    if workspace.get('owner') != str(current_user['_id']):
        return jsonify({'message': 'Only the workspace owner can kick members'}), 403

    # Check if the member is part of the workspace.
    if member_id not in workspace.get('members', []):
        return jsonify({'message': 'Member not found in workspace'}), 404

    # Prevent the owner from being kicked.
    if member_id == workspace.get('owner'):
        return jsonify({'message': 'Owner cannot be kicked'}), 400

    # Remove the member from the workspace.
    db.workspaces.update_one(
        {'_id': ObjectId(workspace_id)},
        {'$pull': {'members': member_id}}
    )

    return jsonify({'message': 'Member kicked successfully'}), 200
# --------------------------
# 8. Input Parameters & Calculation (Regular Users Only)
# --------------------------
@app.route('/api/calculate', methods=['POST'])
@user_required
def calculate(current_user):
    data = request.get_json()
    try:
        a = float(data.get('a', 0))
        b = float(data.get('b', 0))
        result = a + b  # Replace with your actual calculation logic
        calc_entry = {
            'user_id': str(current_user['_id']),
            'workspace_id': data.get('workspace_id'),
            'parameters': data,
            'result': result,
            'status': 'completed',
            'created_at': datetime.datetime.utcnow()
        }
        db.calculations.insert_one(calc_entry)
        return jsonify({'message': 'Calculation successful', 'result': result}), 200
    except Exception as e:
        print("DEBUG: Calculation error:", e)
        return jsonify({'message': 'Calculation error', 'error': str(e)}), 400

# --------------------------
# 9. Export to PDF (Regular Users Only)
# --------------------------
@app.route('/api/export_pdf', methods=['GET'])
@user_required
def export_pdf(current_user):
    calc_id = request.args.get('calc_id')
    if not calc_id:
        return jsonify({'message': 'Calculation ID required'}), 400
    calculation = db.calculations.find_one({'_id': calc_id})
    if not calculation:
        return jsonify({'message': 'Calculation not found'}), 404

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    pdf.cell(200, 10, txt="Calculation Result", ln=True, align='C')
    pdf.cell(200, 10, txt=f"Parameters: {calculation.get('parameters')}", ln=True)
    pdf.cell(200, 10, txt=f"Result: {calculation.get('result')}", ln=True)
    
    pdf_buffer = io.BytesIO()
    pdf.output(pdf_buffer)
    pdf_buffer.seek(0)
    return send_file(pdf_buffer, as_attachment=True, download_name="calculation.pdf", mimetype='application/pdf')

# --------------------------
# 10. View Calculation History (Regular Users Only)
# --------------------------
@app.route('/api/history', methods=['GET'])
@user_required
def history(current_user):
    history_cursor = db.calculations.find({'user_id': str(current_user['_id'])})
    history_list = []
    for h in history_cursor:
        h['_id'] = str(h['_id'])
        history_list.append(h)
    return jsonify({'history': history_list}), 200

# --------------------------
# 11. Chat – Direct Messaging (Regular Users Only)
#    Chat is defined by user (direct message) rather than by workspace.
# --------------------------
@app.route('/api/chat/send', methods=['POST'])
@user_required
def send_chat(current_user):
    data = request.get_json()
    # For non-admin users, override receiver_id to 'admin' if not provided
    if current_user.get('role') != 'admin':
        data['receiver_id'] = 'admin'
    if not data or not data.get('receiver_id') or not data.get('message'):
        return jsonify({'message': 'Receiver and message required'}), 400
    chat_msg = {
        'sender': str(current_user['_id']),
        'receiver': data['receiver_id'],
        'message': data['message'],
        'timestamp': datetime.datetime.utcnow()
    }
    db.chats.insert_one(chat_msg)
    return jsonify({'message': 'Message sent'}), 200

@app.route('/api/chat/admin', methods=['GET'])
@admin_required
def get_all_user_chats(current_user):
    messages = list(db.chats.find({
        '$or': [
            {'receiver': 'admin'},
            {'sender': 'admin'}
        ]
    }).sort('timestamp', 1))
    
    # Enrich messages with sender (and optionally receiver) details
    for m in messages:
        m['_id'] = str(m['_id'])
        sender_doc = db.users.find_one({'_id': m['sender']})
        m['sender_email'] = sender_doc.get('email') if sender_doc else 'Unknown'
    return jsonify({'messages': messages}), 200

@app.route('/api/chat/<other_user_id>', methods=['GET'])
@user_required
def get_chat(current_user, other_user_id):
    print("DEBUG: In get_chat, other_user_id:", other_user_id)
    messages = list(db.chats.find({
        '$or': [
            {'sender': str(current_user['_id']), 'receiver': other_user_id},
            {'sender': other_user_id, 'receiver': str(current_user['_id'])}
        ]
    }).sort('timestamp', 1))
    
    for m in messages:
        m['_id'] = str(m['_id'])
        # Look up sender details
        sender_doc = db.users.find_one({'_id': m['sender']})
        if sender_doc:
            m['sender_email'] = sender_doc.get('email')
        else:
            m['sender_email'] = 'Unknown'
        # Look up receiver details
        receiver_doc = db.users.find_one({'_id': m['receiver']})
        if receiver_doc:
            m['receiver_email'] = receiver_doc.get('email')
        else:
            m['receiver_email'] = 'Unknown'
    print("DEBUG: In get_chat, retrieved messages:", messages)
    return jsonify({'messages': messages}), 200
@app.route('/api/chat/admin/direct/send', methods=['POST'])
@admin_required
def admin_send_direct_chats(current_user):
    data = request.get_json()
    if not data or not data.get('receiver_id') or not data.get('message'):
        return jsonify({'message': 'Receiver and message required'}), 400

    # Set sender explicitly to "admin" for clarity in the direct chat fetch
    chat_msg = {
        'chat_type': 'direct',
        'sender': 'admin',  # Use a literal string "admin" here
        'receiver': data['receiver_id'],
        'message': data['message'],
        'timestamp': datetime.datetime.utcnow()
    }
    print("DEBUG: In admin_send_direct_chat, inserting message:", chat_msg)
    db.chats.insert_one(chat_msg)
    return jsonify({'message': 'Direct reply sent from admin'}), 200


@app.route('/api/chat/direct/send', methods=['POST'])
@user_required
def send_direct_chat(current_user):
    data = request.get_json()
    if not data or not data.get('message'):
        return jsonify({'message': 'Message required'}), 400

    # For non-admin users, force the receiver to be 'admin'
    if current_user.get('role') != 'admin':
        receiver_id = 'admin'
    else:
        # For admin users, require a receiver_id (the user to chat with)
        if not data.get('receiver_id'):
            return jsonify({'message': 'Receiver id required for admin'}), 400
        receiver_id = data.get('receiver_id')

    chat_msg = {
        'chat_type': 'direct',
        'sender': str(current_user['_id']),
        'receiver': receiver_id,
        'message': data['message'],
        'timestamp': datetime.datetime.utcnow()
    }
    print("DEBUG: In send_direct_chat, inserting message:", chat_msg)
    db.chats.insert_one(chat_msg)
    return jsonify({'message': 'Direct message sent'}), 200


# New route for admin to send direct replies to users
@app.route('/api/admin/chats', methods=['POST'])
@admin_required
def admin_send_direct_chat(current_user):
    data = request.get_json()
    if not data or not data.get('receiver_id') or not data.get('message'):
        return jsonify({'message': 'Receiver and message required'}), 400
    chat_msg = {
        'chat_type': 'direct',
        'sender': str(current_user['_id']),
        'receiver': data['receiver_id'],
        'message': data['message'],
        'timestamp': datetime.datetime.utcnow()
    }
    print("DEBUG: In admin_send_direct_chat, inserting message:", chat_msg)
    db.chats.insert_one(chat_msg)
    return jsonify({'message': 'Direct reply sent from admin'}), 200
@app.route('/api/admin/chats', methods=['GET'])
@admin_required
def get_admin_chats(current_user):
    # Retrieve all direct chats (or filter as needed)
    messages = list(db.chats.find({'chat_type': 'direct'}).sort('timestamp', -1))
    for m in messages:
        m['_id'] = str(m['_id'])
        # Enrich with sender details if not admin
        if m['sender'] != 'admin':
            sender_doc = db.users.find_one({'_id': ObjectId(m['sender'])})
            m['sender_email'] = sender_doc.get('email') if sender_doc else 'Unknown'
        else:
            m['sender_email'] = 'admin'
    return jsonify({'chats': messages}), 200

@app.route('/api/chat/direct', methods=['GET'])
@user_required
def get_direct_chat(current_user):
    # If not admin, always retrieve the conversation with admin
    if current_user.get('role') != 'admin':
        messages = list(db.chats.find({
            'chat_type': 'direct',
            '$or': [
                {'sender': str(current_user['_id']), 'receiver': 'admin'},
                {'sender': 'admin', 'receiver': str(current_user['_id'])}
            ]
        }).sort('timestamp', 1))
    else:
        # For admin, require a user_id query parameter
        other_user_id = request.args.get('user_id')
        if not other_user_id:
            return jsonify({'message': 'user_id query parameter required for admin'}), 400
        messages = list(db.chats.find({
            'chat_type': 'direct',
            '$or': [
                {'sender': str(current_user['_id']), 'receiver': other_user_id},
                {'sender': other_user_id, 'receiver': str(current_user['_id'])}
            ]
        }).sort('timestamp', 1))
    
    for m in messages:
        m['_id'] = str(m['_id'])
        # If sender is not 'admin', look up user details; otherwise, use static info
        if m['sender'] != 'admin':
            sender_doc = db.users.find_one({'_id': ObjectId(m['sender'])})
            m['sender_email'] = sender_doc.get('email') if sender_doc else 'Unknown'
        else:
            m['sender_email'] = 'admin'
    print("DEBUG: In get_direct_chat, retrieved messages:", messages)
    return jsonify({'messages': messages}), 200

# --------------------------
# 12. Chat – Submit Proposal for Design Changes (Regular Users Only)
# --------------------------
@app.route('/api/chat/propose', methods=['POST'])
@user_required
def propose_design(current_user):
    data = request.get_json()
    print("DEBUG: In propose_design, received data:", data)
    if not data or not data.get('proposal'):
        return jsonify({'message': 'Proposal required'}), 400
    # Optionally, you could include a receiver_id if proposals are meant for a specific admin/user
    proposal = {
        'sender': str(current_user['_id']),
        'proposal': data['proposal'],
        'status': 'pending',
        'timestamp': datetime.datetime.utcnow()
    }
    print("DEBUG: In propose_design, inserting proposal:", proposal)
    db.proposals.insert_one(proposal)
    return jsonify({'message': 'Proposal submitted'}), 200

# Endpoints for admin to approve or reject proposals remain unchanged
@app.route('/api/chat/proposals', methods=['GET'])
@admin_required
def get_proposals(current_user):
    proposals = list(db.proposals.find({'status': 'pending'}).sort('timestamp', 1))
    for p in proposals:
        p['_id'] = str(p['_id'])
    return jsonify({'proposals': proposals}), 200

@app.route('/api/chat/proposals/<proposal_id>/approve', methods=['POST'])
@admin_required
def approve_proposal(current_user, proposal_id):
    db.proposals.update_one({'_id': proposal_id}, {'$set': {'status': 'approved'}})
    return jsonify({'message': 'Proposal approved'}), 200

@app.route('/api/chat/proposals/<proposal_id>/reject', methods=['POST'])
@admin_required
def reject_proposal(current_user, proposal_id):
    db.proposals.update_one({'_id': proposal_id}, {'$set': {'status': 'rejected'}})
    return jsonify({'message': 'Proposal rejected'}), 200
# Direct Chat – Send Message (for direct messaging between two users)
# For regular users sending direct messages to admin

# Workspace Chat – Send Message (for all members in a workspace)
@app.route('/api/workspace/chat/send', methods=['POST'])
@user_required
def send_workspace_chat(current_user):
    data = request.get_json()
    if not data or not data.get('workspace_id') or not data.get('message'):
        return jsonify({'message': 'Workspace and message required'}), 400
    chat_msg = {
        'chat_type': 'workspace',
        'workspace_id': data['workspace_id'],
        'sender': str(current_user['_id']),
        'message': data['message'],
        'timestamp': datetime.datetime.utcnow()
    }
    print("DEBUG: In send_workspace_chat, inserting message:", chat_msg)
    db.chats.insert_one(chat_msg)
    return jsonify({'message': 'Workspace chat message sent'}), 200
@app.route('/api/admin/workspaces', methods=['GET'])
@admin_required  # or use @user_required with proper admin check inside
def admin_list_workspaces(current_user):
    # Optionally check if current_user has admin role
    workspaces_cursor = db.workspaces.find({})
    workspaces = []
    for ws in workspaces_cursor:
        ws['_id'] = str(ws['_id'])
        if 'created_at' in ws:
            ws['created_at'] = ws['created_at'].isoformat()
        workspaces.append(ws)
    return jsonify({'workspaces': workspaces}), 200

# Workspace Chat – Retrieve Messages for a workspace
@app.route('/api/workspace/chat/<workspace_id>', methods=['GET'])
@user_required
def get_workspace_chat(current_user, workspace_id):
    messages = list(db.chats.find({
        'chat_type': 'workspace',
        'workspace_id': workspace_id
    }).sort('timestamp', 1))
    for m in messages:
        m['_id'] = str(m['_id'])
        sender_doc = db.users.find_one({'_id': ObjectId(m['sender'])})
        m['sender_email'] = sender_doc.get('email') if sender_doc else 'Unknown'
    print("DEBUG: In get_workspace_chat, retrieved messages:", messages)
    return jsonify({'messages': messages}), 200

# --------------------------
# 13. View Catalog Items (Regular Users Only)
# --------------------------
@app.route('/api/catalog', methods=['GET'])
@user_required
def view_catalog(current_user):
    catalog_items = list(db.catalog.find())
    for item in catalog_items:
        item['_id'] = str(item['_id'])
    return jsonify({'catalog': catalog_items}), 200

# --------------------------
# 14. Add User (Admin Only)
# --------------------------
@app.route('/api/admin/add_user', methods=['POST'])
@admin_required
def admin_add_user(current_user):
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Email and password required'}), 400
    if db.users.find_one({'email': data['email']}):
        return jsonify({'message': 'Email already exists'}), 400
    hashed_password = generate_password_hash(data['password'], method='pbkdf2:sha256')
    user = {
        'email': data['email'],
        'password': hashed_password,
        'role': data.get('role', 'user'),
        'created_at': datetime.datetime.utcnow()
    }
    result = db.users.insert_one(user)
    return jsonify({'message': 'User added successfully', 'user_id': str(result.inserted_id)}), 201

# --------------------------
# 15. Delete User (Admin Only)
# --------------------------
@app.route('/api/admin/user/delete', methods=['DELETE'])
@admin_required
def admin_delete_user(current_user):
    data = request.get_json()
    if not data or not data.get('user_id'):
        return jsonify({'message': 'User ID required'}), 400
    db.users.delete_one({'_id': data['user_id']})
    return jsonify({'message': 'User deleted successfully'}), 200

# --------------------------
# 16. Create Catalog Folder (Admin Only)
# --------------------------
@app.route('/api/admin/catalog/folder/create', methods=['POST'])
@admin_required
def create_catalog_folder(current_user):
    data = request.get_json()
    if not data or not data.get('folder_name'):
        return jsonify({'message': 'Folder name required'}), 400
    if db.catalog_folders.find_one({'folder_name': data['folder_name']}):
        return jsonify({'message': 'Folder already exists'}), 400
    folder = {
        'folder_name': data['folder_name'],
        'created_at': datetime.datetime.utcnow()
    }
    result = db.catalog_folders.insert_one(folder)
    return jsonify({'message': 'Folder created', 'folder_id': str(result.inserted_id)}), 201

# --------------------------
# 17. Delete Catalog Folder (Admin Only)
# --------------------------
@app.route('/api/admin/catalog/folder/delete', methods=['DELETE'])
@admin_required
def delete_catalog_folder(current_user):
    data = request.get_json()
    if not data or not data.get('folder_id'):
        return jsonify({'message': 'Folder ID required'}), 400
    db.catalog_folders.delete_one({'_id': data['folder_id']})
    return jsonify({'message': 'Folder deleted'}), 200

# --------------------------
# 18. Edit Catalog Folder (Admin Only)
# --------------------------
@app.route('/api/admin/catalog/folder/edit', methods=['PUT'])
@admin_required
def edit_catalog_folder(current_user):
    data = request.get_json()
    if not data or not data.get('folder_id') or not data.get('new_name'):
        return jsonify({'message': 'Folder ID and new name required'}), 400
    db.catalog_folders.update_one(
        {'_id': data['folder_id']},
        {'$set': {'folder_name': data['new_name']}}
    )
    return jsonify({'message': 'Folder updated successfully'}), 200

# --------------------------
# Admin Seed Endpoint (Create Admin Account)
# --------------------------
@app.route('/api/seed_admin', methods=['POST'])
def seed_admin():
    seed_key = request.headers.get('x-seed-key')
    if seed_key != "admin_creation_secret":
        return jsonify({'message': 'Not authorized to seed admin account'}), 403

    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Missing required fields'}), 400

    if db.users.find_one({'email': data['email']}):
        return jsonify({'message': 'An account with that email already exists'}), 400

    hashed_password = generate_password_hash(data['password'], method='pbkdf2:sha256')
    admin_user = {
        'email': data['email'],
        'password': hashed_password,
        'role': 'admin',
        'created_at': datetime.datetime.utcnow()
    }
    result = db.users.insert_one(admin_user)
    return jsonify({'message': 'Admin account created successfully!', 'user_id': str(result.inserted_id)}), 201
@app.route('/api/admin/users', methods=['GET'])
@admin_required
def get_all_users(current_user):
    # Fetch all users from the database
    users = list(db.users.find())
    # Convert each user's _id to string for JSON serialization
    for user in users:
        user['_id'] = str(user['_id'])
    return jsonify({'users': users}), 200
@app.route('/api/get_efficiency', methods=['GET'])
def get_efficiency():
    # Dummy efficiency data
    data = [
        {
            "TenGoi": "Bộ truyền bánh răng trụ",
            "HieuSuatDuoccheMin": 0.9,
            "HieuSuatDuoccheMax": 0.95,
            "HieuSuatDeHoMin": 0.85,
            "HieuSuatDeHoMax": 0.9
        },
        {
            "TenGoi": "Bộ truyền bánh răng côn",
            "HieuSuatDuoccheMin": 0.88,
            "HieuSuatDuoccheMax": 0.93,
            "HieuSuatDeHoMin": 0.84,
            "HieuSuatDeHoMax": 0.89
        },
        {
            "TenGoi": "Bộ truyền xích",
            "HieuSuatDuoccheMin": 0.86,
            "HieuSuatDuoccheMax": 0.92,
            "HieuSuatDeHoMin": 0.82,
            "HieuSuatDeHoMax": 0.87
        },
        {
            "TenGoi": "Một cặp ổ lăn",
            "HieuSuatDuoccheMin": 0.95,
            "HieuSuatDuoccheMax": 0.98,
            "HieuSuatDeHoMin": 0.93,
            "HieuSuatDeHoMax": 0.96
        }
    ]
    return jsonify({"success": True, "data": data})

@app.route('/api/getTransmissionRatios', methods=['GET'])
def get_transmission_ratios():
    # Dummy transmission ratios data
    data = [
        {
            "LoaiTruyen": "Truyền động bánh răng côn Hộp giảm tốc côn - trụ 2 cấp",
            "TisoTruyenMin": 1.5,
            "TisoTruyenMax": 2.5
        },
        {
            "LoaiTruyen": "Truyền động Xích",
            "TisoTruyenMin": 0.8,
            "TisoTruyenMax": 1.2
        }
    ]
    return jsonify({"success": True, "data": data})

@app.route('/api/getEngineData', methods=['GET'])
def get_engine_data():
    # Dummy engine data
    engines = [
        {
            "id": "engine1",
            "kieu_dong_co": "Động cơ A",
            "cong_suat_kw": 100,
            "van_toc_50Hz": 1500,
            "hieu_suat": 0.95
        },
        {
            "id": "engine2",
            "kieu_dong_co": "Động cơ B",
            "cong_suat_kw": 150,
            "van_toc_50Hz": 1450,
            "hieu_suat": 0.93
        }
    ]
    return jsonify({"success": True, "engines": engines})

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0")
