import os
import csv
import random
from flask import Flask, render_template, request, jsonify
from datetime import datetime
import requests
import json 

app = Flask(__name__)

# Configuration
CAPTCHA_FOLDER = './static/dataset'
OUTPUT_CSV = 'captcha_interactions.csv'

class CaptchaManager:
    def __init__(self, captcha_folder):
        self.captcha_folder = captcha_folder
        self.captchas = self.load_captchas()

        if not os.path.exists(OUTPUT_CSV):
            with open(OUTPUT_CSV, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow([
                    'collection_id', 'captcha_image', 'response', 
                    'time_taken', 'is_correct', 'attempts', 
                    'key_presses', 'backspace_presses', 
                    'mouse_movements', 'mode'
                ])

    def load_captchas(self):
        return [f for f in os.listdir(self.captcha_folder) if f.endswith(('.png', '.jpg', '.jpeg'))]

    def get_random_captcha(self):
        return random.choice(self.captchas)

    def validate_captcha(self, filename, user_input):
        expected = os.path.splitext(filename)[0]
        return user_input.lower() == expected.lower()

    def save_interaction(self, data):
        with open(OUTPUT_CSV, 'a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                data['collection_id'],
                data['captcha_image'], 
                data['response'], 
                data['time_taken'], 
                data.get('is_correct', False), 
                data['attempts'], 
                data['key_presses'], 
                data['backspace_presses'], 
                data['mouse_movements'], 
                data['mode']
            ])

captcha_manager = CaptchaManager(CAPTCHA_FOLDER)

@app.route('/')
def mode_selection():
    return render_template('mode_selection.html')

@app.route('/start_collection', methods=['POST'])
def start_collection():
    mode = request.form.get('mode')
    if not mode:
        return render_template('mode_selection.html', error="Please select a mode")

    collection_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
    captcha = captcha_manager.get_random_captcha()

    if mode == 'bot':
        return render_template('predict.html', mode=mode, collection_id=collection_id, captcha=captcha)
    else:
        return render_template('captcha.html', mode=mode, collection_id=collection_id, captcha=captcha)

@app.route('/verify', methods=['POST'])
def verify_captcha():
    data = request.json
    required_fields = [
        'collection_id', 'mode', 'captcha_image', 'response', 
        'time_taken', 'attempts', 'key_presses', 
        'backspace_presses', 'mouse_movements'
    ]
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing {field}'}), 400

    if data.get('is_skipped', False):
        return jsonify({
            'correct': False,
            'message': 'Captcha Skipped'
        })

    is_correct = captcha_manager.validate_captcha(data['captcha_image'], data['response'])

    interaction_data = {
        'collection_id': data['collection_id'],
        'captcha_image': data['captcha_image'],
        'response': data['response'],
        'time_taken': data['time_taken'],
        'is_correct': is_correct,
        'attempts': data['attempts'],
        'key_presses': data['key_presses'],
        'backspace_presses': data['backspace_presses'],
        'mouse_movements': data['mouse_movements'],
        'mode': data['mode']
    }

    captcha_manager.save_interaction(interaction_data)

    return jsonify({
        'correct': is_correct,
        'message': 'Captcha verified successfully!' if is_correct else 'Incorrect captcha. Try again.'
    })

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    if not data:
        return jsonify({'error': 'No data received'}), 400

    print("=== BOT/TEST MODE SUBMISSION ===")
    for key, value in data.items():
        print(f"{key}: {value}")
    print("=== END SUBMISSION ===")

    try:
        payload = {
            "time_taken": round(data['time_taken'] / 1000, 2),  # ms to seconds
            "is_correct": 1 if data.get('is_correct', True) else 0,
            "attempts": data.get('attempts', 1),
            "key_presses": data.get('key_presses', 0),
            "backspace_presses": data.get('backspace_presses', 0),
            "mouse_movements": json.dumps(data.get('mouse_movements', []))
        }
        print(payload)
        response = requests.post("http://127.0.0.1:5000/is-bot", json=payload)
        print(response.text)
        bot_result = response.json()

        return jsonify({
            'correct': data.get('is_correct', True),
            'bot_prediction': bot_result.get('prediction', 'unknown'),
            'features': bot_result.get('features', {}),
            'mse': bot_result.get('mse', None),
            'message': 'Bot/test mode submission processed!'
        })

    except Exception as e:
        print(f"Error forwarding to /is-bot: {e}")
        return jsonify({'error': 'Failed to process bot prediction'}), 500

@app.route('/is-bot', methods=['POST'])
def is_bot():
    data = request.json
    prediction = "bot" if data['time_taken'] < 1 else "human"
    features = {
        "time_taken": data['time_taken'],
        "attempts": data['attempts'],
        "key_presses": data['key_presses'],
        "backspace_presses": data['backspace_presses'],
        "mouse_movements": data['mouse_movements']
    }
    return jsonify({
        "prediction": prediction,
        "features": features,
        "mse": 0.01
    })

if __name__ == '__main__':
    app.run(debug=True, port=5050)
