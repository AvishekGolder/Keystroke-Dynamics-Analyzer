// NEURO-SYNCH 2.0 - Main Application
class NeuroSynch {
    constructor() {
        this.keystrokeBuffer = [];
        this.lastKeyTime = null;
        this.userId = 'user_' + Math.random().toString(36).substr(2, 9);
        this.analysisInterval = null;
        this.waveformData = [];
        this.trendData = [];
        this.baselineProgress = 0;
        
        // Typing challenge
        this.challengeMode = false;
        this.challengeText = '';
        this.challengeStartTime = null;
        this.challengeTimer = null;
        this.challengeDuration = 60;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.initializeWaveform();
        this.initializeTrendChart();
        this.startContinuousAnalysis();
        console.log('🧠 NEURO-SYNCH 2.0 Initialized');
    }
    
    setupEventListeners() {
        const typingArea = document.getElementById('typingArea');
        
        // Keystroke monitoring
        typingArea.addEventListener('keydown', (e) => this.handleKeyDown(e));
        typingArea.addEventListener('keyup', (e) => this.handleKeyUp(e));
        typingArea.addEventListener('input', (e) => this.handleInput(e));
        
        // Button listeners
        document.getElementById('generateReport').addEventListener('click', () => this.generateReport());
        document.getElementById('resetBaseline').addEventListener('click', () => this.resetBaseline());
        document.getElementById('cognitiveChallenge').addEventListener('click', () => this.startCognitiveChallenge());
        
        // Typing challenge
        document.getElementById('loadTestBtn').addEventListener('click', () => this.loadTypingChallenge());
        document.getElementById('newChallengeBtn')?.addEventListener('click', () => {
            bootstrap.Modal.getInstance(document.getElementById('challengeResultsModal')).hide();
            this.loadTypingChallenge();
        });
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
        
        // Store for dwell time calculation
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
            this.updateKeystrokeCount();
            
            // Add to waveform
            this.waveformData.push({
                time: Date.now(),
                value: dwellTime
            });
            
            // Keep last 100 points
            if (this.waveformData.length > 100) {
                this.waveformData.shift();
            }
            
            this.drawWaveform();
        }
    }
    
    updateKeystrokeCount() {
        document.getElementById('keystrokeCount').textContent = 
            `${this.keystrokeBuffer.length} keystrokes`;
    }
    
    startContinuousAnalysis() {
        // Analyze every 3 seconds if we have data
        this.analysisInterval = setInterval(() => {
            if (this.keystrokeBuffer.length >= 5) {
                this.analyzeKeystrokes();
            }
        }, 3000);
    }
    
    async analyzeKeystrokes() {
        if (this.keystrokeBuffer.length < 5) return;
        
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    keystrokes: this.keystrokeBuffer,
                    userId: this.userId
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                this.updateDashboard(data);
                this.updateInsights(data.insights, data.alertLevel);
                this.updateTrendChart(data);
                this.updateBaselineProgress(data);
            }
            
        } catch (error) {
            console.error('Analysis error:', error);
        }
    }
    
    updateDashboard(data) {
        // Update NHI
        const nhiDisplay = document.getElementById('nhiDisplay');
        const nhiValue = nhiDisplay.querySelector('.nhi-value');
        const nhiLabel = nhiDisplay.querySelector('.nhi-label');
        
        nhiValue.textContent = Math.round(data.neuroHealthIndex);
        
        // Update label based on score
        if (data.neuroHealthIndex >= 90) {
            nhiLabel.textContent = 'Optimal Neural State';
            nhiLabel.style.color = '#10b981';
        } else if (data.neuroHealthIndex >= 70) {
            nhiLabel.textContent = 'Mild Cognitive Load';
            nhiLabel.style.color = '#f59e0b';
        } else if (data.neuroHealthIndex >= 50) {
            nhiLabel.textContent = 'Elevated Risk';
            nhiLabel.style.color = '#ef4444';
        } else {
            nhiLabel.textContent = 'Critical Deviation';
            nhiLabel.style.color = '#dc2626';
        }
        
        // Update metrics
        document.getElementById('dwellTime').textContent = 
            `${data.avgDwellTime.toFixed(1)} ms`;
        document.getElementById('flightTime').textContent = 
            `${data.avgFlightTime.toFixed(1)} ms`;
        document.getElementById('entropy').textContent = 
            `${data.entropy.toFixed(3)} bits`;
        document.getElementById('cognitiveLoad').textContent = 
            `${data.cognitiveLoad.toFixed(1)}%`;
        document.getElementById('errorRate').textContent = 
            `${data.errorRate.toFixed(1)}%`;
        
        // Show alerts if needed
        if (data.alertLevel === 'critical' || data.alertLevel === 'elevated') {
            this.showAlert(data.alertLevel, data.neuroHealthIndex);
        }
    }
    
    updateInsights(insights, alertLevel) {
        const container = document.getElementById('insightsContainer');
        container.innerHTML = '';
        
        insights.forEach((insight, index) => {
            const insightItem = document.createElement('div');
            insightItem.className = 'insight-item';
            
            // Add class based on alert level
            if (alertLevel === 'critical') {
                insightItem.classList.add('critical');
            } else if (alertLevel === 'elevated') {
                insightItem.classList.add('warning');
            }
            
            // Extract emoji and text
            const emojiMatch = insight.match(/^(🎯|⚠️|🔴|🚨|📊|⏱️|🧠|💡)/);
            const emoji = emojiMatch ? emojiMatch[0] : '💡';
            const text = insight.replace(/^(🎯|⚠️|🔴|🚨|📊|⏱️|🧠|💡)\s*/, '');
            
            insightItem.innerHTML = `
                <div class="insight-icon">${emoji}</div>
                <div class="insight-text">${text}</div>
            `;
            
            container.appendChild(insightItem);
        });
    }
    
    updateBaselineProgress(data) {
        if (data.baselineEstablished) {
            document.getElementById('baselineProgress').style.width = '100%';
            document.getElementById('baselineStatus').textContent = 
                '✓ Baseline established - monitoring active';
            document.getElementById('baselineStatus').style.color = '#10b981';
        } else {
            // Estimate progress (assuming 50 samples needed)
            const progress = Math.min(100, (this.keystrokeBuffer.length / 50) * 100);
            document.getElementById('baselineProgress').style.width = progress + '%';
            document.getElementById('baselineStatus').textContent = 
                `Establishing baseline... ${this.keystrokeBuffer.length}/50 samples`;
        }
    }
    
    showAlert(level, nhi) {
        const alertCard = document.getElementById('alertCard');
        const alertContent = document.getElementById('alertContent');
        
        alertCard.style.display = 'block';
        
        if (level === 'critical') {
            alertContent.innerHTML = `
                <strong>🚨 Critical Alert</strong><br>
                Significant neurological deviation detected (NHI: ${Math.round(nhi)}).<br>
                Recommendation: Take immediate break and consult healthcare provider if symptoms persist.
            `;
        } else if (level === 'elevated') {
            alertContent.innerHTML = `
                <strong>⚠️ Elevated Risk Alert</strong><br>
                Cognitive strain levels elevated (NHI: ${Math.round(nhi)}).<br>
                Recommendation: Take a 10-minute break and reduce task complexity.
            `;
        }
    }
    
    drawWaveform() {
        const canvas = document.getElementById('waveformCanvas');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.fillStyle = 'rgba(10, 10, 15, 0.8)';
        ctx.fillRect(0, 0, width, height);
        
        if (this.waveformData.length < 2) return;
        
        // Draw grid
        ctx.strokeStyle = 'rgba(0, 217, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < height; i += 40) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(width, i);
            ctx.stroke();
        }
        
        // Draw waveform
        const maxValue = Math.max(...this.waveformData.map(d => d.value), 200);
        const xStep = width / (this.waveformData.length - 1);
        
        // Gradient fill
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(0, 217, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(124, 58, 237, 0.1)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, height);
        
        this.waveformData.forEach((point, index) => {
            const x = index * xStep;
            const y = height - (point.value / maxValue) * (height - 20);
            
            if (index === 0) {
                ctx.lineTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();
        
        // Draw line
        ctx.strokeStyle = '#00d9ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        this.waveformData.forEach((point, index) => {
            const x = index * xStep;
            const y = height - (point.value / maxValue) * (height - 20);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
    }
    
    initializeWaveform() {
        // Initial draw
        this.drawWaveform();
    }
    
    initializeTrendChart() {
        this.drawTrendChart();
    }
    
    updateTrendChart(data) {
        if (data.history && data.history.length > 0) {
            this.trendData = data.history;
            this.drawTrendChart();
        }
    }
    
    drawTrendChart() {
        const canvas = document.getElementById('trendChart');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.fillStyle = 'rgba(10, 10, 15, 0.8)';
        ctx.fillRect(0, 0, width, height);
        
        if (this.trendData.length < 2) {
            // Show placeholder
            ctx.fillStyle = '#9ca3af';
            ctx.font = '16px "IBM Plex Mono"';
            ctx.textAlign = 'center';
            ctx.fillText('Collecting trend data...', width / 2, height / 2);
            return;
        }
        
        // Draw grid
        ctx.strokeStyle = 'rgba(0, 217, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < height; i += 50) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(width, i);
            ctx.stroke();
        }
        
        // Draw NHI trend line
        const xStep = width / (this.trendData.length - 1);
        
        // Gradient fill
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.05)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, height);
        
        this.trendData.forEach((point, index) => {
            const x = index * xStep;
            const y = height - (point.nhi / 100) * (height - 40);
            
            if (index === 0) {
                ctx.lineTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();
        
        // Draw line
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        this.trendData.forEach((point, index) => {
            const x = index * xStep;
            const y = height - (point.nhi / 100) * (height - 40);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw reference lines
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, height - (70 / 100) * (height - 40));
        ctx.lineTo(width, height - (70 / 100) * (height - 40));
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Labels
        ctx.fillStyle = '#9ca3af';
        ctx.font = '12px "IBM Plex Mono"';
        ctx.textAlign = 'left';
        ctx.fillText('NHI: 100', 10, 20);
        ctx.fillText('70', 10, height - (70 / 100) * (height - 40));
        ctx.fillText('0', 10, height - 10);
    }
    
    async generateReport() {
        try {
            const response = await fetch('/api/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.userId
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                this.displayReport(data);
            } else {
                alert('Insufficient data for report generation. Please type more to establish baseline.');
            }
            
        } catch (error) {
            console.error('Report generation error:', error);
            alert('Error generating report');
        }
    }
    
    displayReport(data) {
        const reportContent = document.getElementById('reportContent');
        
        const html = `
            <div style="padding: 1rem;">
                <h4>📋 Neuro-Diagnostic Summary of Avishe Golder</h4>
                <p style="color: #9ca3af; font-size: 0.85rem;">
                    Generated: ${new Date(data.generatedAt).toLocaleString()}
                </p>
                
                <h4>📊 Key Metrics</h4>
                <ul>
                    <li><strong>Total Sessions:</strong> ${data.summary.totalSessions}</li>
                    <li><strong>Average NHI:</strong> ${data.summary.averageNHI}/100</li>
                    <li><strong>Current NHI:</strong> ${data.summary.currentNHI}/100</li>
                    <li><strong>Avg Cognitive Load:</strong> ${data.summary.averageCognitiveLoad}%</li>
                    <li><strong>Trend:</strong> ${data.summary.trend.toUpperCase()}</li>
                </ul>
                
                <h4>🔬 Findings</h4>
                <ul>
                    ${data.findings.map(f => `<li>${f}</li>`).join('')}
                </ul>
                
                <h4>💡 Recommendations</h4>
                <ul>
                    ${data.recommendations.map(r => `<li>${r}</li>`).join('')}
                </ul>
                
                <h4>⚕️ Clinical Notes</h4>
                <p style="line-height: 1.8;">
                    This report is generated using AI-powered keystroke dynamics analysis. 
                    The Neuro-Health Index (NHI) reflects deviation from your personalized baseline.
                    Sustained low NHI values may indicate cognitive fatigue or stress.
                    This tool is for screening purposes only and does not replace professional medical diagnosis.
                </p>
            </div>
        `;
        
        reportContent.innerHTML = html;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('reportModal'));
        modal.show();
    }
    
    async resetBaseline() {
        if (confirm('This will reset your neurological baseline. Continue?')) {
            try {
                await fetch('/api/baseline/reset', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId: this.userId
                    })
                });
                
                // Reset local data
                this.keystrokeBuffer = [];
                this.waveformData = [];
                this.trendData = [];
                
                // Reset UI
                document.getElementById('keystrokeCount').textContent = '0 keystrokes';
                document.getElementById('baselineProgress').style.width = '0%';
                document.getElementById('baselineStatus').textContent = 'Establishing baseline... 0/50 samples';
                document.getElementById('alertCard').style.display = 'none';
                
                // Reset insights
                document.getElementById('insightsContainer').innerHTML = `
                    <div class="insight-item initial">
                        <div class="insight-icon">💡</div>
                        <div class="insight-text">
                            Baseline reset. Start typing to begin new monitoring session.
                        </div>
                    </div>
                `;
                
                alert('✓ Baseline reset successfully');
                
            } catch (error) {
                console.error('Reset error:', error);
                alert('Error resetting baseline');
            }
        }
    }
    
    startCognitiveChallenge() {
        // Generate random math problem
        const num1 = Math.floor(Math.random() * 50) + 20;
        const num2 = Math.floor(Math.random() * 30) + 10;
        
        document.getElementById('mathQuestion').textContent = 
            `Calculate: ${num1} × ${num2} = ?`;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('challengeModal'));
        modal.show();
    }
    
    async loadTypingChallenge() {
        try {
            // Fetch challenge text
            const response = await fetch('/api/test/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'sentences',
                    duration: 60
                })
            });
            
            const data = await response.json();
            this.challengeText = data.testText;
            
            // Show challenge mode
            document.getElementById('challengeMode').style.display = 'block';
            this.renderChallengeText();
            
            // Clear typing area
            document.getElementById('typingArea').value = '';
            document.getElementById('typingArea').placeholder = 'Type the text shown above...';
            
            // Reset challenge state
            this.challengeMode = true;
            this.challengeStartTime = null;
            this.challengeTimer = null;
            this.keystrokeBuffer = [];
            
            // Update button
            document.getElementById('loadTestBtn').textContent = '🔄 New Challenge';
            document.getElementById('loadTestBtn').classList.remove('btn-success');
            document.getElementById('loadTestBtn').classList.add('btn-warning');
            
        } catch (error) {
            console.error('Error loading challenge:', error);
            alert('Failed to load challenge. Please try again.');
        }
    }
    
    renderChallengeText() {
        const targetBox = document.getElementById('targetTextBox');
        targetBox.innerHTML = '';
        
        this.challengeText.split('').forEach((char, index) => {
            const span = document.createElement('span');
            span.className = 'char';
            span.textContent = char;
            span.dataset.index = index;
            targetBox.appendChild(span);
        });
        
        // Highlight first character
        if (targetBox.querySelector('.char')) {
            targetBox.querySelector('.char').classList.add('current');
        }
    }
    
    handleInput(event) {
        if (!this.challengeMode) return;
        
        const typedText = event.target.value;
        
        // Start timer on first keystroke
        if (!this.challengeStartTime && typedText.length > 0) {
            this.challengeStartTime = Date.now();
            this.startChallengeTimer();
        }
        
        // Update display
        this.updateChallengeDisplay(typedText);
        
        // Check if challenge complete
        if (typedText.length >= this.challengeText.length) {
            this.completeChallenge();
        }
    }
    
    updateChallengeDisplay(typedText) {
        const chars = document.querySelectorAll('#targetTextBox .char');
        let correctCount = 0;
        
        chars.forEach((char, index) => {
            char.classList.remove('correct', 'incorrect', 'current');
            
            if (index < typedText.length) {
                if (typedText[index] === this.challengeText[index]) {
                    char.classList.add('correct');
                    correctCount++;
                } else {
                    char.classList.add('incorrect');
                }
            } else if (index === typedText.length) {
                char.classList.add('current');
            }
        });
        
        // Update live stats
        const accuracy = typedText.length > 0 ? (correctCount / typedText.length) * 100 : 0;
        document.getElementById('challengeAccuracy').textContent = Math.round(accuracy) + '%';
        
        if (this.challengeStartTime) {
            const elapsedTime = (Date.now() - this.challengeStartTime) / 1000 / 60; // minutes
            const words = typedText.trim().split(/\s+/).length;
            const wpm = Math.round(words / elapsedTime);
            document.getElementById('challengeWPM').textContent = wpm + ' WPM';
        }
    }
    
    startChallengeTimer() {
        let timeLeft = this.challengeDuration;
        document.getElementById('challengeTimer').textContent = timeLeft + 's';
        
        this.challengeTimer = setInterval(() => {
            timeLeft--;
            document.getElementById('challengeTimer').textContent = timeLeft + 's';
            
            if (timeLeft <= 0) {
                this.completeChallenge();
            }
        }, 1000);
    }
    
    async completeChallenge() {
        if (!this.challengeMode) return;
        
        clearInterval(this.challengeTimer);
        this.challengeMode = false;
        
        const typedText = document.getElementById('typingArea').value;
        const timeTaken = (Date.now() - this.challengeStartTime) / 1000;
        
        // Submit for analysis
        try {
            const response = await fetch('/api/test/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    typedText: typedText,
                    targetText: this.challengeText,
                    timeTaken: timeTaken,
                    keystrokes: this.keystrokeBuffer,
                    userId: this.userId
                })
            });
            
            const results = await response.json();
            this.showChallengeResults(results);
            
        } catch (error) {
            console.error('Error submitting challenge:', error);
        }
        
        // Reset UI
        document.getElementById('challengeMode').style.display = 'none';
        document.getElementById('typingArea').value = '';
        document.getElementById('typingArea').placeholder = 'Start typing to activate neurological monitoring...';
        document.getElementById('loadTestBtn').textContent = '🎯 Load Typing Challenge';
        document.getElementById('loadTestBtn').classList.remove('btn-warning');
        document.getElementById('loadTestBtn').classList.add('btn-success');
    }
    
    showChallengeResults(results) {
        const content = document.getElementById('challengeResultsContent');
        
        content.innerHTML = `
            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="results-metric">
                        <div class="metric-value">${results.wpm}</div>
                        <div class="metric-label">Words Per Minute</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="results-metric">
                        <div class="metric-value">${results.accuracy}%</div>
                        <div class="metric-label">Accuracy</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="results-metric">
                        <div class="metric-value">${results.consistency}%</div>
                        <div class="metric-label">Consistency</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="results-metric">
                        <div class="metric-value">${results.grade}</div>
                        <div class="metric-label">Grade</div>
                    </div>
                </div>
            </div>
            
            <div class="performance-level-banner mb-4" style="text-align: center; padding: 1.5rem; background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(0, 217, 255, 0.2)); border: 2px solid rgba(16, 185, 129, 0.4); border-radius: 12px;">
                <h4 style="color: #10b981; margin-bottom: 0.5rem;">Performance Level</h4>
                <p style="font-size: 1.2rem; font-weight: 600; margin: 0;">${results.performanceLevel}</p>
            </div>
            
            <div class="challenge-insights">
                <h5 style="color: var(--primary-neural); margin-bottom: 1rem;">🧠 Neurological Insights</h5>
                ${results.neuroInsights.map(insight => `
                    <div class="insight-item">
                        ${insight}
                    </div>
                `).join('')}
            </div>
            
            ${results.neuroAnalysis && results.neuroAnalysis.status === 'success' ? `
                <div class="mt-4">
                    <h5 style="color: var(--primary-neural);">📊 Neural Metrics</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Neuro-Health Index:</strong> ${Math.round(results.neuroAnalysis.neuroHealthIndex)}/100</p>
                            <p><strong>Cognitive Load:</strong> ${Math.round(results.neuroAnalysis.cognitiveLoad)}%</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Avg Dwell Time:</strong> ${results.neuroAnalysis.avgDwellTime.toFixed(1)}ms</p>
                            <p><strong>Rhythm Entropy:</strong> ${results.neuroAnalysis.entropy.toFixed(3)} bits</p>
                        </div>
                    </div>
                </div>
            ` : ''}
        `;
        
        const modal = new bootstrap.Modal(document.getElementById('challengeResultsModal'));
        modal.show();
    }
}

// Initialize application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new NeuroSynch();
});

// Download report functionality
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('downloadReport')?.addEventListener('click', () => {
        const reportContent = document.getElementById('reportContent').innerText;
        const blob = new Blob([reportContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `neuro-synch-report-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    });
});
