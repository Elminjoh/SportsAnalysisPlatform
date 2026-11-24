/**
 * StatsBomb Premier League Data Importer
 * Run: node statsbomb_import.js
 * Place in: backend/
 */

require('dotenv').config();
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { sequelize } = require('./src/config/database');
const { User, Athlete, Performance, Sport } = require('./src/models');

const PYTHON = 'C:\\edb\\languagepack\\v3\\Python-3.10\\python.exe';
const TMP_SCRIPT = path.join(__dirname, '_tmp_statsbomb.py');

// ─── Run a Python script file and return parsed JSON ─────────────────────────

function runPython(scriptContent) {
  fs.writeFileSync(TMP_SCRIPT, scriptContent, 'utf8');
  try {
    const result = execSync(`"${PYTHON}" "${TMP_SCRIPT}"`, {
      maxBuffer: 50 * 1024 * 1024
    });
    return JSON.parse(result.toString());
  } finally {
    if (fs.existsSync(TMP_SCRIPT)) fs.unlinkSync(TMP_SCRIPT);
  }
}

// ─── Fetch matches ────────────────────────────────────────────────────────────

function getMatches() {
  console.log('📡 Fetching Premier League matches from StatsBomb...');
  return runPython(`
from statsbombpy import sb
import json
import warnings
warnings.filterwarnings('ignore')

matches = sb.matches(competition_id=2, season_id=44)
cols = ['match_id', 'match_date', 'home_team', 'away_team', 'home_score', 'away_score']
print(json.dumps(matches[cols].to_dict(orient='records')))
`);
}

// ─── Fetch lineup for a match ─────────────────────────────────────────────────

function getLineup(matchId) {
  return runPython(`
from statsbombpy import sb
import json
import warnings
warnings.filterwarnings('ignore')

lineups = sb.lineups(match_id=${matchId})
result = []
for team, players in lineups.items():
    for _, p in players.iterrows():
        result.append({
            'player_id': int(p['player_id']),
            'player_name': str(p['player_name']),
            'team': str(team),
            'positions': str(p.get('positions', ''))
        })
print(json.dumps(result))
`);
}

// ─── Aggregate player stats from match events ────────────────────────────────

function getPlayerStats(matchId) {
  return runPython(`
from statsbombpy import sb
import json
import warnings
import numpy as np
warnings.filterwarnings('ignore')

events = sb.events(match_id=${matchId})
stats = {}

for _, e in events.iterrows():
    pid = e.get('player_id')
    if pid is None or (isinstance(pid, float) and np.isnan(pid)):
        continue
    pid = int(pid)
    pname = str(e.get('player_name', ''))
    team  = str(e.get('team', ''))
    etype = str(e.get('type', ''))

    if pid not in stats:
        stats[pid] = {
            'player_id': pid,
            'player_name': pname,
            'team': team,
            'passes': 0,
            'passes_complete': 0,
            'shots': 0,
            'goals': 0,
            'assists': 0,
            'tackles': 0,
            'dribbles': 0,
            'fouls': 0,
            'carries': 0
        }

    s = stats[pid]

    if etype == 'Pass':
        s['passes'] += 1
        outcome = e.get('pass_outcome')
        if outcome is None or (isinstance(outcome, float) and np.isnan(outcome)):
            s['passes_complete'] += 1
    elif etype == 'Shot':
        s['shots'] += 1
        if str(e.get('shot_outcome', '')) == 'Goal':
            s['goals'] += 1
    elif etype == 'Tackle':
        s['tackles'] += 1
    elif etype == 'Dribble':
        s['dribbles'] += 1
    elif etype == 'Foul Committed':
        s['fouls'] += 1
    elif etype == 'Carry':
        s['carries'] += 1

print(json.dumps(list(stats.values())))
`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapPosition(posStr) {
  const s = posStr.toLowerCase();
  if (s.includes('goalkeeper'))                                   return 'Goalkeeper';
  if (s.includes('center back') || s.includes('centre back'))    return 'Centre-Back';
  if (s.includes('right back'))                                   return 'Right-Back';
  if (s.includes('left back'))                                    return 'Left-Back';
  if (s.includes('defensive midfield'))                           return 'Defensive Midfielder';
  if (s.includes('attacking midfield'))                           return 'Attacking Midfielder';
  if (s.includes('center midfield') || s.includes('centre midfield')) return 'Central Midfielder';
  if (s.includes('right wing'))                                   return 'Right Winger';
  if (s.includes('left wing'))                                    return 'Left Winger';
  if (s.includes('center forward') || s.includes('centre forward')) return 'Centre-Forward';
  if (s.includes('striker'))                                      return 'Striker';
  return 'Central Midfielder';
}

function buildMetrics(stats) {
  const passAcc   = stats.passes > 0 ? Math.round((stats.passes_complete / stats.passes) * 100) : 0;
  const technique = Math.min(99, Math.round(50 + passAcc * 0.3 + stats.dribbles * 2));
  const endurance = Math.min(3000, 1500 + (stats.passes + stats.carries) * 3);
  const speed     = Math.min(99, Math.round(55 + stats.dribbles * 3 + stats.carries * 0.2));

  return {
    speed,
    endurance,
    technique,
    passes_completed:  stats.passes_complete,
    passes_attempted:  stats.passes,
    pass_accuracy:     passAcc,
    goals:             stats.goals,
    assists:           stats.assists,
    shots:             stats.shots,
    tackles_won:       stats.tackles,
    dribbles:          stats.dribbles,
    fouls_committed:   stats.fouls,
    distance_covered:  parseFloat((endurance / 1000).toFixed(1)),
    sprint_count:      Math.max(0, stats.carries - 10)
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Upsert Football sport
    await Sport.findOrCreate({
      where: { name: 'Football' },
      defaults: {
        id: uuidv4(),
        name: 'Football',
        category: 'Team Sport',
        description: 'Association football — Premier League data sourced from StatsBomb Open Data.',
        isActive: true,
        keyMetrics: {
          speed:            { unit: 'score/100', description: 'Sprint speed rating' },
          endurance:        { unit: 'metres',    description: 'Distance covered (metres)' },
          technique:        { unit: 'score/100', description: 'Technical skill rating' },
          passes_completed: { unit: 'count',     description: 'Successful passes' },
          pass_accuracy:    { unit: '%',         description: 'Pass completion rate' },
          goals:            { unit: 'count',     description: 'Goals scored' },
          assists:          { unit: 'count',     description: 'Assists' },
          shots:            { unit: 'count',     description: 'Shots attempted' },
          tackles_won:      { unit: 'count',     description: 'Tackles won' },
          dribbles:         { unit: 'count',     description: 'Successful dribbles' },
          distance_covered: { unit: 'km',        description: 'Distance covered' },
          sprint_count:     { unit: 'count',     description: 'Sprint actions' }
        }
      }
    });
    console.log('⚽ Sport upserted: Football\n');

    // Fetch matches (limit to 30)
    const matches = (await getMatches()).slice(0, 30);
    console.log(`📋 Processing ${matches.length} matches...\n`);

    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const playerMap = {};
    let totalPerformances = 0;
    let totalAthletes = 0;

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      console.log(`[${String(i + 1).padStart(2, '0')}/${matches.length}] ${match.home_team} vs ${match.away_team} (${match.match_date})`);

      let lineup, playerStats;
      try {
        lineup      = await getLineup(match.match_id);
        playerStats = await getPlayerStats(match.match_id);
      } catch (err) {
        console.log(`  ⚠️  Skipping match ${match.match_id}: ${err.message}`);
        continue;
      }

      // Position lookup from lineup
      const positionLookup = {};
      for (const p of lineup) {
        positionLookup[p.player_id] = {
          position: mapPosition(p.positions),
          team: p.team
        };
      }

      for (const stats of playerStats) {
        const pid     = stats.player_id;
        const posInfo = positionLookup[pid] || { position: 'Central Midfielder', team: stats.team };

        // Create User + Athlete on first appearance
        if (!playerMap[pid]) {
          const nameParts = stats.player_name.trim().split(' ');
          const firstName = nameParts[0] || 'Player';
          const lastName  = nameParts.length > 1 ? nameParts.slice(1).join(' ') : `${pid}`;
          const emailFirst = firstName.toLowerCase().replace(/[^a-z]/g, '') || 'player';
          const emailLast  = lastName.toLowerCase().replace(/[^a-z]/g, '') || `${pid}`;
          const email      = `${emailFirst}.${emailLast}${pid}@statsbomb.com`;

          try {
            const user = await User.create({
              id: uuidv4(),
              email,
              password: 'Password123!',
              firstName,
              lastName,
              role: 'athlete',
              isActive: true
            });

            const athlete = await Athlete.create({
              id: uuidv4(),
              userId: user.id,
              dateOfBirth: '1985-01-01',
              gender: 'male',
              height: null,
              weight: null,
              primarySport: 'Football',
              skillLevel: 'professional',
              teamName: posInfo.team,
              position: posInfo.position,
              coachName: null,
              injuryHistory: [],
              emergencyContact: null
            });

            playerMap[pid] = { athleteId: athlete.id };
            totalAthletes++;
            process.stdout.write(`  ✚ Created athlete: ${stats.player_name}\n`);
          } catch (err) {
            // Player already exists (duplicate email), skip
            continue;
          }
        }

        // Create performance record
        await Performance.create({
          id: uuidv4(),
          athleteId: playerMap[pid].athleteId,
          sport: 'Football',
          performanceDate: new Date(match.match_date),
          metrics: buildMetrics(stats),
          sessionType: 'competition',
          duration: 90,
          intensity: 'high',
          location: 'Premier League Venue',
          conditions: {
            competition:  'Premier League 2003/2004',
            home_team:    match.home_team,
            away_team:    match.away_team,
            home_score:   match.home_score,
            away_score:   match.away_score
          },
          notes: `${match.home_team} ${match.home_score} - ${match.away_score} ${match.away_team}`,
          personalRating: null,
          injuryOccurred: false
        });

        totalPerformances++;
      }
    }

    console.log(`\n✅ Import complete!`);
    console.log(`   Athletes created:    ${totalAthletes}`);
    console.log(`   Performance records: ${totalPerformances}`);
    console.log(`\n🔑 All accounts use password: Password123!\n`);

    await sequelize.close();
    process.exit(0);

  } catch (err) {
    // Clean up temp file if something goes wrong mid-run
    if (fs.existsSync(TMP_SCRIPT)) fs.unlinkSync(TMP_SCRIPT);
    console.error('\n❌ Import failed:', err.message);
    process.exit(1);
  }
}

main();