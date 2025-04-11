from flask import Flask, request, jsonify
import numpy as np
import ast
from scipy.spatial.distance import euclidean
from tensorflow.keras.models import load_model
from tensorflow.keras.losses import MeanSquaredError
from tensorflow.keras.optimizers import Adam
import joblib
from tensorflow.keras import layers
import tensorflow as tf
from PIL import Image
import json
import io
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Constants
CHARACTERS = ['3', 'S', 'E', 'B', 'G', 'P', 'V', 'j', 'T', 'C', '9', 'F', 'm', 
              'a', '2', 'A', 'U', 'r', 'h', 'v', 'Z', 'z', 'w', 's', '1', 'R', 
              '4', 'Y', 'l', '6', 'k', 'O', 'I', 'u', 'N', 't', 'K', 'Q', 'M', 
              'W', 'X', 'D', 'd', 'b', '8', 'p', 'g', '5', 'y', 'f', 'L', 'q', 
              'J', 'n', 'i', 'x', 'c', 'H', 'e', '7']

IMG_WIDTH, IMG_HEIGHT = 150, 40

# StringLookup layers
char_to_num = layers.StringLookup(vocabulary=list(CHARACTERS),
                                  num_oov_indices=0,
                                  mask_token=None)

num_to_char = layers.StringLookup(vocabulary=char_to_num.get_vocabulary(), 
                                  mask_token=None, 
                                  num_oov_indices=0,
                                  invert=True)


# Load model
model = load_model("./lstm_autoencoder_model.h5", compile=False)
model.compile(optimizer=Adam(), loss=MeanSquaredError())
scaler = joblib.load("./scaler.save")
captcha_model = load_model('./captcha_model.h5', custom_objects={'StringLookup': char_to_num})
    
def preprocess_image_from_bytes(image_bytes):
    img = tf.io.decode_jpeg(image_bytes, channels=1)
    img = tf.image.convert_image_dtype(img, tf.float32)
    img = tf.image.resize(img, [IMG_HEIGHT, IMG_WIDTH])
    img = tf.transpose(img, perm=[1, 0, 2])
    img = tf.expand_dims(img, axis=0)
    return img

def decode_predictions(preds):
    output_text = []
    for i in range(preds.shape[1]):
        char_index = tf.argmax(preds[0][i])
        char = num_to_char(char_index)
        output_text.append(char)
    return tf.strings.reduce_join(output_text).numpy().decode("utf-8")


def compute_mouse_jitter(movement_array):
    """Calculate the standard deviation of distances between consecutive mouse movement points"""
    try:
        if isinstance(movement_array, str):
            points = ast.literal_eval(movement_array)
        else:
            points = movement_array
            
        distances = [euclidean(p1.values(), p2.values()) for p1, p2 in zip(points[:-1], points[1:])]
        return np.std(distances) if distances else 0
    except Exception as e:
        print(f"Error computing jitter: {e}")
        return 0

def calculate_mouse_distance(points):
    """Calculate the total distance traveled by the mouse"""
    points  = json.loads(points)
    total_distance = 0
    for i in range(len(points) - 1):
        p1 = points[i]
        p2 = points[i + 1]
        distance = euclidean([p1['x'], p1['y']], [p2['x'], p2['y']])
        total_distance += distance
    return total_distance

@app.route('/is-bot', methods=['POST'])
def predict():
    data = request.get_json()
    
    # Extract available features
    time_taken = data.get('time_taken', 0)
    is_correct = data.get('is_correct', 0)
    attempts = data.get('attempts', 0)
    key_presses = data.get('key_presses', 0)
    backspace_presses = data.get('backspace_presses', 0)
    mouse_movements = data.get('mouse_movements', [])
    
    # Calculate mouse points (number of mouse movement coordinates)
    mouse_points = len(mouse_movements)
    
    # Calculate mouse distance
    mouse_distance = calculate_mouse_distance(mouse_movements)
    
    # Calculate total key presses (including backspaces)
    total_key_presses = key_presses + backspace_presses
    
    # Compute mouse jitter
    mouse_jitter = compute_mouse_jitter(mouse_movements)
    
    # Compute engineered features (avoid division by zero)
    avg_key_interval = time_taken / max(total_key_presses, 1)
    mouse_density = mouse_distance / max(mouse_points, 1)
    time_per_attempt = time_taken / max(attempts, 1)
    time_per_key = time_taken / max(total_key_presses, 1)
    
    # Create feature vector (same order as in training)
    features = [
        time_taken,
        total_key_presses,  # Using total of key_presses + backspace_presses
        mouse_distance,
        mouse_points,
        attempts,
        avg_key_interval,
        mouse_density,
        time_per_attempt,
        time_per_key,
        mouse_jitter
    ]
    
    # Scale and reshape for LSTM input: (samples, timesteps, features)
    X_scaled = scaler.transform([features])
    X_reshaped = X_scaled.reshape((1, 1, len(features)))
    
    # Get reconstruction
    reconstruction = model.predict(X_reshaped, verbose=0)
    
    # Calculate mean squared error (MSE)
    mse = np.mean(np.mean(np.square(X_reshaped - reconstruction), axis=1), axis=1)[0]
    
    # Use threshold from training
    threshold = 100000
    
    prediction = 1 if mse < threshold else 0
    
    return jsonify({
        "prediction": "bot" if prediction == 1 else "human", 
        "mse": float(mse),
        "features": {
            "time_taken": time_taken,
            "key_presses": total_key_presses,
            "mouse_distance": float(mouse_distance),
            "mouse_points": mouse_points,
            "attempts": attempts,
            "avg_key_interval": float(avg_key_interval),
            "mouse_density": float(mouse_density),
            "time_per_attempt": float(time_per_attempt),
            "time_per_key": float(time_per_key),
            "mouse_jitter": float(mouse_jitter)
        }
    })



@app.route('/predict', methods=['POST'])
def predict_captcha():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file uploaded'}), 400

    image_file = request.files['image']
    image_bytes = image_file.read()

    try:
        img_tensor = preprocess_image_from_bytes(image_bytes)
        prediction = captcha_model.predict(img_tensor)
        decoded = decode_predictions(prediction)
        return jsonify({'prediction': decoded})
    except Exception as e:
        print(jsonify({'error': str(e)}))
        return jsonify({'error': str(e)}), 500


@app.route('/')
def home():
    return 'CAPTCHA Solver Detection'
    
if __name__ == "__main__":
	app.run(debug=False, use_reloader=False, port=5000)
