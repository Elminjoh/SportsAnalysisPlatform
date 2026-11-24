import statistics
from datetime import datetime, timedelta


class PerformancePredictor:
    """
    Simple statistical performance predictor using moving averages and trend analysis.
    Works with both self-reported (personalRating) and coach-assessed sessions.
    """

    def _composite_score(self, p):
        """
        Derive a 1-10 performance score from whatever fields are available.
        Priority: personalRating → coach composite metrics (stored 0-100) → None
        """
        if p.get('personalRating') is not None:
            return float(p['personalRating'])

        # Coach assessment composites are stored 0-100 — scale to 1-10
        coach_fields = [
            p.get('metrics', {}).get('technical_composite'),
            p.get('metrics', {}).get('tactical_composite'),
            p.get('metrics', {}).get('physical_composite'),
            p.get('metrics', {}).get('psychological_composite'),
        ]
        available = [float(v) for v in coach_fields if v is not None]
        if available:
            avg_100 = statistics.mean(available)
            return round((avg_100 / 100) * 9 + 1, 2)  # scale to 1-10

        return None

    def predict_next_performance(self, performance_history):
        """
        Predicts the next performance rating based on historical data.
        """
        if not performance_history:
            return {
                'predictedRating': 5.0,
                'confidence': 0.0,
                'trend': 'insufficient_data',
                'recommendations': [
                    'Add more performance records for accurate predictions',
                    'Record at least 5 sessions for trend analysis'
                ]
            }

        # Extract scores using composite-aware helper
        ratings = [self._composite_score(p) for p in performance_history]
        ratings = [r for r in ratings if r is not None]

        if len(ratings) < 2:
            return {
                'predictedRating': ratings[0] if ratings else 5.0,
                'confidence': 0.3,
                'trend': 'stable',
                'recommendations': [
                    'Add more sessions to see performance trends',
                    'Maintain consistent training schedule'
                ]
            }

        # Moving average (last 5 sessions)
        recent_ratings = ratings[-5:] if len(ratings) >= 5 else ratings
        moving_avg = statistics.mean(recent_ratings)

        # Linear trend
        trend_direction = self._calculate_trend(ratings)

        # Predicted next rating
        predicted_rating = moving_avg + (trend_direction * 0.5)
        predicted_rating = max(1.0, min(10.0, predicted_rating))

        # Confidence — higher with more data and less variance
        std_dev = statistics.stdev(recent_ratings) if len(recent_ratings) > 1 else 0
        base_confidence = max(0.5, 1.0 - (std_dev / 10.0))
        data_confidence = min(0.95, 0.3 + (len(ratings) * 0.065))
        confidence = round(min(base_confidence, data_confidence), 2)

        trend_category = self._categorize_trend(trend_direction)

        recommendations = self._generate_recommendations(
            predicted_rating,
            trend_category,
            recent_ratings,
            performance_history
        )

        return {
            'predictedRating': round(predicted_rating, 1),
            'confidence': confidence,
            'trend': trend_category,
            'recommendations': recommendations
        }

    def _calculate_trend(self, ratings):
        if len(ratings) < 2:
            return 0.0

        n = len(ratings)
        x = list(range(n))
        y = ratings

        x_mean = statistics.mean(x)
        y_mean = statistics.mean(y)

        numerator   = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))

        return 0.0 if denominator == 0 else numerator / denominator

    def _categorize_trend(self, trend_value):
        if trend_value > 0.3:
            return 'improving'
        elif trend_value < -0.3:
            return 'declining'
        elif trend_value > 0.1:
            return 'slightly_improving'
        elif trend_value < -0.1:
            return 'slightly_declining'
        else:
            return 'stable'

    def _generate_recommendations(self, predicted_rating, trend, recent_ratings, history):
        recommendations = []

        if trend == 'improving':
            recommendations.append('Great progress! Keep up the current training intensity')
            recommendations.append('Consider gradually increasing workout difficulty')
        elif trend == 'declining':
            recommendations.append('Performance is declining — consider reviewing training plan')
            recommendations.append('Ensure adequate rest and recovery')
            recommendations.append('Check for signs of overtraining or fatigue')
        elif trend == 'stable':
            recommendations.append('Performance is steady — maintain consistency')
            recommendations.append('Consider varying training intensity to break plateaus')

        if predicted_rating >= 8.0:
            recommendations.append('Excellent performance level — focus on consistency')
        elif predicted_rating <= 4.0:
            recommendations.append('Focus on fundamentals and gradual improvement')

        if len(history) >= 7:
            recent_week = history[-7:]
            if len(recent_week) >= 4:
                recommendations.append('Good training frequency — continue regular sessions')
            else:
                recommendations.append('Consider increasing training frequency for better results')

        return recommendations[:4]


class InjuryRiskAssessor:
    """
    Injury risk assessment based on training load and patterns.
    Works with both athlete self-reported data (personalRating) and
    coach-assessed data (composite score from technique/speed/stamina etc.)
    """

    def _composite_score(self, p):
        """
        Derive a 1-10 performance score from whatever fields are available.
        Priority: personalRating → average of coach metrics → None
        """
        if p.get('personalRating') is not None:
            return float(p['personalRating'])

        coach_fields = [
            p.get('metrics', {}).get('technical_composite'),
            p.get('metrics', {}).get('tactical_composite'),
            p.get('metrics', {}).get('physical_composite'),
            p.get('metrics', {}).get('psychological_composite'),
        ]
        available = [float(v) for v in coach_fields if v is not None]
        if available:
            avg_100 = statistics.mean(available)
            return round((avg_100 / 100) * 9 + 1, 2)

        return None

    def assess_injury_risk(self, performance_history):
        """
        Assess injury risk based on training patterns.
        """
        if not performance_history:
            return self._insufficient_data(0)

        # ── Calendar-based 7-day window ───────────────────────────────────────
        now = datetime.utcnow()
        week_ago = now - timedelta(days=7)

        recent_sessions = []
        for p in performance_history:
            raw = p.get('sessionDate') or p.get('createdAt') or p.get('date') or p.get('performanceDate')
            if not raw:
                continue
            try:
                dt = datetime.fromisoformat(raw.replace('Z', '+00:00'))
                dt = dt.replace(tzinfo=None)
                if dt >= week_ago:
                    recent_sessions.append(p)
            except (ValueError, AttributeError):
                continue

        # Fall back to last 7 records if date parsing yields nothing
        if not recent_sessions:
            recent_sessions = performance_history[-7:]

        total_sessions = len(performance_history)
        data_quality = 'good' if total_sessions >= 5 else 'limited'

        if total_sessions < 1:
            return self._insufficient_data(0)

        risk_factors = []
        risk_score = 0.0

        # ── Factor 1: Training frequency ──────────────────────────────────────
        session_count = len(recent_sessions)

        if session_count >= 6:
            risk_score += 0.2
            risk_factors.append('High training frequency this week (6+ sessions)')
        elif session_count == 7:
            risk_score += 0.15
            risk_factors.append('No rest days in the last 7 days')

        # ── Factor 2: Training volume (duration) ──────────────────────────────
        total_duration = sum(p.get('duration', 0) or 0 for p in recent_sessions)

        if total_duration > 600:
            risk_score += 0.2
            risk_factors.append(f'High training volume this week ({round(total_duration/60, 1)} hrs)')
        elif total_duration > 420:
            risk_score += 0.1
            risk_factors.append(f'Moderately high training volume ({round(total_duration/60, 1)} hrs)')

        # ── Factor 3: Intensity ───────────────────────────────────────────────
        high_intensity_count = sum(
            1 for p in recent_sessions
            if (p.get('intensity') or '').lower() in ('high', 'maximum')
        )

        if session_count > 0:
            high_intensity_ratio = high_intensity_count / session_count
            if high_intensity_ratio >= 0.6:
                risk_score += 0.2
                risk_factors.append('Majority of sessions are high intensity')
            elif high_intensity_ratio >= 0.4:
                risk_score += 0.1
                risk_factors.append('Frequent high-intensity sessions this week')

        # ── Factor 4: Performance decline (composite-aware) ───────────────────
        if total_sessions >= 2:
            all_scores = [self._composite_score(p) for p in performance_history]
            all_scores = [s for s in all_scores if s is not None]

            if len(all_scores) >= 2:
                mid = max(1, len(all_scores) // 2)
                early_avg  = statistics.mean(all_scores[:mid])
                recent_avg = statistics.mean(all_scores[mid:])
                decline = early_avg - recent_avg

                if decline > 2.0:
                    risk_score += 0.25
                    risk_factors.append('Significant performance decline detected')
                elif decline > 1.0:
                    risk_score += 0.15
                    risk_factors.append('Gradual performance decline observed')

        # ── Factor 5: Injury history ──────────────────────────────────────────
        injury_count = sum(
            1 for p in performance_history
            if p.get('injury') or p.get('injuryNoted') or p.get('injuryOccurred')
        )

        if injury_count >= 2:
            risk_score += 0.2
            risk_factors.append(f'Multiple injuries on record ({injury_count} recorded injuries)')
        elif injury_count == 1:
            risk_score += 0.1
            risk_factors.append('Previous injury on record — monitor carefully')

        # ── Categorise risk ───────────────────────────────────────────────────
        if risk_score >= 0.6:
            risk_level = 'high'
        elif risk_score >= 0.35:
            risk_level = 'moderate'
        elif risk_score >= 0.1:
            risk_level = 'low'
        else:
            risk_level = 'minimal'
            if not risk_factors:
                risk_factors = ['Training load is well balanced']

        recommendations = self._generate_injury_recommendations(risk_level, risk_factors)

        if data_quality == 'limited':
            recommendations.append('Add more sessions for a more accurate risk assessment')

        return {
            'riskLevel':       risk_level,
            'riskScore':       round(min(risk_score, 1.0), 2),
            'factors':         risk_factors if risk_factors else ['No significant risk factors detected'],
            'recommendations': recommendations[:4],
            'dataPoints':      total_sessions
        }

    def _insufficient_data(self, count):
        return {
            'riskLevel':       'unknown',
            'riskScore':       0.0,
            'factors':         ['Insufficient data for risk assessment'],
            'recommendations': [
                'Record at least one training session to begin risk monitoring',
                'Track training intensity and duration consistently'
            ],
            'dataPoints':      count
        }

    def _generate_injury_recommendations(self, risk_level, factors):
        recommendations = []
        if risk_level == 'high':
            recommendations.extend([
                'Consider taking 2-3 rest days this week',
                'Reduce training intensity by 30-40%',
                'Focus on recovery activities (stretching, light cardio)',
                'Monitor for pain or unusual fatigue'
            ])
        elif risk_level == 'moderate':
            recommendations.extend([
                'Ensure at least 2 rest days per week',
                'Mix high and low intensity training',
                'Pay attention to proper warm-up and cool-down',
                'Consider active recovery sessions'
            ])
        elif risk_level == 'low':
            recommendations.extend([
                'Maintain current training balance',
                'Continue monitoring training load',
                'Ensure adequate sleep and nutrition'
            ])
        else:
            recommendations.extend([
                'Current training load is appropriate',
                'Keep up good training habits',
                'Continue balanced intensity distribution'
            ])
        return recommendations