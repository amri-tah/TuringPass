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
      this.mode = "bot"; 
    }
    
    async initialize() {
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
      
      // Set up event tracking
      this.trackMouse();
      this.trackTyping();
      
      console.log("Bot initialized successfully");
      return true;
    }
    
    trackMouse() {
      document.addEventListener("mousemove", (e) => {
        this.mouseMovements.push({ 
          x: e.clientX, 
          y: e.clientY, 
          t: Date.now() - this.startTime // time since start
        });
      });
    }
    
    trackTyping() {
      this.captchaInput.addEventListener("keydown", (e) => {
        if (e.key === "Backspace") {
          this.backspacePresses++;
        } else {
          this.keyPresses.push({ 
            key: e.key, 
            t: Date.now() - this.startTime // time since start
          });
        }
      });
    }
    
    // Get captcha image data
    getCaptchaImageData() {
      const imageUrl = this.captchaImage.src;
      const filename = this.captchaImage.getAttribute("data-filename");
      
      console.log(`Found captcha image: ${filename}`);
      return { imageUrl, filename };
    }
    
    // Simulate realistic mouse movements to the button
    async simulateMouseMovements() {
      // Get current mouse position (or use a default)
      let currentX = this.mouseMovements.length > 0 
        ? this.mouseMovements[this.mouseMovements.length - 1].x 
        : window.innerWidth / 2;
      let currentY = this.mouseMovements.length > 0 
        ? this.mouseMovements[this.mouseMovements.length - 1].y 
        : window.innerHeight / 2;
      
      // Get button position
      const rect = this.predictButton.getBoundingClientRect();
      const targetX = rect.left + rect.width / 2;
      const targetY = rect.top + rect.height / 2;
      
      // Calculate number of steps (more steps = smoother movement)
      const distance = Math.sqrt(Math.pow(targetX - currentX, 2) + Math.pow(targetY - currentY, 2));
      const steps = Math.max(10, Math.floor(distance / 10));
      
      // Add slight curve to movement (more human-like)
      const midPointOffset = {
        x: (Math.random() - 0.5) * distance * 0.5,
        y: (Math.random() - 0.5) * distance * 0.5
      };
      
      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const easedProgress = this.easeInOutQuad(progress);
        
        // Add curve using quadratic bezier
        let x, y;
        if (progress < 0.5) {
          // First half - curve toward midpoint
          const subProgress = progress * 2; // rescale 0-0.5 to 0-1
          x = currentX + (currentX + midPointOffset.x - currentX) * subProgress;
          y = currentY + (currentY + midPointOffset.y - currentY) * subProgress;
        } else {
          // Second half - curve from midpoint to target
          const subProgress = (progress - 0.5) * 2; // rescale 0.5-1 to 0-1
          x = currentX + midPointOffset.x + (targetX - (currentX + midPointOffset.x)) * subProgress;
          y = currentY + midPointOffset.y + (targetY - (currentY + midPointOffset.y)) * subProgress;
        }
        
        // Add small random jitter (human hands aren't perfectly steady)
        x += (Math.random() - 0.5) * 2;
        y += (Math.random() - 0.5) * 2;
        
        // Create and dispatch mousemove event
        const moveEvent = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: x,
          clientY: y
        });
        
        document.dispatchEvent(moveEvent);
        this.mouseMovements.push({ 
          x: x, 
          y: y, 
          t: Date.now() - this.startTime 
        });
        
        // Add delay between movements
        await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 15));
      }
      
      // Finally, click the button
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: targetX,
        clientY: targetY
      });
      
      this.predictButton.dispatchEvent(clickEvent);
    }
    
    // Easing function for more natural mouse movement
    easeInOutQuad(t) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
    
    // Simulate typing with realistic delays and behaviors
    async typePrediction(prediction) {
      console.log("Typing prediction:", prediction);
      
      // Clear existing input (with random chance to make a typo and use backspace)
      this.captchaInput.focus();
      this.captchaInput.value = "";
      
      // Type the prediction with realistic timing
      let typedText = "";
      
      for (let i = 0; i < prediction.length; i++) {
        // Determine if we should make a "typo" (about 5% chance)
        const makeTypo = Math.random() < 0.05;
        
        if (makeTypo) {
          // Choose a random nearby key on the keyboard
          const typoChar = this.getRandomNearbyKey(prediction[i]);
          
          // Type the wrong character
          typedText += typoChar;
          this.captchaInput.value = typedText;
          
          // Simulate keydown event for the typo
          this.simulateKeyPress(typoChar);
          
          // Wait a bit before noticing the "mistake"
          await this.delay(200 + Math.random() * 300);
          
          // Backspace to fix the typo
          typedText = typedText.slice(0, -1);
          this.captchaInput.value = typedText;
          this.simulateBackspace();
          
          // Wait a bit before continuing
          await this.delay(100 + Math.random() * 200);
        }
        
        // Type the correct character
        typedText += prediction[i];
        this.captchaInput.value = typedText;
        
        // Simulate keydown event
        this.simulateKeyPress(prediction[i]);
        
        // Random delay between keystrokes (varying typing speeds)
        const baseDelay = 80; // base typing speed
        const randomVariation = Math.random() * 150; // variation in typing speed
        
        // Occasionally pause longer (as if thinking)
        const extendedPause = Math.random() < 0.1 ? Math.random() * 500 : 0;
        
        await this.delay(baseDelay + randomVariation + extendedPause);
      }
      
      return typedText;
    }
    
    // Helper to get a random key near the intended one (for realistic typos)
    getRandomNearbyKey(key) {
      const keyboardLayout = {
        'a': ['q', 'w', 's', 'z'],
        'b': ['v', 'g', 'h', 'n'],
        'c': ['x', 'd', 'f', 'v'],
        'd': ['s', 'e', 'r', 'f', 'c', 'x'],
        'e': ['w', 's', 'd', 'r'],
        'f': ['d', 'r', 't', 'g', 'v', 'c'],
        'g': ['f', 't', 'y', 'h', 'b', 'v'],
        'h': ['g', 'y', 'u', 'j', 'n', 'b'],
        'i': ['u', 'j', 'k', 'o'],
        'j': ['h', 'u', 'i', 'k', 'm', 'n'],
        'k': ['j', 'i', 'o', 'l', 'm'],
        'l': ['k', 'o', 'p', ';'],
        'm': ['n', 'j', 'k', ','],
        'n': ['b', 'h', 'j', 'm'],
        'o': ['i', 'k', 'l', 'p'],
        'p': ['o', 'l', '[', ';'],
        'q': ['1', '2', 'w', 'a'],
        'r': ['e', 'd', 'f', 't'],
        's': ['a', 'w', 'e', 'd', 'x', 'z'],
        't': ['r', 'f', 'g', 'y'],
        'u': ['y', 'h', 'j', 'i'],
        'v': ['c', 'f', 'g', 'b'],
        'w': ['q', 'a', 's', 'e'],
        'x': ['z', 's', 'd', 'c'],
        'y': ['t', 'g', 'h', 'u'],
        'z': ['a', 's', 'x'],
        '0': ['9', '-', 'p'],
        '1': ['`', '2', 'q'],
        '2': ['1', '3', 'q', 'w'],
        '3': ['2', '4', 'w', 'e'],
        '4': ['3', '5', 'e', 'r'],
        '5': ['4', '6', 'r', 't'],
        '6': ['5', '7', 't', 'y'],
        '7': ['6', '8', 'y', 'u'],
        '8': ['7', '9', 'u', 'i'],
        '9': ['8', '0', 'i', 'o'],
      };
      
      // If we have nearby keys defined, pick a random one
      if (keyboardLayout[key.toLowerCase()]) {
        const nearbyKeys = keyboardLayout[key.toLowerCase()];
        return nearbyKeys[Math.floor(Math.random() * nearbyKeys.length)];
      }
      
      // If not in our layout map, just return a random letter
      const randomLetters = 'abcdefghijklmnopqrstuvwxyz';
      return randomLetters.charAt(Math.floor(Math.random() * randomLetters.length));
    }
    
    // Simulate a keypress event and track it
    simulateKeyPress(key) {
      // Create and dispatch keyboard event
      const keyEvent = new KeyboardEvent('keydown', {
        key: key,
        code: 'Key' + key.toUpperCase(),
        keyCode: key.charCodeAt(0),
        which: key.charCodeAt(0),
        bubbles: true,
        cancelable: true
      });
      
      this.captchaInput.dispatchEvent(keyEvent);
      
      // Record the keypress in our tracking
      this.keyPresses.push({
        key: key,
        t: Date.now() - this.startTime
      });
    }
    
    // Simulate a backspace and track it
    simulateBackspace() {
      // Create and dispatch keyboard event for backspace
      const backspaceEvent = new KeyboardEvent('keydown', {
        key: 'Backspace',
        code: 'Backspace',
        keyCode: 8,
        which: 8,
        bubbles: true,
        cancelable: true
      });
      
      this.captchaInput.dispatchEvent(backspaceEvent);
      this.backspacePresses++;
    }
    
    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Get prediction from API (simulated)
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
    async solve() {
      const initialized = await this.initialize();
      if (!initialized) return;
      
      try {
        // Optional: Intercept the original predictCaptcha function to log our data
        // when the button is clicked
        this.interceptPredictCaptcha();
        
        // Step 1: Get the captcha image data
        const imageData = this.getCaptchaImageData();
        
        // Step 2: Get prediction 
        const prediction = await this.getPrediction(imageData);
        
        // Step 3: Type the prediction with realistic human behavior
        await this.typePrediction(prediction);
        
        // Step 4: Log data to console
        const data = this.logDataToConsole();
        
        // Step 5: Move mouse to button and click it
        await this.simulateMouseMovements();
        
        console.log("Captcha solving completed!");
        
        return data;
      } catch (error) {
        console.error("Error solving captcha:", error);
      }
    }
  }
  
  // Function to run the bot
  function runCaptchaSolverBot() {
    console.log("Starting captcha solver bot...");
    const bot = new CaptchaSolverBot();
    bot.solve();
  }
  
  // Run after a slight delay to allow the page to fully load
  setTimeout(runCaptchaSolverBot, 1000);
  
  // Also make it available on the window object for manual triggering
  window.runCaptchaSolverBot = runCaptchaSolverBot;

  (async () => {
    const bot = new CaptchaSolverBot();
  
    // Initialize the bot (wait for DOM to be ready)
    const initialized = await bot.initialize();
    if (!initialized) {
      console.error("Failed to initialize the bot.");
      return;
    }
  
    // Wait a bit to simulate human reaction delay
    await bot.delay(1000 + Math.random() * 1000);
  
    // Get CAPTCHA image data
    const imageData = bot.getCaptchaImageData();
  
    // Get prediction from OCR server
    const prediction = await bot.getPredictionFromOCR(imageData);
    console.log("OCR Prediction:", prediction);
  
    // Simulate typing the prediction into input field
    await bot.typePrediction(prediction);
  
    // Simulate human delay before clicking submit
    await bot.delay(500 + Math.random() * 800);
  
    // Simulate mouse movements and click the predict button
    await bot.simulateMouseMovements();
  
    console.log("Interaction complete. Total attempts:", bot.attempts + 1);
  })();