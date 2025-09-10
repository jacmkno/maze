class Speech {
    static #lock = Promise.resolve();
    static #visualCue = null;
    static #cueTimeoutId = null;
    static #synthesis = window.speechSynthesis;
    static #Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    static {
        if(!document.getElementById('speech-styles')){
            const addStyles = ((c,D)=>{const s=D.createElement('style');s.type='text/css';s.styleSheet?s.styleSheet.cssText=c:s.appendChild(D.createTextNode(c));D.head.appendChild(s);return s;});
            const s = addStyles(`
                .speech-cue { --base-bgcolor: rgba(0, 0, 0, 0.75); position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: linear-gradient(to right, color-mix(in srgb, var(--base-bgcolor) 80%, white 20%) calc(var(--timeout-progress, 0) * 100%), var(--base-bgcolor) calc(var(--timeout-progress, 0) * 100%) ); color: white; padding: 12px 24px; border-radius: 9999px; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; font-size: 16px; z-index: 1000; display: none; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: opacity 0.3s ease, background-color 0.3s ease; }
                .speech-cue-error { --base-bgcolor: #b91c1c; }
                .speech-cue-success { --base-bgcolor: #16a34a; }
            `, document);
            s.setAttribute('id', 'speech-styles');
        }
    }

    static #createVisualCue(message, { isError = false, isSuccess = false } = {}) {
        if (this.#cueTimeoutId) {
            clearTimeout(this.#cueTimeoutId);
            this.#cueTimeoutId = null;
        }

        if (!this.#visualCue) {
            this.#visualCue = document.createElement("div");
            this.#visualCue.className = "speech-cue";
            document.body.appendChild(this.#visualCue);
        }
        this.#visualCue.textContent = message;
        this.#visualCue.style.display = 'block';
        
        this.#visualCue.classList.toggle('speech-cue-error', isError);
        this.#visualCue.classList.toggle('speech-cue-success', isSuccess);
    }

    static #removeVisualCue() {
        if (this.#visualCue) {
            this.#visualCue.style.display = 'none';
        }
    }
    
    static async #checkPermissions(autoClearCue=true) {
        // 1. Check for basic API support first.
        if (!this.#synthesis || !this.#Recognition) {
            this.#createVisualCue('Speech APIs not supported by this browser.', { isError: true });
            if(autoClearCue) this.#cueTimeoutId = setTimeout(() => this.#removeVisualCue(), 5000);
            return false;
        }

        if (!navigator.permissions) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
                return true;
            } catch (err) {
                this.#createVisualCue('Microphone access denied.', { isError: true });
                if(autoClearCue) this.#cueTimeoutId = setTimeout(() => this.#removeVisualCue(), 5000);
                return false;
            }
        }

        const permissionStatus = await navigator.permissions.query({ name: 'microphone' });

        if (permissionStatus.state === 'granted') {
            return true;
        }

        if (permissionStatus.state === 'denied') {
            this.#createVisualCue('No microphone access', { isError: true });
            if(autoClearCue) this.#cueTimeoutId = setTimeout(() => this.#removeVisualCue(), 5000);
            return false;
        }

        if (permissionStatus.state === 'prompt') {
            this.#createVisualCue('Grant microphone access');
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
                this.#removeVisualCue();
                return true;
            } catch (err) {
                this.#createVisualCue('Microphone access error', { isError: true });
                if(autoClearCue) this.#cueTimeoutId = setTimeout(() => this.#removeVisualCue(), 5000);
                return false;
            }
        }
    }

    static async #acquireLock() {
        const currentLock = this.#lock;
        let releaseLock;
        this.#lock = new Promise((resolve) => {
            releaseLock = resolve;
        });
        await currentLock;
        return releaseLock;
    }

    static async speak(text, lang = "en-US", volume = 1.0) {
        await this.checkVoiceWarmUp();
        const releaseLock = await this.#acquireLock();
        this.#createVisualCue('Speaking…');
        try {
            await new Promise((resolve, reject) => {
                if (this.#synthesis.speaking) this.#synthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = lang;
                utterance.onend = resolve;
                utterance.volume = volume;
                utterance.onerror = (event) => reject(new Error(`SpeechSynthesis Error: ${event.error}`));
                this.#synthesis.speak(utterance);
            });
        } finally {
            this.#removeVisualCue();
            releaseLock();
        }
    }

    static async checkVoiceWarmUp(){
        if(this.voiceReady) return;
        this.voiceReady = true;
        await this.speak('Initializing', 'en-US', 0.01, true);
    }

    static async listen(finalizeText=[], lang = "en-US", timeout = 10000) {
        const releaseLock = await this.#acquireLock();
        const triggers = (Array.isArray(finalizeText) ? finalizeText:[ finalizeText ]).map(t => t.toLowerCase());

        let progressInterval = null;
        let detections = 0;
        let transcript = '';
        
        try {
            const hasPermission = await this.#checkPermissions(false);
            if (hasPermission) this.#createVisualCue('Listening…');
            const cueElement = this.#visualCue;
            const startTime = Date.now();

            progressInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / timeout, 1);
                if (cueElement) {
                    cueElement.style.setProperty('--timeout-progress', progress);
                }
            }, 50);

            let recognition;

            return await new Promise((resolve, reject) => {
                recognition = new this.#Recognition();
                recognition.lang = lang;
                recognition.continuous = true;
                recognition.interimResults = false;

                let timeoutHandle = null;

                const finalize = async (result) => {
                    if (progressInterval) clearInterval(progressInterval);
                    progressInterval = null;
                    if (timeoutHandle) clearTimeout(timeoutHandle);
                    if (recognition) {
                        recognition.onresult = null;
                        recognition.onerror = null;
                        recognition.onend = null;
                        recognition.stop();
                        recognition = null;
                    }
                    const message = result.success === null ? "No input" : (result.success ? "Success!" : "Failed");
                    this.#createVisualCue(message, { isSuccess: result.success, isError: !result.success });
                    await new Promise(r => setTimeout(r, 2500));
                    
                    resolve(result);
                };

                timeoutHandle = setTimeout(() => {
                    finalize({success: detections?false:null, transcript});
                }, timeout);

                recognition.onresult = (event) => {
                    transcript = [...event.results].map(r=>r[0].transcript).filter(r=>r.length).join(' ');
                    const abortSequencePool = [...event.results].map(r=>
                        [...r].map(r=>r.transcript).filter(r=>r.length).join(' ')
                    ).filter(r=>r.length).join(' ');
                    
                    const triggerFound = triggers.some(trigger => abortSequencePool.includes(trigger));
                    detections ++;
                    if (triggerFound) {
                        finalize({success: true, transcript});
                    }
                };

                recognition.onerror = (event) => { 
                    return; // apparently there is no need to do anything in this case. We have succesfully tranfered this problem to the user.
                    if (event.error !== 'no-speech' && event.error !== 'aborted') {
                        reject(new Error(`SpeechSynthesis Error: ${event.error}`));
                    }
                };

                recognition.onend = () => {
                    if (recognition) recognition.start();
                };

                recognition.start();
            });
        } finally {
            if (progressInterval) clearInterval(progressInterval);
            if (this.#visualCue) this.#visualCue.style.setProperty('--timeout-progress', '0');
            this.#removeVisualCue();
            releaseLock();
        }
    }
}

function createCanvasWithCircles(circleCount, fixed = true, container = document.body) {
    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, {
        position: 'absolute', top: '0', left: '0',
        display: 'block',
        width: '100%', height: '100%',
        maxWidth: '100%', maxHeight: '100%',
        objectFit: 'contain', aspectRatio: 'auto'
    });

    const containerWidth = container.offsetWidth || window.innerWidth;
    const containerHeight = container.offsetHeight || window.innerHeight;
    const aspectRatio = containerWidth / containerHeight;
    canvas.style.aspectRatio = `${aspectRatio}`;

    canvas.width = containerWidth;
    canvas.height = containerHeight;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, containerWidth, containerHeight);

    const circles = [];
    const canvasArea = containerWidth * containerHeight;
    const targetFillArea = canvasArea * 0.3;

    let fixedRadius;
    if (fixed) {
        fixedRadius = Math.sqrt(targetFillArea / (Math.PI * circleCount));
    }

    function isOverlapping(newCircle) {
        return circles.some(circle => {
            const dx = circle.x - newCircle.x;
            const dy = circle.y - newCircle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < circle.radius + newCircle.radius;
        });
    }

    function generateCircle() {
        const maxRadius = fixed ? fixedRadius : Math.sqrt(targetFillArea / (Math.PI * circleCount));
        let radius, x, y, circle;
        do {
            radius = fixed ? fixedRadius : Math.random() * (maxRadius - 5) + 5; // Minimum radius of 5
            x = Math.random() * (containerWidth - 2 * radius) + radius;
            y = Math.random() * (containerHeight - 2 * radius) + radius;
            circle = { x, y, radius };
        } while (isOverlapping(circle));
        return circle;
    }

    for (let i = 0; i < circleCount; i++) {
        const circle = generateCircle();
        circles.push(circle);
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'red';
        ctx.fill();
    }
    return canvas;
}

class SlideGenerator {
    drawNext(){
        this.slide = document.createElement('div');
        this.slide.className = 'text-9xl font-black text-white';
        this.slide.innerText = Math.floor(Math.random() * 100) + 1;
        UI.displaySlide(this.slide);
    }

    awaitContinuous(){
        this.timeout = setTimeout(() => this.nextSlide(), 2000);
    }

    awaitTest(){
        this.slide.addEventListener('click', ()=>this.nextSlide());
    }

    nextSlide() {
        if (!UI.isPlaying()) return;                
        if(this.timeout) {
            clearTimeout(this.timeout);
            delete this.timeout;
        }                
        this.drawNext();

        if (UI.getMode() === 'test') {
            this.awaitTest();
        } else {
            this.awaitContinuous();
        }
    }
}
