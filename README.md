# 🧠 TuringPass

**TuringPass** is a captcha solver detection system that determines whether a captcha is solved by a **human** or a **bot**. By analyzing behavioral biometrics and leveraging deep learning, TuringPass aims to enhance CAPTCHA security through anomaly detection and behavioral analysis — going beyond just checking if the solution is correct.

---

## 🧩 Problem Statement

Traditional CAPTCHA systems are no longer reliable. Bots powered by advanced ML models can now solve text-based CAPTCHAs with high accuracy, making correctness alone an insufficient measure of human verification.

🔒 A better approach should:
- Validate the **solution**, and  
- Analyze **how** the user arrives at it.

💡 This project explores both the **attack vector** (bot solving captchas) and the **defense mechanism** (detecting automated solvers using behavioral biometrics and anomaly detection).

---

## 🔍 What It Does

- Captures user interactions while solving captchas using a **Flask-based web interface**.
- Uses an **LSTM Autoencoder** trained on human behavior to flag bot-like actions as anomalies.
- Simulates bot behavior via:
  - Random mouse movements
  - Timed keystrokes
  - OCR-based captcha solving using a **CNN model**
- Frontend is built using **Tailwind CSS** for a clean and responsive UI.

## 🎥 Demo

https://github.com/user-attachments/assets/62ad7839-c6f9-471f-b436-ce77acd161c6

---

![Image](https://github.com/user-attachments/assets/aa8a9221-4760-4995-a4ca-551f79055839)

## 🏗️ Project Architecture

```
TuringPass/
│
├── backend/                  # Backend code
│   ├── app.py            # Contains endpoints for OCR inference and human/bot autoencoder inference
│   ├── captcha_model.h5  # OCR model 
│   ├── lstm_autoencoder_model.h5   # Trained LSTM Autoencoder
│   └── scaler.save          
│
├── models/                          # Model Training code
│   ├── captcha/                    # CAPTCHA solving module
│   │   ├── README.md
│   │   ├── human_captcha_solve_data.csv
│   │   ├── inference.ipynb
│   │   ├── ocr-model.ipynb
│   │   └── ocr_model.h5
│   │
│   ├── human-bot/                  # Human vs Bot anomaly detection module
│   │   ├── README.md
│   │   ├── anomaly.ipynb
│   │   ├── ci_main_cleaned.csv
│   │   ├── lstm_autoencoder_model.h5
│   │   ├── preprocessing.ipynb
│   │   └── scaler.save
│
├── static/
│   └── dataset/                         # CAPTCHA dataset images
│
├── templates/                           # HTML templates for frontend rendering
│
├── app.py                               # Flask file integrating human data collection and bot detection
├── captcha_interactions.csv             # Human interaction data collected 
├── captcha_solver_bot.js                # Advanced bot
├── captcha_solver_simple.js             # Script for simple CAPTCHA solving bot
├── demo.mp4                             # Demo video showcasing the project
├── requirements.txt                     # Python dependencies
└── README.md                         
```

---

## 📊 Data Collection

To build a robust model for detecting non-human behavior, we collected **2,000+ CAPTCHA solving sessions** from **20+ real participants**, capturing fine-grained behavioral data during each interaction.

We recorded:
- 🖱 **Mouse Coordinates**  
  Tracked continuously to analyze movement smoothness, path variance, and reaction time.
- ⌨️ **Keystroke Events**  
  Logged every key press/release along with timestamps, including usage of backspace to detect natural corrections.
- ⏱ **Timestamps**  
  Captured time per character, total session time, and inter-event delays to model decision-making pace.
- 🔡 **Final Typed Response**  
  Compared with actual CAPTCHA values to validate correctness and analyze error tendencies.

These features were critical for:

- Training an **LSTM Autoencoder** on genuine human behavior patterns.
- Setting **anomaly detection thresholds** using reconstruction error distributions.
- Simulating and distinguishing **realistic vs bot-like interactions**.

With this multi-dimensional dataset, we created a behavioral fingerprint for every session—enabling precise and interpretable detection of automated activity.

## 💡 How It Works

### 👤 Human Behavior Detection
- Tracks **mouse coordinates**, **keypresses**, and **timing** during captcha solving.
- Trains an **LSTM Autoencoder** on normal (human) behavior.
- At inference time, calculates reconstruction error — high error implies anomalous (bot) behavior.

### 🤖 Bot Simulation
- Programmatically simulates user actions with:
  - Noisy/randomized mouse movement paths
  - Fixed or abnormal timing for typing
- Uses a CNN-based **OCR model** to read captcha images and solve them.

### 🧠 OCR Captcha Solver
- Custom **CNN model** trained to recognize alphanumeric characters from captchas.
- Dataset used: [`Kaggle - Captcha Dataset`](https://www.kaggle.com/datasets/parsasam/captcha-dataset)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/TuringPass.git
cd TuringPass
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the Flask App

```bash
cd app
python app.py
```

### 4. Run the Bot Simulator (Optional)

```bash
cd backend
python app.py
```

---


## 📦 Tech Stack

[![My Skills](https://skillicons.dev/icons?i=html,tailwindcss,javascript,flask,tensorflow&theme=dark)](https://skillicons.dev)

**ML Models Used:**
- 🧠 **LSTM Autoencoder** — Anomaly detection on behavioral data
- 🔎 **CNN** — Captcha OCR (Optical Character Recognition)

---

## 📄 License

This project is licensed under the **MIT License**.  
See the [LICENSE](LICENSE) file for more details.

---

## 🙌 Acknowledgements

- The captcha OCR model is trained using the open-source dataset: [Kaggle - Captcha Dataset](https://www.kaggle.com/datasets/parsasam/captcha-dataset)
- Inspired by real-world security challenges in distinguishing between bots and humans in critical applications.
