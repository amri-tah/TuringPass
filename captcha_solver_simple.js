class CaptchaSolverBot {
  constructor() {
    this.captchaImage = null;
    this.captchaInput = null;
    this.predictButton = null;
    this.collectionId = null;
    this.keyPresses = [];
    this.backspacePresses = 0;
    this.mouseMovements = [];
    this.startTime = null;
    this.attempts = 0;
    this.mode = "auto";
  }
  
  initialize() {
    console.log("Initializing captcha solver bot...");
    this.startTime = Date.now();
    
    // Find required elements
    this.captchaImage = document.getElementById("captchaImage");
    this.captchaInput = document.getElementById("captchaInput");
    this.predictButton = document.querySelector("button[onclick='predictCaptcha()']");
    this.collectionId = document.getElementById("collectionId")?.value;
    
    if (!this.captchaImage || !this.captchaInput || !this.predictButton) {
      console.error("Required elements not found on the page");
      return false;
    }
    
    console.log("Bot initialized successfully");
    return true;
  }
  
  // Get captcha image data
  getCaptchaImageData() {
    const imageUrl = this.captchaImage.src;
    const filename = this.captchaImage.getAttribute("data-filename");
    
    console.log(`Found captcha image: ${filename}`);
    return { imageUrl, filename };
  }
  
  // Generate exactly 10 random mouse movements
  generateRandomMouseMovements() {
    this.mouseMovements = [];
    const numMovements = 10; // Exactly 10 movements
    
    for (let i = 0; i < numMovements; i++) {
      this.mouseMovements.push({
        x: Math.floor(Math.random() * window.innerWidth),
        y: Math.floor(Math.random() * window.innerHeight),
        t: Math.floor(Math.random() * 3000) // Random time up to 3 seconds
      });
    }
    
    // Sort by time for realism
    this.mouseMovements.sort((a, b) => a.t - b.t);
    
    console.log(`Generated ${numMovements} random mouse movements`);
  }
  
  // Set prediction directly without typing simulation
  setPrediction(prediction) {
    console.log("Setting prediction:", prediction);
    
    // Simply set the value
    this.captchaInput.value = prediction;
    
    // Generate some fake keystroke data
    this.generateRandomKeystrokes(prediction);
    
    return prediction;
  }
  
  // Generate random keystroke data
  generateRandomKeystrokes(text) {
    this.keyPresses = [];
    this.backspacePresses = Math.floor(Math.random() * 3); // 0-2 random backspaces
    
    let cumulativeTime = 0;
    
    // Add keystrokes for each character with random timing
    for (let i = 0; i < text.length; i++) {
      cumulativeTime += 50 + Math.floor(Math.random() * 150);
      
      this.keyPresses.push({
        key: text[i],
        t: cumulativeTime
      });
    }
    
    console.log(`Generated keystroke data: ${this.keyPresses.length} keypresses, ${this.backspacePresses} backspaces`);
  }
  
  // Get prediction (simulated)
  // Get prediction (updated with working image upload format)
async getPredictionFromOCR(imageData) {
console.log("Getting prediction from OCR for image:", imageData.filename);

try {
  // Fetch the image as a Blob
  const imageResponse = await fetch(imageData.imageUrl);
  const imageBlob = await imageResponse.blob();

  // Prepare form data
  const formData = new FormData();
  formData.append("image", imageBlob, imageData.filename || "captcha.png");

  // Send POST request to /predict
  const response = await fetch("http://127.0.0.1:5000/predict", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Server returned status: ${response.status}`);
  }

  const result = await response.json();
  console.log("✅ OCR server prediction:", result.prediction);
  return result.prediction;
} catch (error) {
  console.error("❌ Error fetching OCR result:", error);
  throw error;
}
}

  

  // Prepare data for console output
  prepareRequestData(isCorrect = true) {
    return {
      collection_id: this.collectionId,
      captcha_image: this.captchaImage.getAttribute("data-filename"),
      response: this.captchaInput.value,
      time_taken: Date.now() - this.startTime,
      is_correct: isCorrect,
      attempts: this.attempts,
      key_presses: this.keyPresses,
      backspace_presses: this.backspacePresses,
      mouse_movements: this.mouseMovements,
      mode: this.mode
    };
  }
  
  // Log data to console instead of sending to backend
  logDataToConsole() {
    const data = this.prepareRequestData();
    
    // Log complete data object
    console.log("🔍 CAPTCHA SOLVER DATA:", data);
    
    // Also log a prettier version for better readability
    console.log("📊 CAPTCHA SOLVER SUMMARY:");
    console.log(`📝 Response: "${data.response}"`);
    console.log(`⏱️ Time taken: ${data.time_taken}ms`);
    console.log(`🔤 Key presses: ${data.key_presses.length}`);
    console.log(`⬅️ Backspace presses: ${data.backspace_presses}`);
    console.log(`🖱️ Mouse movements: ${data.mouse_movements.length} points`);
    console.log(`🖼️ Captcha image: ${data.captcha_image}`);
    console.log(`🏷️ Collection ID: ${data.collection_id}`);
    
    return data;
  }
  
  // Intercept the original predictCaptcha function
  interceptPredictCaptcha() {
    if (window.originalPredictCaptcha === undefined) {
      // Save the original function
      window.originalPredictCaptcha = window.predictCaptcha;
      
      // Replace with our intercepting function
      window.predictCaptcha = () => {
        // Log our data first
        this.logDataToConsole();
        
        // Then call the original function
        window.originalPredictCaptcha();
      };
      
      console.log("Successfully intercepted predictCaptcha function");
    }
  }
  
  // Main method to solve the captcha
  // Main method to solve the captcha
async solve() {
const initialized = this.initialize();
if (!initialized) return;

try {
  // Optional: Intercept the original predictCaptcha function
  this.interceptPredictCaptcha();

  // Step 1: Get the captcha image data
  const imageData = this.getCaptchaImageData();

  // Step 2: Get prediction from OCR
  const prediction = await this.getPredictionFromOCR(imageData);

  // Step 3: Set the prediction directly
  this.setPrediction(prediction);

  // Step 4: Generate random mouse movements (exactly 10)
  this.generateRandomMouseMovements();

  // Step 5: Log data to console
  const data = this.logDataToConsole();

  // Step 6: Click the button (no simulation)
  this.predictButton.click();

  console.log("Captcha solving completed!");

  return data;
} catch (error) {
  console.error("Error solving captcha:", error);
}
}

}

// Function to run the bot
async function runCaptchaSolverBot() {
  console.log("Starting captcha solver bot...");
  const bot = new CaptchaSolverBot();
  await bot.solve();
}

// Run after a short delay to allow the page to fully load
setTimeout(runCaptchaSolverBot, 500);

// Also make it available on the window object for manual triggering
window.runCaptchaSolverBot = runCaptchaSolverBot;