from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import numpy as np
from datetime import datetime
import json
from collections import deque
import math
import random

app = Flask(__name__)
CORS(app)

# In-memory storage for user data (use database in production)
user_baselines = {}
user_history = {}
session_data = {}

# Typing test word pools
COMMON_WORDS = [
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "it",
    "for", "not", "on", "with", "he", "as", "you", "do", "at", "this",
    "but", "his", "by", "from", "they", "we", "say", "her", "she", "or",
    "an", "will", "my", "one", "all", "would", "there", "their", "what",
    "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
    "when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
    "people", "into", "year", "your", "good", "some", "could", "them", "see", "other",
    "than", "then", "now", "look", "only", "come", "its", "over", "think", "also",
    "back", "after", "use", "two", "how", "our", "work", "first", "well", "way",
    "even", "new", "want", "because", "any", "these", "give", "day", "most", "us"
]

SENTENCES = [
    "The quick brown fox jumps over the lazy dog near the riverbank.",
    "Technology advances rapidly in modern society and changes our daily lives.",
    "Scientists discover new phenomena through careful observation and analysis.",
    "Artificial intelligence transforms how we interact with digital systems today.",
    "Music connects people across cultures and creates emotional experiences.",
    "Education empowers individuals to achieve their dreams and build futures.",
    "Nature provides countless wonders that inspire creativity and innovation.",
    "Communication skills remain essential in professional and personal relationships.",
    "Innovation drives progress and solves complex problems facing humanity.",
    "Research reveals insights that expand our understanding of the universe."
]

def generate_typing_test(mode='words', duration=60):
    """Generate text for typing test"""
    if mode == 'words':
        # Generate word list
        num_words = int(duration * 3)  # Assume 3 words per second average
        words = random.choices(COMMON_WORDS, k=num_words)
        return ' '.join(words)
    elif mode == 'sentences':
        # Generate sentence list
        num_sentences = int(duration / 6)  # Assume 6 seconds per sentence
        sentences = random.choices(SENTENCES, k=max(num_sentences, 5))
        return ' '.join(sentences)
    else:
        return ' '.join(random.choices(COMMON_WORDS, k=50))

class TypingTestAnalyzer:
    """Analyzes typing test performance"""
    
    def analyze_test_results(self, typed_text, target_text, time_taken, keystroke_events):
        """Comprehensive typing test analysis"""
        
        # Basic metrics
        typed_words = typed_text.split()
        target_words = target_text.split()
        
        correct_chars = sum(1 for i, char in enumerate(typed_text) 
                           if i < len(target_text) and char == target_text[i])
        total_chars = len(typed_text)
        
        # Words per minute (WPM)
        wpm = (len(typed_words) / time_taken) * 60 if time_taken > 0 else 0
        
        # Accuracy
        accuracy = (correct_chars / max(len(target_text), 1)) * 100
        
        # Consistency score (based on timing variance)
        if keystroke_events:
            dwell_times = [e['dwellTime'] for e in keystroke_events if e.get('dwellTime', 0) > 0]
            flight_times = [e['flightTime'] for e in keystroke_events if e.get('flightTime', 0) > 0]
            
            if dwell_times and flight_times:
                dwell_cv = (np.std(dwell_times) / np.mean(dwell_times)) * 100 if np.mean(dwell_times) > 0 else 0
                flight_cv = (np.std(flight_times) / np.mean(flight_times)) * 100 if np.mean(flight_times) > 0 else 0
                consistency = max(0, 100 - ((dwell_cv + flight_cv) / 2))
            else:
                consistency = 50
        else:
            consistency = 50
        
        # Error analysis
        total_errors = abs(len(typed_text) - len(target_text))
        error_rate = (total_errors / max(len(target_text), 1)) * 100
        
        # Performance grade
        grade = self.calculate_grade(wpm, accuracy, consistency)
        
        # Neurological insights
        neuro_insights = self.generate_neuro_insights(
            wpm, accuracy, consistency, keystroke_events
        )
        
        return {
            'wpm': round(wpm, 1),
            'accuracy': round(accuracy, 1),
            'consistency': round(consistency, 1),
            'correctChars': correct_chars,
            'totalChars': len(target_text),
            'errorRate': round(error_rate, 1),
            'timeTaken': round(time_taken, 1),
            'grade': grade,
            'neuroInsights': neuro_insights,
            'performanceLevel': self.get_performance_level(wpm, accuracy)
        }
    
    def calculate_grade(self, wpm, accuracy, consistency):
        """Calculate overall performance grade"""
        # Weighted score
        score = (wpm * 0.4) + (accuracy * 0.4) + (consistency * 0.2)
        
        if score >= 85:
            return 'A+'
        elif score >= 75:
            return 'A'
        elif score >= 65:
            return 'B+'
        elif score >= 55:
            return 'B'
        elif score >= 45:
            return 'C+'
        elif score >= 35:
            return 'C'
        else:
            return 'D'
    
    def get_performance_level(self, wpm, accuracy):
        """Get performance level description"""
        if wpm >= 80 and accuracy >= 95:
            return 'Expert Typist - Professional Level'
        elif wpm >= 60 and accuracy >= 90:
            return 'Advanced Typist - Above Average'
        elif wpm >= 40 and accuracy >= 85:
            return 'Intermediate Typist - Average Level'
        elif wpm >= 25 and accuracy >= 75:
            return 'Beginner Typist - Developing Skills'
        else:
            return 'Novice Typist - Practice Recommended'
    
    def generate_neuro_insights(self, wpm, accuracy, consistency, keystroke_events):
        """Generate neurological insights from typing pattern"""
        insights = []
        
        # WPM insights
        if wpm >= 70:
            insights.append("🚀 Exceptional motor processing speed detected. Your brain-to-finger coordination is in the top 10%.")
        elif wpm >= 50:
            insights.append("⚡ Strong cognitive-motor integration. Your neural pathways are well-trained.")
        elif wpm >= 30:
            insights.append("💭 Moderate processing speed. Regular practice can enhance neural efficiency.")
        else:
            insights.append("🎯 Developing motor skills. Focus on accuracy first, speed will follow naturally.")
        
        # Accuracy insights
        if accuracy >= 95:
            insights.append("🎯 Superior attention control and error monitoring. Excellent prefrontal cortex function.")
        elif accuracy >= 85:
            insights.append("✅ Good focus and quality control. Minor lapses in attention detected.")
        else:
            insights.append("⚠️ Attention fragmentation detected. Consider minimizing distractions during typing.")
        
        # Consistency insights
        if consistency >= 80:
            insights.append("📊 Highly consistent rhythm indicates stable neurological state and low cognitive fatigue.")
        elif consistency >= 60:
            insights.append("📈 Moderate rhythm variability. Some cognitive load fluctuation observed.")
        else:
            insights.append("📉 High rhythm variability suggests cognitive stress or motor control irregularity.")
        
        # Keystroke pattern analysis
        if keystroke_events:
            error_keys = sum(1 for e in keystroke_events if e.get('isBackspace', False))
            error_percentage = (error_keys / len(keystroke_events)) * 100
            
            if error_percentage > 15:
                insights.append("🔄 High correction rate ({}%) indicates perfectionist tendency or working memory load.".format(round(error_percentage, 1)))
        
        return insights

class NeuroAnalyzer:
    def __init__(self):
        self.baseline_samples = 50  # Number of samples for baseline
        
    def calculate_entropy(self, values):
        """Calculate Shannon entropy of timing values"""
        if len(values) < 2:
            return 0.0
        
        # Bin the values
        hist, _ = np.histogram(values, bins=10)
        hist = hist[hist > 0]  # Remove zero bins
        probabilities = hist / hist.sum()
        
        # Shannon entropy
        entropy = -np.sum(probabilities * np.log2(probabilities))
        return float(entropy)
    
    def calculate_cognitive_load_index(self, current_metrics, baseline_metrics):
        """Calculate cognitive load based on deviation from baseline"""
        if not baseline_metrics:
            return 50.0  # Neutral score
        
        # Calculate percentage deviations
        dwell_deviation = abs(current_metrics['avg_dwell'] - baseline_metrics['avg_dwell']) / baseline_metrics['avg_dwell'] * 100
        flight_deviation = abs(current_metrics['avg_flight'] - baseline_metrics['avg_flight']) / baseline_metrics['avg_flight'] * 100
        entropy_deviation = abs(current_metrics['entropy'] - baseline_metrics['entropy']) / max(baseline_metrics['entropy'], 0.01) * 100
        
        # Weighted cognitive load score (0-100, higher = more load)
        load_score = (dwell_deviation * 0.3 + flight_deviation * 0.4 + entropy_deviation * 0.3)
        return min(100.0, load_score)
    
    def calculate_neuro_health_index(self, cognitive_load, error_rate, rhythm_stability):
        """Calculate Neuro Health Index (0-100, higher = better)"""
        # Invert cognitive load (high load = lower health)
        load_component = max(0, 100 - cognitive_load)
        
        # Error rate component (0-20 range normalized)
        error_component = max(0, 100 - (error_rate * 5))
        
        # Rhythm stability (low variance = high stability)
        stability_component = max(0, 100 - rhythm_stability)
        
        # Weighted NHI
        nhi = (load_component * 0.5 + error_component * 0.3 + stability_component * 0.2)
        return round(nhi, 1)
    
    def analyze_keystroke_data(self, keystroke_events, user_id="default"):
        """Main analysis function"""
        if len(keystroke_events) < 5:
            return {
                'status': 'insufficient_data',
                'message': 'Need more keystrokes for analysis'
            }
        
        # Extract timing metrics
        dwell_times = [e['dwellTime'] for e in keystroke_events if e['dwellTime'] > 0]
        flight_times = [e['flightTime'] for e in keystroke_events if e['flightTime'] > 0]
        
        if not dwell_times or not flight_times:
            return {'status': 'insufficient_data'}
        
        # Calculate current metrics
        current_metrics = {
            'avg_dwell': np.mean(dwell_times),
            'std_dwell': np.std(dwell_times),
            'avg_flight': np.mean(flight_times),
            'std_flight': np.std(flight_times),
            'entropy': self.calculate_entropy(dwell_times + flight_times),
            'total_keystrokes': len(keystroke_events),
            'timestamp': datetime.now().isoformat()
        }
        
        # Initialize or update baseline
        if user_id not in user_baselines:
            user_baselines[user_id] = {
                'samples': [],
                'established': False
            }
        
        # Add to baseline samples
        if not user_baselines[user_id]['established']:
            user_baselines[user_id]['samples'].append(current_metrics)
            
            if len(user_baselines[user_id]['samples']) >= self.baseline_samples:
                # Calculate baseline
                samples = user_baselines[user_id]['samples']
                user_baselines[user_id]['baseline'] = {
                    'avg_dwell': np.mean([s['avg_dwell'] for s in samples]),
                    'avg_flight': np.mean([s['avg_flight'] for s in samples]),
                    'entropy': np.mean([s['entropy'] for s in samples])
                }
                user_baselines[user_id]['established'] = True
        
        # Calculate analysis metrics
        baseline = user_baselines[user_id].get('baseline', current_metrics)
        
        cognitive_load = self.calculate_cognitive_load_index(current_metrics, baseline)
        error_rate = sum(1 for e in keystroke_events if e.get('isBackspace', False)) / len(keystroke_events) * 100
        rhythm_stability = current_metrics['std_dwell'] / max(current_metrics['avg_dwell'], 1) * 100
        
        nhi = self.calculate_neuro_health_index(cognitive_load, error_rate, rhythm_stability)
        
        # Store in history
        if user_id not in user_history:
            user_history[user_id] = deque(maxlen=100)
        
        history_entry = {
            'timestamp': datetime.now().isoformat(),
            'nhi': nhi,
            'cognitive_load': cognitive_load,
            'entropy': current_metrics['entropy']
        }
        user_history[user_id].append(history_entry)
        
        # Generate AI insights
        insights = self.generate_insights(current_metrics, baseline, cognitive_load, nhi)
        
        return {
            'status': 'success',
            'neuroHealthIndex': nhi,
            'cognitiveLoad': round(cognitive_load, 1),
            'entropy': round(current_metrics['entropy'], 3),
            'avgDwellTime': round(current_metrics['avg_dwell'], 2),
            'avgFlightTime': round(current_metrics['avg_flight'], 2),
            'rhythmStability': round(rhythm_stability, 1),
            'errorRate': round(error_rate, 1),
            'baselineEstablished': user_baselines[user_id]['established'],
            'insights': insights,
            'alertLevel': self.get_alert_level(nhi),
            'history': list(user_history[user_id])[-20:]  # Last 20 entries
        }
    
    def generate_insights(self, current, baseline, cognitive_load, nhi):
        """Generate AI-powered insights"""
        insights = []
        
        # NHI-based insights
        if nhi >= 90:
            insights.append("🎯 Optimal cognitive state detected. Your neural processing is highly efficient.")
        elif nhi >= 70:
            insights.append("⚠️ Mild cognitive load detected. Consider taking short breaks every 30 minutes.")
        elif nhi >= 50:
            insights.append("🔴 Elevated cognitive stress. Your typing rhythm shows signs of mental fatigue.")
        else:
            insights.append("🚨 Critical deviation detected. Significant neurological strain indicated.")
        
        # Entropy insights
        if current['entropy'] > baseline.get('entropy', 0) * 1.3:
            insights.append(f"📊 Typing rhythm chaos increased by {round((current['entropy'] / baseline.get('entropy', 1) - 1) * 100)}%. This suggests elevated mental workload.")
        
        # Timing insights
        if current['avg_dwell'] > baseline.get('avg_dwell', 0) * 1.2:
            insights.append("⏱️ Key press duration increased, indicating possible motor planning delays or fatigue.")
        
        if current['avg_flight'] > baseline.get('avg_flight', 0) * 1.25:
            insights.append("🧠 Transition delays detected. Your brain-to-finger response time has slowed.")
        
        # Cognitive load specific
        if cognitive_load > 60:
            insights.append(f"💡 Recommendation: Take a 5-minute break. Sustained high cognitive load ({round(cognitive_load)}%) can impair decision-making.")
        
        return insights
    
    def get_alert_level(self, nhi):
        """Determine alert level based on NHI"""
        if nhi >= 90:
            return 'optimal'
        elif nhi >= 70:
            return 'mild'
        elif nhi >= 50:
            return 'elevated'
        else:
            return 'critical'

# Initialize analyzer
analyzer = NeuroAnalyzer()
typing_test_analyzer = TypingTestAnalyzer()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/test')
def typing_test():
    return render_template('typing-test.html')

@app.route('/api/test/generate', methods=['POST'])
def generate_test():
    """Generate typing test text"""
    data = request.json
    mode = data.get('mode', 'words')
    duration = data.get('duration', 60)
    
    test_text = generate_typing_test(mode, duration)
    
    return jsonify({
        'status': 'success',
        'testText': test_text,
        'mode': mode,
        'duration': duration
    })

@app.route('/api/test/submit', methods=['POST'])
def submit_test():
    """Analyze typing test results"""
    data = request.json
    
    typed_text = data.get('typedText', '')
    target_text = data.get('targetText', '')
    time_taken = data.get('timeTaken', 0)
    keystroke_events = data.get('keystrokes', [])
    
    # Analyze performance
    results = typing_test_analyzer.analyze_test_results(
        typed_text, target_text, time_taken, keystroke_events
    )
    
    # Also run neurological analysis
    if keystroke_events:
        neuro_analysis = analyzer.analyze_keystroke_data(
            keystroke_events, 
            data.get('userId', 'test_user')
        )
        results['neuroAnalysis'] = neuro_analysis
    
    return jsonify(results)

@app.route('/api/analyze', methods=['POST'])
def analyze():
    """Analyze keystroke data"""
    data = request.json
    keystroke_events = data.get('keystrokes', [])
    user_id = data.get('userId', 'default')
    
    result = analyzer.analyze_keystroke_data(keystroke_events, user_id)
    return jsonify(result)

@app.route('/api/baseline/reset', methods=['POST'])
def reset_baseline():
    """Reset user baseline"""
    data = request.json
    user_id = data.get('userId', 'default')
    
    if user_id in user_baselines:
        del user_baselines[user_id]
    if user_id in user_history:
        del user_history[user_id]
    
    return jsonify({'status': 'success', 'message': 'Baseline reset successfully'})

@app.route('/api/report', methods=['POST'])
def generate_report():
    """Generate detailed diagnostic report"""
    data = request.json
    user_id = data.get('userId', 'default')
    
    if user_id not in user_history or len(user_history[user_id]) == 0:
        return jsonify({'status': 'error', 'message': 'Insufficient data for report'})
    
    history = list(user_history[user_id])
    
    # Calculate trends
    recent_nhi = [h['nhi'] for h in history[-10:]]
    nhi_trend = "improving" if len(recent_nhi) > 1 and recent_nhi[-1] > recent_nhi[0] else "declining"
    
    avg_nhi = np.mean([h['nhi'] for h in history])
    avg_load = np.mean([h['cognitive_load'] for h in history])
    
    report = {
        'status': 'success',
        'generatedAt': datetime.now().isoformat(),
        'summary': {
            'totalSessions': len(history),
            'averageNHI': round(avg_nhi, 1),
            'averageCognitiveLoad': round(avg_load, 1),
            'trend': nhi_trend,
            'currentNHI': history[-1]['nhi']
        },
        'findings': [
            f"Average Neuro-Health Index: {round(avg_nhi, 1)}/100",
            f"Cognitive load trend: {nhi_trend.upper()}",
            f"Total monitoring sessions: {len(history)}",
            f"Current neurological state: {analyzer.get_alert_level(history[-1]['nhi']).upper()}"
        ],
        'recommendations': []
    }
    
    # Add recommendations based on data
    if avg_nhi < 70:
        report['recommendations'].append("Consider implementing regular break intervals (Pomodoro technique)")
        report['recommendations'].append("Monitor typing sessions for extended durations (>2 hours)")
    
    if avg_load > 50:
        report['recommendations'].append("High sustained cognitive load detected. Evaluate task complexity distribution.")
    
    report['recommendations'].append("Continue monitoring for longitudinal trend analysis")
    
    return jsonify(report)

if __name__ == '__main__':
    print("🧠 NEURO-SYNCH 2.0 Server Starting...")
    print("📍 Access the application at: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
