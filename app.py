from flask import Flask, render_template, request, session, redirect, url_for
import os
import random
import time
import pandas as pd

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Path to CAPTCHA images
DATA_DIR = "./static/dataset/"
captcha_files = os.listdir(DATA_DIR)

# CSV file for storing responses
CSV_FILE = "captcha_responses.csv"
if not os.path.exists(CSV_FILE):
    df = pd.DataFrame(columns=["user_id", "captcha_image", "response", "time_taken", "correct", "score", "attempts", "session_captcha"])
    df.to_csv(CSV_FILE, index=False)

@app.route("/", methods=["GET", "POST"])
def index():
    if "game_started" not in session:
        session["game_started"] = False
        session["score"] = 0
        session["attempts"] = 0
        session["captcha_list"] = random.sample(captcha_files, 10)  # Select 10 CAPTCHAs per session
        session["current_captcha_index"] = 0
        session["user_id"] = str(random.randint(1000, 9999))
        session["captcha_start_time"] = time.time()
        session["captcha_solved"] = None  # Initialize as None

    if request.method == "POST":
        if "start_game" in request.form:
            session["game_started"] = True
            session["captcha_start_time"] = time.time()
            return redirect(url_for("index"))

        elif "submit_captcha" in request.form:
            user_input = request.form.get("captcha_input", "").strip().lower()
            captcha_filename = session["captcha_list"][session["current_captcha_index"]]
            correct_answer = os.path.splitext(captcha_filename)[0].lower()

            end_time = time.time()
            time_taken = round(end_time - session["captcha_start_time"], 2)
            is_correct = user_input == correct_answer
            points = max(10 - int(time_taken), 1) if is_correct else 0

            if is_correct:
                session["score"] += points
                session["captcha_solved"] = True  # Track that user solved it

                # Save response to CSV
                new_data = pd.DataFrame([{ 
                    "user_id": session["user_id"], 
                    "captcha_image": captcha_filename, 
                    "response": user_input, 
                    "time_taken": time_taken, 
                    "correct": is_correct, 
                    "score": session["score"], 
                    "attempts": session["attempts"],
                    "session_captcha": session["current_captcha_index"] + 1
                }])
                new_data.to_csv(CSV_FILE, mode='a', header=False, index=False)

            else:
                session["attempts"] += 1
                session["captcha_solved"] = False  # Incorrect attempt
            
            return redirect(url_for("index"))

        elif "next_captcha" in request.form:
            session["current_captcha_index"] += 1
            session["captcha_solved"] = None  # Reset to None instead of False
            session["captcha_start_time"] = time.time()
            return redirect(url_for("index"))

        elif "restart_game" in request.form:
            session.clear()
            return redirect(url_for("index"))

    return render_template("index.html", session=session, DATA_DIR=DATA_DIR)

if __name__ == "__main__":
    app.run(debug=True)
