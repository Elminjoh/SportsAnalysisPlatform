// backend/src/seeders/ingestStatsBomb.js
// Run with: node src/seeders/ingestStatsBomb.js
//
// Fetches WSL (women) + La Liga (men) data from StatsBomb open-data GitHub.
// Data source: https://github.com/statsbomb/open-data
// Citation: StatsBomb Open Data, StatsBomb Services Ltd.

require('dotenv').config();
const https = require('https');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const { User, Athlete, Performance } = require('../models');

// ── Competitions to ingest ─────────────────────────────────────────────────
const COMPETITIONS = [
  { id: 37,  name: 'WSL',     gender: 'female', maxSeasons: 2, maxMatches: 25 },
  { id: 11,  name: 'La Liga', gender: 'male',   maxSeasons: 2, maxMatches: 25 },
];

const BASE_URL = 'https://raw.githubusercontent.com/statsbomb/open-data/master/data';

// ── HTTP helper ────────────────────────────────────────────────────────────
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJSON(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error for ${url}`)); }
      });
    }).on('error', reject);
  });
}

// ── Map StatsBomb position to your schema ──────────────────────────────────
function mapPosition(sbPosition) {
  if (!sbPosition) return 'Central-Midfielder';
  const p = sbPosition.toLowerCase();
  if (p.includes('goalkeeper'))                                      return 'Goalkeeper';
  if (p.includes('center back') || p.includes('centre back'))       return 'Centre-Back';
  if (p.includes('back') || p.includes('wing back'))                return 'Full-Back';
  if (p.includes('defensive mid'))                                   return 'Defensive-Midfielder';
  if (p.includes('attacking mid'))                                   return 'Attacking-Midfielder';
  if (p.includes('center mid') || p.includes('centre mid'))         return 'Central-Midfielder';
  if (p.includes('winger') || p.includes('right wing') || p.includes('left wing')) return 'Winger';
  if (p.includes('center forward') || p.includes('centre forward') || p.includes('striker')) return 'Centre-Forward';
  return 'Central-Midfielder';
}

// ── Aggregate player events for one match into your metrics schema ─────────
function aggregatePlayerMetrics(events, playerId) {
  const mine = events.filter(e => e.player?.id === playerId);

  const passes         = mine.filter(e => e.type?.name === 'Pass');
  const completePasses = passes.filter(e => !e.pass?.outcome);
  const passAcc        = passes.length > 0
    ? parseFloat(((completePasses.length / passes.length) * 100).toFixed(1))
    : 0;

  const shots = mine.filter(e => e.type?.name === 'Shot');
  const goals = shots.filter(e => e.shot?.outcome?.name === 'Goal').length;

  const carries     = mine.filter(e => e.type?.name === 'Carry');
  const sprintCount = carries.length;

  // Distance: sum carry + pass lengths (StatsBomb units are yards → convert to km)
  let distYards = 0;
  carries.forEach(c => {
    if (c.carry?.end_location && c.location) {
      const dx = c.carry.end_location[0] - c.location[0];
      const dy = c.carry.end_location[1] - c.location[1];
      distYards += Math.sqrt(dx * dx + dy * dy);
    }
  });
  passes.forEach(p => { if (p.pass?.length) distYards += p.pass.length; });
  const distanceKm = parseFloat((distYards * 0.0009144).toFixed(2));

  // Technique: duel win rate scaled 0–100; fallback if no duels recorded
  const duels    = mine.filter(e => e.type?.name === 'Duel');
  const wonDuels = duels.filter(e =>
    e.duel?.outcome?.name?.includes('Won') || e.duel?.outcome?.name?.includes('Success')
  );
  const technique = duels.length > 0
    ? parseFloat(((wonDuels.length / duels.length) * 100).toFixed(1))
    : parseFloat((50 + Math.random() * 30).toFixed(1));

  // Speed proxy: pressure events (high-intensity pressing actions)
  const pressures = mine.filter(e => e.type?.name === 'Pressure');
  const speed     = parseFloat(Math.min(99, 40 + pressures.length * 1.5 + Math.random() * 10).toFixed(1));

  return {
    speed,
    technique,
    passes_completed: completePasses.length,
    goals,
    sprint_count:     sprintCount,
    distance_covered: distanceKm,
    pass_accuracy:    passAcc,
  };
}

// ── Main ───────────────────────────────────────────────────────────────────
async function ingest() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✓ Connected\n');

    // Clear previous StatsBomb seed data only
    console.log('Clearing previous StatsBomb data...');
    const prev = await User.findAll({
      where: sequelize.literal(`email LIKE '%@statsbomb.seed'`)
    });
    if (prev.length) {
      const uids = prev.map(u => u.id);
      const aths = await Athlete.findAll({ where: { userId: uids } });
      const aids = aths.map(a => a.id);
      if (aids.length) await Performance.destroy({ where: { athleteId: aids } });
      await Athlete.destroy({ where: { userId: uids } });
      await User.destroy({ where: { id: uids } });
      console.log(`  Removed ${prev.length} previous player records`);
    }
    console.log('✓ Cleared\n');

    const hashedPw = await bcrypt.hash('StatsBomb123!', 10);

    console.log('Fetching competition list from StatsBomb GitHub...');
    const allCompetitions = await fetchJSON(`${BASE_URL}/competitions.json`);
    console.log(`✓ ${allCompetitions.length} total competitions found\n`);

    // playerMap tracks players across all competitions: sbPlayerId → athleteId
    const playerMap  = {};
    let totalPlayers = 0;
    let totalPerfs   = 0;

    for (const comp of COMPETITIONS) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`Competition: ${comp.name} (ID: ${comp.id}) — ${comp.gender}`);
      console.log('='.repeat(50));

      const seasons = allCompetitions
        .filter(c => c.competition_id === comp.id)
        .slice(0, comp.maxSeasons);

      if (!seasons.length) {
        console.log('  No seasons found, skipping.');
        continue;
      }

      console.log(`  Seasons to process: ${seasons.map(s => s.season_name).join(', ')}`);

      for (const season of seasons) {
        console.log(`\n  Season: ${season.season_name}`);

        let matches;
        try {
          matches = await fetchJSON(`${BASE_URL}/matches/${comp.id}/${season.season_id}.json`);
        } catch (e) {
          console.log(`  Could not fetch matches: ${e.message}`);
          continue;
        }

        const subset = matches.slice(0, comp.maxMatches);
        console.log(`  Processing ${subset.length}/${matches.length} matches...`);

        for (const match of subset) {
          process.stdout.write(`    Match ${match.match_id} (${match.home_team?.home_team_name} vs ${match.away_team?.away_team_name})... `);

          let events;
          try {
            events = await fetchJSON(`${BASE_URL}/events/${match.match_id}.json`);
          } catch (e) {
            console.log('skip');
            continue;
          }

          // Collect unique players with their positions from this match
          const playersSeen = {};
          events.forEach(e => {
            if (e.player?.id && e.player?.name && e.position?.name) {
              if (!playersSeen[e.player.id]) {
                playersSeen[e.player.id] = {
                  id:       e.player.id,
                  name:     e.player.name,
                  position: e.position.name,
                  team:     e.team?.name || 'Unknown',
                };
              }
            }
          });

          const matchDate = new Date(match.match_date);
          let matchPerfs  = 0;

          for (const [sbId, player] of Object.entries(playersSeen)) {
            const numericId = parseInt(sbId);

            // Create athlete record only once per player across all competitions
            if (!playerMap[sbId]) {
              const nameParts = player.name.split(' ');
              const firstName = nameParts[0] || 'Player';
              const lastName  = nameParts.slice(1).join(' ') || `SB${sbId}`;

              const user = await User.create({
                email:     `sb_${sbId}@statsbomb.seed`,
                password:  hashedPw,
                firstName,
                lastName,
                role:      'athlete',
                isActive:  true,
              });

              // StatsBomb doesn't provide DOB — generate a realistic random one
              // Spread across all birth quarters to avoid artificial RAE bias
              const birthYear  = 1988 + Math.floor(Math.random() * 12); // age 25-37
              const birthMonth = Math.floor(Math.random() * 12) + 1;    // 1-12
              const birthDay   = Math.floor(Math.random() * 28) + 1;    // 1-28 (safe for all months)
              const dob = new Date(`${birthYear}-${String(birthMonth).padStart(2,'0')}-${String(birthDay).padStart(2,'0')}`);

              const athlete = await Athlete.create({
                userId:           user.id,
                primarySport:     'Football',
                skillLevel:       'professional',
                position:         mapPosition(player.position),
                teamName:         player.team,
                gender:           comp.gender,
                dateOfBirth:      dob,
                emergencyContact: { name: 'N/A', phone: 'N/A' },
              });

              playerMap[sbId] = athlete.id;
              totalPlayers++;
            }

            const metrics = aggregatePlayerMetrics(events, numericId);

            // Skip players with no meaningful data in this match
            if (
              metrics.passes_completed === 0 &&
              metrics.goals === 0 &&
              metrics.sprint_count === 0
            ) continue;

            await Performance.create({
              athleteId:       playerMap[sbId],
              sport:           'Football',
              performanceDate: matchDate,
              metrics,
              sessionType:     'competition',
              intensity:       'high',
              duration:        90,
              location:        match.stadium?.name || 'Stadium',
              conditions:      null,
              personalRating:  null,
              injuryOccurred:  false,
            });

            totalPerfs++;
            matchPerfs++;
          }

          console.log(`✓ (${Object.keys(playersSeen).length} players, ${matchPerfs} performances)`);

          // Polite delay to avoid hammering GitHub
          await new Promise(r => setTimeout(r, 250));
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✓ StatsBomb ingestion complete!');
    console.log(`  Total players created:      ${totalPlayers}`);
    console.log(`  Total performances created: ${totalPerfs}`);
    console.log(`  Competitions: WSL (women) + La Liga (men)`);
    console.log(`  Data source: StatsBomb Open Data, StatsBomb Services Ltd.`);
    console.log('='.repeat(50) + '\n');

    process.exit(0);
  } catch (err) {
    console.error('\nIngestion failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

ingest();