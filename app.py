import os
import csv
import random
from flask import Flask, render_template, request, jsonify
from datetime import datetime

app = Flask(__name__)

# Configuration
CAPTCHA_FOLDER = './static/dataset'
OUTPUT_CSV = 'captcha_interactions.csv'

class CaptchaManager:
    def __init__(self, captcha_folder):
        self.captcha_folder = captcha_folder
        self.captchas = self.load_captchas()
        
        # Ensure CSV has headers if it doesn't exist
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
        """Load all captcha images from the folder."""
        return [f for f in os.listdir(self.captcha_folder) if f.endswith(('.png', '.jpg', '.jpeg'))]
    
    def get_random_captcha(self):
        """Select a random captcha from the dataset."""
        return random.choice(self.captchas)
    
    def validate_captcha(self, filename, user_input):
        """Validate if user input matches the captcha filename (without extension)."""
        expected = os.path.splitext(filename)[0]
        return user_input.lower() == expected.lower()
    
    def save_interaction(self, data):
        """Save interaction data to CSV."""
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
    """Initial mode selection page"""
    return render_template('mode_selection.html')

@app.route('/start_collection', methods=['POST'])
def start_collection():
    """Start collection with selected mode"""
    mode = request.form.get('mode')
    if not mode:
        return render_template('mode_selection.html', error="Please select a mode")
    
    # Create a unique collection ID
    collection_id = datetime.now().strftime("%Y%m%d%H%M%S%f")

    if mode == 'bot': return render_template('predict.html', 
                           mode=mode, 
                           collection_id=collection_id,
                           captcha=captcha_manager.get_random_captcha())

    else:
        return render_template('captcha.html', 
                               mode=mode, 
                               collection_id=collection_id,
                               captcha=captcha_manager.get_random_captcha())


@app.route('/verify', methods=['POST'])
def verify_captcha():
    """Verify captcha and save interaction"""
    data = request.json
    
    # Validate required fields
    required_fields = [
        'collection_id', 'mode', 'captcha_image', 'response', 
        'time_taken', 'attempts', 'key_presses', 
        'backspace_presses', 'mouse_movements'
    ]
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing {field}'}), 400
    
    # Check if skipped
    if data.get('is_skipped', False):
        return jsonify({
            'correct': False,
            'message': 'Captcha Skipped'
        })
    
    # Check correctness
    is_correct = captcha_manager.validate_captcha(
        data['captcha_image'], 
        data['response']
    )
    
    # Prepare interaction data
    interaction_data = {
        'collection_id': data['collection_id'],
        'captcha_image': data['captcha_image'],
        'response': data['response'],
        'time_taken': data['time_taken'],
        'is_correct': is_correct,
        'attempts': data['attempts'],
        'key_presses': data['key_presses'],
        'backspace_presses': data['backspace_presses'],
        'mouse_movements': str(data['mouse_movements']),
        'mode': data['mode']
    }
    
    # Save interaction only for non-skipped CAPTCHAs
    captcha_manager.save_interaction(interaction_data)
    
    return jsonify({
        'correct': is_correct,
        'message': 'Captcha verified successfully!' if is_correct else 'Incorrect captcha. Try again.'
    })

@app.route('/predict', methods=['POST'])
def predict():
    """Handle bot or test mode submission (predict.html)"""
    data = request.json
    
    # You can either reuse the verify_captcha logic or just print here
    if not data:
        return jsonify({'error': 'No data received'}), 400

    print("=== BOT/TEST MODE SUBMISSION ===")
    for key, value in data.items():
        print(f"{key}: {value}")
    print("=== END SUBMISSION ===")

    return jsonify({
        'correct': True,
        'message': 'Bot/test mode submission received!'
    })


if __name__ == '__main__':
    app.run(debug=True)