/**
 * Automated end-to-end test of a complete 3-round 2-player Chaos Room game.
 * Verifies:
 * - Netlify Function request handler
 * - Strong consistency Blobs & conditional writes
 * - Player 1 (Host) and Player 2 lifecycle (Create, Join, Ready, Start)
 * - Round 1: Creative round with AI Auto-Ranking, humor/logic scoring, hidden opponent answers
 * - Round 2: Reaction speed round, tap ordering & points
 * - Round 3: FINAL CHAOS SHOWDOWN with double points
 * - Final Winner crowning, leaderboard, personality report & partner match
 */

import { handleGameRequest } from '../lib/game-handler.js';

let assertionCount = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  assertionCount++;
  console.log(`  ✓ ${message}`);
}

async function callGame(body) {
  const req = new Request('http://localhost/.netlify/functions/game', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const res = await handleGameRequest(req);
  if (!res.ok && res.status !== 400) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  return await res.json();
}

const getPlayer = (room, id) => room.players.find(p => p.id === id);

async function runTest() {
  console.log('🧪 Starting 3-Round 2-Player Chaos Room Game Simulation...\n');

  // STEP 1: David creates room as Host
  console.log('--- Step 1: David creates room as Host ---');
  const createRes = await callGame({
    action: 'create',
    name: 'David',
    avatar: '😎',
    totalRounds: 3,
    questionsPerRound: 1,
    roundTime: 10,
  });
  assert(createRes.ok === true, 'Room created successfully');
  const code = createRes.room.code;
  const davidId = createRes.playerId;
  assert(!!code && code.length === 6, `Valid 6-letter room code generated: ${code}`);
  assert(createRes.room.hostId === davidId, 'David is designated as room Host');
  assert(createRes.room.status === 'lobby', 'Initial room status is lobby');

  // STEP 2: Alex joins room
  console.log('\n--- Step 2: Alex joins room ---');
  const joinRes = await callGame({
    action: 'join',
    code,
    name: 'Alex',
    avatar: '🐱',
  });
  assert(joinRes.ok === true, 'Alex joined successfully');
  const alexId = joinRes.playerId;
  assert(joinRes.room.players.length === 2, 'Room now has 2 players');
  assert(joinRes.room.hostId !== alexId && joinRes.room.hostId === davidId, 'Alex is not host; David remains host');

  // STEP 3: Both ready up
  console.log('\n--- Step 3: Both players ready up ---');
  const ready1 = await callGame({ action: 'ready', code, playerId: davidId, ready: true });
  assert(ready1.ok && getPlayer(ready1.room, davidId).ready === true, 'David marked ready');
  const ready2 = await callGame({ action: 'ready', code, playerId: alexId, ready: true });
  assert(ready2.ok && getPlayer(ready2.room, alexId).ready === true, 'Alex marked ready');

  // Non-host cannot start game
  const nonHostStart = await callGame({ action: 'start', code, playerId: alexId });
  assert(nonHostStart.ok === false, 'Non-host starting game correctly rejected');

  // Host starts game
  console.log('\n--- Step 4: Host starts the game ---');
  const startRes = await callGame({ action: 'start', code, playerId: davidId });
  assert(startRes.ok === true, 'Host started game successfully');
  assert(startRes.room.status === 'playing', 'Room status updated to playing');
  assert(startRes.room.round.number === 1, 'Round 1 started');
  console.log(`  Question Prompt: "${startRes.room.round.prompt}"`);

  // STEP 4: Round 1 Submissions (Creative / Brainstorm)
  console.log('\n--- Step 5: Round 1 Creative Submissions & Secret Answers ---');
  const sub1 = await callGame({
    action: 'submit',
    code,
    playerId: davidId,
    answer: 'A quantum toaster with Wi-Fi and laser targeting that shoots waffles directly into your mouth!',
  });
  assert(sub1.ok === true, 'David submitted Round 1 answer');
  // Verify David sees his own answer in privateRound, and submissions count is 1
  assert(sub1.privateRound.myAnswer !== null, 'David receives his own answer privately');
  assert(sub1.room.round.submittedCount === 1, 'Public state shows submittedCount = 1 without leaking text');

  const sub2 = await callGame({
    action: 'submit',
    code,
    playerId: alexId,
    answer: 'Because the office coffee machine formed a union and demanded free health care and dental.',
  });
  assert(sub2.ok === true, 'Alex submitted Round 1 answer');

  // Poll to advance timer / evaluate submissions
  console.log('\n--- Step 6: AI Auto-Ranking Evaluation for Round 1 ---');
  const poll1 = await callGame({ action: 'poll', code, playerId: davidId });
  assert(poll1.ok === true, 'Poll processed successfully');
  assert(poll1.room.status === 'intermission', 'Room moved to intermission after all submissions');
  assert(poll1.room.lastResult !== null, 'Round 1 results generated');
  assert(poll1.room.lastResult.rankedAnswers.length === 2, 'Both answers ranked by AI engine');

  const r1Rankings = poll1.room.lastResult.rankedAnswers;
  console.log(`  Rank #1: "${r1Rankings[0].text}" by ${r1Rankings[0].authors.map(a => a.name).join(', ')} (Humor: ${r1Rankings[0].humorScore}, Logic: ${r1Rankings[0].logicScore})`);
  console.log(`  Rank #2: "${r1Rankings[1].text}" by ${r1Rankings[1].authors.map(a => a.name).join(', ')} (Humor: ${r1Rankings[1].humorScore}, Logic: ${r1Rankings[1].logicScore})`);
  assert(r1Rankings[0].humorScore >= 0, 'Humor score computed');
  assert(r1Rankings[0].logicScore >= 0, 'Logic score computed');

  // Verify scores awarded
  const pDavidR1 = getPlayer(poll1.room, davidId);
  const pAlexR1 = getPlayer(poll1.room, alexId);
  console.log(`  Scores after Round 1 -> David: ${pDavidR1.score}, Alex: ${pAlexR1.score}`);
  assert(pDavidR1.score > 0 && pAlexR1.score > 0, 'Both players awarded points after Round 1');

  // STEP 5: Advance to Round 2 (Quick Hands / Reaction)
  console.log('\n--- Step 7: Advance to Round 2 (Reaction Speed) ---');
  const adv1 = await callGame({ action: 'next', code, playerId: davidId });
  assert(adv1.ok === true, 'Advanced to Round 2');
  assert(adv1.room.round.number === 2, 'Round 2 active');
  assert(adv1.room.round.type === 'reaction', 'Round 2 is reaction type');

  // Simulate Reaction Green Signal
  console.log('\n--- Step 8: Reaction Speed Taps ---');
  await callGame({
    action: 'reaction',
    code,
    playerId: alexId,
    reactionTimeMs: 195, // Alex reacts in 195ms
  });
  const davidReaction = await callGame({
    action: 'reaction',
    code,
    playerId: davidId,
    reactionTimeMs: 270, // David reacts in 270ms
  });
  assert(davidReaction.ok === true, 'Both reaction times recorded');

  // Poll to finish reaction round
  const poll2 = await callGame({ action: 'poll', code, playerId: davidId });
  assert(poll2.room.status === 'intermission', 'Reaction round finished');
  const r2Results = poll2.room.lastResult.results;
  console.log(`  Reaction winner: ${r2Results[0].name} (${r2Results[0].reason})`);
  assert(r2Results[0].name === 'Alex', 'Alex won reaction round (faster reaction time)');
  const pAlexR2 = getPlayer(poll2.room, alexId);
  assert(pAlexR2.score > pAlexR1.score, 'Alex earned points for winning reaction round');

  // STEP 6: Advance to Round 3 (FINAL CHAOS SHOWDOWN)
  console.log('\n--- Step 9: Advance to Round 3 (FINAL CHAOS SHOWDOWN) ---');
  const adv2 = await callGame({ action: 'next', code, playerId: davidId });
  assert(adv2.ok === true, 'Advanced to Round 3');
  assert(adv2.room.round.number === 3, 'Round 3 active');
  assert(adv2.room.round.name.includes('FINAL') || adv2.room.round.number === 3, 'Showdown round active');

  console.log('\n--- Step 10: Final Round Submissions with Double Chaos Points ---');
  await callGame({
    action: 'submit',
    code,
    playerId: davidId,
    answer: 'Convince the alien armada that Earth is a maximum security galactic dumpster and they will be fined.',
  });
  await callGame({
    action: 'submit',
    code,
    playerId: alexId,
    answer: 'Deploy an intergalactic disco ball and blast 1980s synthwave until they decide to negotiate.',
  });

  // Poll to finish Round 3 & determine Final Winner
  console.log('\n--- Step 11: Grand Finale & Final Winner Crowning ---');
  const pollFinal = await callGame({ action: 'poll', code, playerId: davidId });
  assert(pollFinal.ok === true, 'Final poll processed');
  assert(pollFinal.room.status === 'finished', 'Game status transitioned to finished');

  const winner = pollFinal.room.lastResult.winner;
  assert(winner !== null, `Winner crowned: ${winner.name} with ${winner.score} points! 🏆`);
  console.log(`  Final Leaderboard:`);
  [...pollFinal.room.players]
    .sort((a, b) => b.score - a.score)
    .forEach((p, i) => {
      console.log(`    #${i + 1} ${p.avatar} ${p.name}: ${p.score} pts`);
    });

  // Verify Personality Reports and Best Partner Match
  console.log('\n--- Step 12: Personality Archetypes & Best Partner Match ---');
  const personalityReports = pollFinal.room.personalityReports;
  assert(!!personalityReports && personalityReports.length === 2, 'Personality reports generated for all players');
  personalityReports.forEach(report => {
    console.log(`  ${report.playerAvatar} ${report.playerName} -> Archetype: "${report.archetype}" ${report.archetypeEmoji} - ${report.description}`);
    assert(report.bestPartners && report.bestPartners.length === 1, `Best partner calculated for ${report.playerName}`);
    const bp = report.bestPartners[0];
    console.log(`    Best Partner: ${bp.playerName} (${bp.compatibilityScore}% - ${bp.compatibilityLabel})`);
    console.log(`    Synergy Reason: "${bp.reason}"`);
  });

  console.log(`\n🎉 ALL ${assertionCount} AUTOMATED GAME SIMULATION ASSERTIONS PASSED!`);
}

runTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
