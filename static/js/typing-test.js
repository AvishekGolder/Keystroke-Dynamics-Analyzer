// NEURO-SYNCH Typing Test Application
class TypingTest {
    constructor() {
        this.testDuration = 60;
        this.testMode = 'words';
        this.targetText = '';
        this.currentIndex = 0;
        this.startTime = null;
        this.endTime = null;
        this.timer = null;
        this.timeRemaining = 60;
        this.keystrokeBuffer = [];
        this.lastKeyTime = null;
        this.waveformData = [];
        this.testActive = false;
        this.testComplete = false;
        this.userId = 'test_' + Math.random().toString(36).substr(2, 9);
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        console.log('🧠 NEURO-SYNCH Typing Test Initialized');
    }
    
    setupEventListeners() {
        // Start test button
        document.getElementById('startTestBtn').addEventListener('click', () => this.startTest());
        
        // Retry button
        document.getElementById('retryTestBtn').addEventListener('click', () => this.resetTest());
        
        // Share button
        document.getElementById('shareResultsBtn').addEventListener('click', () => this.shareResults());
        
        // Test mode selection
        document.querySelectorAll('input[name="testMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.testDuration = parseInt(e.target.value);
            });
        });
        
        // Text type selection
        document.querySelectorAll('input[name="textType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.testMode = e.target.value;
            });
        });
        
        // Typing input
        const typingInput = document.getElementById('typingInput');
        typingInput.addEventListener('input', (e) => this.handleInput(e));
        typingInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
        typingInput.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Focus management
        const testCard = document.querySelector('.typing-test-card');
        testCard.addEventListener('click', () => {
            if (this.testActive && !this.testComplete) {
                typingInput.focus();
            }
        });
        
        // Tab to restart
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && this.testActive) {
                e.preventDefault();
                this.resetTest();
            }
        });
    }
    
    async startTest() {
        try {
            // Generate test text
            const response = await fetch('/api/test/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: this.testMode,
                    duration: this.testDuration
                })
            });
            
            const data = await response.json();
            this.targetText = data.testText;
            
            // Show test screen
            document.getElementById('startScreen').style.display = 'none';
            document.getElementById('testScreen').style.display = 'block';
            
            // Render target text
            this.renderTargetText();
            
            // Reset variables
            this.currentIndex = 0;
            this.timeRemaining = this.testDuration;
            this.keystrokeBuffer = [];
            this.waveformData = [];
            this.testActive = false;
            this.testComplete = false;
            
            // Update timer display
            document.getElementById('timer').textContent = this.testDuration;
            
            // Focus input
            document.getElementById('typingInput').focus();
            document.querySelector('.typing-test-card').classList.add('active');
            
        } catch (error) {
            console.error('Error starting test:', error);
            alert('Failed to start test. Please try again.');
        }
    }
    
    renderTargetText() {
        const display = document.getElementById('targetTextDisplay');
        const words = this.targetText.split(' ');
        
        display.innerHTML = '';
        words.forEach((word, wordIndex) => {
            const wordSpan = document.createElement('span');
            wordSpan.className = 'word';
            
            word.split('').forEach((char, charIndex) => {
                const charSpan = document.createElement('span');
                charSpan.className = 'char';
                charSpan.textContent = char;
                charSpan.dataset.index = this.getGlobalIndex(wordIndex, charIndex);
                wordSpan.appendChild(charSpan);
            });
            
            // Add space
            const spaceSpan = document.createElement('span');
            spaceSpan.className = 'char';
            spaceSpan.textContent = ' ';
            spaceSpan.dataset.index = this.getGlobalIndex(wordIndex, word.length);
            wordSpan.appendChild(spaceSpan);
            
            display.appendChild(wordSpan);
        });
        
        // Highlight first character
        if (display.querySelector('.char')) {
            display.querySelector('.char').classList.add('current');
        }
    }
    
    getGlobalIndex(wordIndex, charIndex) {
        const words = this.targetText.split(' ');
        let index = 0;
        
        for (let i = 0; i < wordIndex; i++) {
            index += words[i].length + 1; // +1 for space
        }
        
        return index + charIndex;
    }
    
    handleInput(event) {
        if (!this.testActive && !this.testComplete) {
            this.startTimer();
            this.testActive = true;
        }
        
        if (this.testComplete) return;
        
        const typedText = event.target.value;
        this.currentIndex = typedText.length;
        
        // Update display
        this.updateDisplay(typedText);
        
        // Update live stats
        this.updateLiveStats(typedText);
    }
    
    handleKeyDown(event) {
        const currentTime = performance.now();
        
        const keystrokeEvent = {
            key: event.key,
            keyCode: event.keyCode,
            timestamp: currentTime,
            dwellTime: 0,
            flightTime: this.lastKeyTime ? currentTime - this.lastKeyTime : 0,
            isBackspace: event.key === 'Backspace'
        };
        
        this.currentKeyDown = {
            key: event.key,
            startTime: currentTime
        };
        
        this.lastKeyTime = currentTime;
    }
    
    handleKeyUp(event) {
        if (this.currentKeyDown && this.currentKeyDown.key === event.key) {
            const dwellTime = performance.now() - this.currentKeyDown.startTime;
            
            const keystrokeEvent = {
                key: event.key,
                keyCode: event.keyCode,
                timestamp: performance.now(),
                dwellTime: dwellTime,
                flightTime: this.lastKeyTime ? performance.now() - this.lastKeyTime : 0,
                isBackspace: event.key === 'Backspace'
            };
            
            this.keystrokeBuffer.push(keystrokeEvent);
            
            // Update keystroke counter
            document.getElementById('keystrokeCounter').textContent = this.keystrokeBuffer.length;
            
            // Add to waveform
            this.waveformData.push({
                time: Date.now(),
                value: dwellTime
            });
            
            if (this.waveformData.length > 50) {
                this.waveformData.shift();
            }
            
            this.drawMiniWaveform();
        }
    }
    
    updateDisplay(typedText) {
        const chars = document.querySelectorAll('.target-text-display .char');
        
        chars.forEach((char, index) => {
            char.classList.remove('correct', 'incorrect', 'current', 'extra');
            
            if (index < typedText.length) {
                if (typedText[index] === this.targetText[index]) {
                    char.classList.add('correct');
                } else {
                    char.classList.add('incorrect');
                }
            } else if (index === typedText.length) {
                char.classList.add('current');
            }
        });
        
        // Handle extra characters
        if (typedText.length > this.targetText.length) {
            // User typed more than target
        }
    }
    
    updateLiveStats(typedText) {
        if (!this.startTime) return;
        
        const elapsedTime = (Date.now() - this.startTime) / 1000;
        const words = typedText.trim().split(/\s+/).length;
        const wpm = (words / elapsedTime) * 60;
        
        // Calculate accuracy
        let correctChars = 0;
        for (let i = 0; i < Math.min(typedText.length, this.targetText.length); i++) {
            if (typedText[i] === this.targetText[i]) {
                correctChars++;
            }
        }
        const accuracy = (correctChars / Math.max(typedText.length, 1)) * 100;
        
        // Update display
        document.getElementById('liveWPM').textContent = Math.round(wpm);
        document.getElementById('liveAccuracy').textContent = Math.round(accuracy) + '%';
        
        // Update neuro feedback
        if (this.keystrokeBuffer.length > 10) {
            const recentKeystrokes = this.keystrokeBuffer.slice(-10);
            const dwellTimes = recentKeystrokes.map(k => k.dwellTime);
            const avgDwell = dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length;
            const stdDwell = Math.sqrt(dwellTimes.reduce((sq, n) => sq + Math.pow(n - avgDwell, 2), 0) / dwellTimes.length);
            const stability = Math.max(0, 100 - (stdDwell / avgDwell) * 100);
            
            const cognitiveLoad = Math.min(100, (avgDwell / 150) * 100);
            
            document.querySelector('.feedback-item:nth-child(1) .feedback-value').textContent = 
                Math.round(stability) + '%';
            document.querySelector('.feedback-item:nth-child(2) .feedback-value').textContent = 
                Math.round(cognitiveLoad) + '%';
        }
    }
    
    startTimer() {
        this.startTime = Date.now();
        
        this.timer = setInterval(() => {
            this.timeRemaining--;
            
            const timerDisplay = document.getElementById('timer');
            timerDisplay.textContent = this.timeRemaining;
            
            // Color coding
            if (this.timeRemaining <= 5) {
                timerDisplay.classList.add('danger');
            } else if (this.timeRemaining <= 10) {
                timerDisplay.classList.add('warning');
            }
            
            if (this.timeRemaining <= 0) {
                this.finishTest();
            }
        }, 1000);
    }
    
    async finishTest() {
        clearInterval(this.timer);
        this.endTime = Date.now();
        this.testComplete = true;
        this.testActive = false;
        
        const typedText = document.getElementById('typingInput').value;
        const timeTaken = (this.endTime - this.startTime) / 1000;
        
        // Submit results
        try {
            const response = await fetch('/api/test/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    typedText: typedText,
                    targetText: this.targetText,
                    timeTaken: timeTaken,
                    keystrokes: this.keystrokeBuffer,
                    userId: this.userId
                })
            });
            
            const results = await response.json();
            this.displayResults(results);
            
        } catch (error) {
            console.error('Error submitting test:', error);
            alert('Failed to analyze results. Please try again.');
        }
    }
    
    displayResults(results) {
        // Hide test screen, show results
        document.getElementById('testScreen').style.display = 'none';
        document.getElementById('resultsScreen').style.display = 'block';
        
        // Main metrics
        document.getElementById('resultWPM').textContent = results.wpm;
        document.getElementById('resultAccuracy').textContent = results.accuracy + '%';
        document.getElementById('resultConsistency').textContent = results.consistency + '%';
        document.getElementById('resultGrade').textContent = results.grade;
        
        // Add celebration effect for good grades
        if (results.grade === 'A+' || results.grade === 'A') {
            document.getElementById('resultGrade').classList.add('celebrating');
        }
        
        // Performance level
        const perfBanner = document.getElementById('performanceLevel');
        perfBanner.querySelector('p').textContent = results.performanceLevel;
        
        // Detailed stats
        document.getElementById('correctChars').textContent = results.correctChars;
        document.getElementById('totalChars').textContent = results.totalChars;
        document.getElementById('errorRate').textContent = results.errorRate + '%';
        document.getElementById('timeTaken').textContent = results.timeTaken + 's';
        
        // Neuro analysis
        if (results.neuroAnalysis && results.neuroAnalysis.status === 'success') {
            document.getElementById('nhiResult').textContent = 
                Math.round(results.neuroAnalysis.neuroHealthIndex) + '/100';
            document.getElementById('cognitiveLoadResult').textContent = 
                Math.round(results.neuroAnalysis.cognitiveLoad) + '%';
        }
        
        // Neuro insights
        const insightsList = document.getElementById('neuroInsightsList');
        insightsList.innerHTML = '';
        
        results.neuroInsights.forEach(insight => {
            const insightDiv = document.createElement('div');
            insightDiv.className = 'insight-item-result';
            
            const emojiMatch = insight.match(/^(🚀|⚡|💭|🎯|✅|⚠️|📊|📈|📉|🔄)/);
            const emoji = emojiMatch ? emojiMatch[0] : '💡';
            const text = insight.replace(/^(🚀|⚡|💭|🎯|✅|⚠️|📊|📈|📉|🔄)\s*/, '');
            
            insightDiv.innerHTML = `
                <div class="insight-icon">${emoji}</div>
                <div class="insight-text">${text}</div>
            `;
            
            insightsList.appendChild(insightDiv);
        });
    }
    
    drawMiniWaveform() {
        const canvas = document.getElementById('miniWaveform');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.fillStyle = 'rgba(10, 10, 15, 0.8)';
        ctx.fillRect(0, 0, width, height);
        
        if (this.waveformData.length < 2) return;
        
        const maxValue = Math.max(...this.waveformData.map(d => d.value), 150);
        const xStep = width / (this.waveformData.length - 1);
        
        // Draw line
        ctx.strokeStyle = '#00d9ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        this.waveformData.forEach((point, index) => {
            const x = index * xStep;
            const y = height - (point.value / maxValue) * (height - 10);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
    }
    
    resetTest() {
        // Clear timer
        if (this.timer) {
            clearInterval(this.timer);
        }
        
        // Reset all variables
        this.currentIndex = 0;
        this.startTime = null;
        this.endTime = null;
        this.testActive = false;
        this.testComplete = false;
        this.keystrokeBuffer = [];
        this.waveformData = [];
        
        // Clear input
        document.getElementById('typingInput').value = '';
        
        // Show start screen
        document.getElementById('resultsScreen').style.display = 'none';
        document.getElementById('testScreen').style.display = 'none';
        document.getElementById('startScreen').style.display = 'block';
    }
    
    shareResults() {
        const results = {
            wpm: document.getElementById('resultWPM').textContent,
            accuracy: document.getElementById('resultAccuracy').textContent,
            grade: document.getElementById('resultGrade').textContent,
            performanceLevel: document.getElementById('performanceLevel').querySelector('p').textContent
        };
        
        const shareText = `🧠 NEURO-SYNCH Typing Test Results\n\n⚡ WPM: ${results.wpm}\n🎯 Accuracy: ${results.accuracy}\n🏆 Grade: ${results.grade}\n\n${results.performanceLevel}\n\nTry it yourself at NEURO-SYNCH!`;
        
        if (navigator.share) {
            navigator.share({
                title: 'My NEURO-SYNCH Results',
                text: shareText
            }).catch(err => console.log('Share failed:', err));
        } else {
            // Copy to clipboard
            navigator.clipboard.writeText(shareText).then(() => {
                alert('✓ Results copied to clipboard!');
            }).catch(err => {
                console.error('Copy failed:', err);
            });
        }
    }
}

// Initialize app
let typingTest;
document.addEventListener('DOMContentLoaded', () => {
    typingTest = new TypingTest();
});
