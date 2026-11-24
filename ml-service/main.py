from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
from dotenv import load_dotenv
from app.models.performance_predictor import PerformancePredictor, InjuryRiskAssessor

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configuration
app.config['PORT'] = int(os.getenv('PORT', 5001))
app.config['BACKEND_URL'] = os.getenv('BACKEND_URL', 'http://localhost:5000')

# Initialize predictors
performance_predictor = PerformancePredictor()
injury_assessor = InjuryRiskAssessor()

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'OK',
        'message': 'ML Service is running',
        'service': 'Sports Performance ML API',
        'backend_url': app.config['BACKEND_URL']
    }), 200

# Predict performance endpoint
@app.route('/api/predict/performance', methods=['POST'])
def predict_performance():
    try:
        data = request.get_json()
        athlete_id = data.get('athleteId')
        auth_token = request.headers.get('Authorization')
        
        if not athlete_id:
            return jsonify({
                'success': False,
                'message': 'athleteId is required'
            }), 400
        
        # Fetch performance history from backend
        backend_url = f"{app.config['BACKEND_URL']}/api/performance"
        headers = {}
        if auth_token:
            headers['Authorization'] = auth_token
        
        try:
            response = requests.get(backend_url, headers=headers, timeout=5)
            
            if response.status_code == 200:
                performance_data = response.json()
                performances = performance_data.get('data', [])
                
                # Run prediction
                prediction = performance_predictor.predict_next_performance(performances)
                
                return jsonify({
                    'success': True,
                    'data': prediction,
                    'dataPoints': len(performances)
                }), 200
            else:
                # Backend error - return with mock data
                return jsonify({
                    'success': True,
                    'data': {
                        'predictedRating': 0.0,
                        'confidence': 0.0,
                        'trend': 'no_data',
                        'recommendations': [
                            'Unable to fetch performance data',
                            'Please ensure you have recorded performances'
                        ]
                    },
                    'dataPoints': 0
                }), 200
                
        except requests.exceptions.RequestException as e:
            print(f"Backend connection error: {e}")
            return jsonify({
                'success': True,
                'data': {
                    'predictedRating': 0.0,
                    'confidence': 0.0,
                    'trend': 'no_data',
                    'recommendations': [
                        'Unable to connect to backend service',
                        'Please check if backend is running'
                    ]
                },
                'dataPoints': 0
            }), 200
        
    except Exception as e:
        print(f"Prediction error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

# Injury risk assessment endpoint
@app.route('/api/predict/injury-risk', methods=['POST'])
def predict_injury_risk():
    try:
        data = request.get_json()
        athlete_id = data.get('athleteId')
        auth_token = request.headers.get('Authorization')
        
        if not athlete_id:
            return jsonify({
                'success': False,
                'message': 'athleteId is required'
            }), 400
        
        # Fetch performance history from backend
        backend_url = f"{app.config['BACKEND_URL']}/api/performance"
        headers = {}
        if auth_token:
            headers['Authorization'] = auth_token
        
        try:
            response = requests.get(backend_url, headers=headers, timeout=5)
            
            if response.status_code == 200:
                performance_data = response.json()
                performances = performance_data.get('data', [])
                
                # Run injury risk assessment
                risk_assessment = injury_assessor.assess_injury_risk(performances)
                
                return jsonify({
                    'success': True,
                    'data': risk_assessment,
                    'dataPoints': len(performances)
                }), 200
            else:
                # Backend error
                return jsonify({
                    'success': True,
                    'data': {
                        'riskLevel': 'unknown',
                        'riskScore': 0.0,
                        'factors': ['Unable to fetch performance data'],
                        'recommendations': ['Please record more training sessions']
                    },
                    'dataPoints': 0
                }), 200
                
        except requests.exceptions.RequestException as e:
            print(f"Backend connection error: {e}")
            return jsonify({
                'success': True,
                'data': {
                    'riskLevel': 'unknown',
                    'riskScore': 0.0,
                    'factors': ['Backend service unavailable'],
                    'recommendations': ['Please check backend connection']
                },
                'dataPoints': 0
            }), 200
        
    except Exception as e:
        print(f"Risk assessment error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

if __name__ == '__main__':
    port = app.config['PORT']
    print(f"\n{'='*50}")
    print(f"🤖 ML Service starting on port {port}")
    print(f"📊 Performance Predictor: Active")
    print(f"🏥 Injury Risk Assessor: Active")
    print(f"🔗 Backend URL: {app.config['BACKEND_URL']}")
    print(f"{'='*50}\n")
    app.run(host='0.0.0.0', port=port, debug=True)