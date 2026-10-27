import {
  InternalRoomState, Player, PrivateRoundData, EmojiBurstData
} from './types.js';
import {
  getRoomBlob, createRoomBlob, mutateRoomBlob
} from './blobs.js';
import {
  makeCode, safeName, safeAvatar, rand, pick,
  ROUND_DEFS, pickFreshQuestion, autoRankAnswers, publicRoom
} from './engine.js';

export interface GameResponse {
  ok: boolean;
  error?: string;
  room?: any;
  playerId?: string;
  privateRound?: PrivateRoundData | null;
  emojiBursts?: EmojiBurstData[];
}

function getPrivateRound(room: InternalRoomState, playerId: string): PrivateRoundData | null {
  if (!room.round || !playerId) return null;
  const r = room.round;
  const mySubmission = r.submissions?.[playerId]?.text || null;
  return {
    type: r.type,
    phase: r.phase || 'submitting',
    prompt: r.prompt,
    role: null,
    myAnswer: mySubmission,
    alreadySubmitted: !!r.submissions?.[playerId],
    reactionStarted: !!r.reactionStarted,
  };
}

// Check and advance expired timers or fully submitted rounds
function tickRoomState(room: InternalRoomState): boolean {
  let changed = false;
  const now = Date.now();

  if (room.status === 'playing' && room.round) {
    const r = room.round;

    // Check reaction round green signal
    if (r.type === 'reaction' && !r.reactionStarted && now >= r.reactionGoAt) {
      r.reactionStarted = true;
      r.reactionStartedAt = now;
      changed = true;
    }

    const playerCount = Object.keys(room.players).length;
    const submissionCount = r.type === 'reaction'
      ? Object.keys(r.answers).length
      : Object.keys(r.submissions).length;

    const allSubmitted = playerCount > 0 && submissionCount >= playerCount;
    const timeExpired = now >= r.endsAt;

    if (allSubmitted || timeExpired) {
      finishQuestion(room);
      changed = true;
    }
  } else if (room.status === 'intermission') {
    if (now >= room.intermissionEndsAt) {
      advanceNext(room);
      changed = true;
    }
  }

  return changed;
}

function startRound(room: InternalRoomState, roundIndex: number) {
  room.roundIndex = roundIndex;
  room.currentQuestionInRound = 0;
  startQuestion(room);
}

function startQuestion(room: InternalRoomState) {
  room.lastResult = null;
  const def = ROUND_DEFS[room.roundIndex] || ROUND_DEFS[0];
  const qNum = room.currentQuestionInRound + 1;
  const totalQ = room.questionsPerRound || 1;
  const now = Date.now();

  const round: InternalRoomState['round'] = {
    ...def,
    number: room.roundIndex + 1,
    phase: 'submitting',
    startedAt: now,
    endsAt: now + def.seconds * 1000,
    questionIndex: qNum,
    totalQuestions: totalQ,
    prompt: '',
    challenge: null,
    submissions: {},
    answers: {},
    reactionStarted: false,
    reactionGoAt: 0,
    reactionStartedAt: 0,
  };

  if (def.type === 'reaction') {
    round.prompt = 'Wait until the screen turns GREEN, then TAP as fast as you can!';
    round.reactionStarted = false;
    round.reactionGoAt = now + 1500 + rand(3000);
  } else {
    const qPrompt = pickFreshQuestion(room.usedQuestions);
    round.prompt = qPrompt;
    room.usedQuestions.push(qPrompt);
  }

  room.round = round;
  room.status = 'playing';
  room.feed.push({ id: Math.random().toString(36).slice(2, 8), text: `${def.icon} Round ${room.roundIndex + 1}: ${def.name} started!`, at: now });
}

function finishQuestion(room: InternalRoomState) {
  if (!room.round || room.status !== 'playing') return;
  const r = room.round;
  const isFinalRound = r.number >= (room.totalRounds || ROUND_DEFS.length);
  const playersList = Object.values(room.players);

  let rankedAnswersData = null;
  const allResults: any[] = [];

  if (r.type === 'reaction') {
    const ranked = Object.entries(r.answers).sort((a, b) => a[1] - b[1]);
    ranked.forEach(([id, ms], i) => {
      const p = room.players[id];
      const pts = Math.max(0, 30 - i * 5);
      if (p && pts) {
        p.score += pts;
        allResults.push({ id, name: p.name, avatar: p.avatar, points: pts, reason: i === 0 ? `⚡ FASTEST! 1ST PLACE (${ms}ms)` : `Place #${i + 1} (${ms}ms)` });
      }
    });
    for (const p of playersList) {
      if (r.answers[p.id] === undefined) {
        p.score -= 5;
        allResults.push({ id: p.id, name: p.name, avatar: p.avatar, points: -5, reason: '💤 Missed reaction window' });
      }
    }
  } else {
    // Creative rounds: AUTO-RANKING
    if (Object.keys(r.submissions).length > 0) {
      const { rankedAnswers, playerAwards, personalityDeltas } = autoRankAnswers(
        r.submissions,
        room.players,
        r.type,
        isFinalRound
      );

      rankedAnswersData = rankedAnswers;

      for (const award of playerAwards) {
        const p = room.players[award.id];
        if (p) {
          p.score += award.points;
          allResults.push(award);
        }
      }

      for (const [pid, delta] of Object.entries(personalityDeltas)) {
        const existing = room.personalityVectors[pid] || { humor: 40, logic: 35, creativity: 40, chaos: 30, darkness: 15, laziness: 0 };
        room.personalityVectors[pid] = {
          humor: Math.min(100, existing.humor + (delta.humor || 0)),
          logic: Math.min(100, existing.logic + (delta.logic || 0)),
          creativity: Math.min(100, existing.creativity + (delta.creativity || 0)),
          chaos: Math.min(100, existing.chaos + (delta.chaos || 0)),
          darkness: Math.min(100, existing.darkness + (delta.darkness || 0)),
          laziness: Math.min(100, existing.laziness + (delta.laziness || 0)),
        };
      }
    } else {
      for (const p of playersList) {
        allResults.push({ id: p.id, name: p.name, avatar: p.avatar, points: 0, reason: '😴 Question skipped – no submissions' });
      }
    }
  }

  const qNum = room.currentQuestionInRound + 1;
  const totalQ = room.questionsPerRound || 1;
  const isLastQuestionInRound = qNum >= totalQ;
  const isLastRound = room.roundIndex + 1 >= (room.totalRounds || ROUND_DEFS.length);

  room.lastResult = {
    round: r.number,
    questionIndex: qNum,
    name: r.name,
    type: r.type,
    results: allResults,
    rankedAnswers: rankedAnswersData,
    reveal: {
      prompt: r.prompt,
      challenge: r.challenge,
    },
  };

  room.feed.push({ id: Math.random().toString(36).slice(2, 8), text: `Round ${r.number} complete — AI rankings ready!`, at: Date.now() });

  if (isLastQuestionInRound && isLastRound) {
    // Grand Finale!
    room.status = 'finished';
    room.round = null;
    const sorted = Object.values(room.players).sort((a, b) => b.score - a.score);
    const winner = sorted[0] || null;
    if (room.lastResult) {
      room.lastResult.winner = winner ? { id: winner.id, name: winner.name, avatar: winner.avatar, score: winner.score } : null;
    }
  } else {
    room.status = 'intermission';
    room.round = null;
    // Intermission countdown (6 seconds for next question, 8 seconds for next round)
    const delay = isLastQuestionInRound ? 8000 : 6000;
    room.intermissionEndsAt = Date.now() + delay;
  }
}

function advanceNext(room: InternalRoomState) {
  if (room.status !== 'intermission') return;
  const totalQ = room.questionsPerRound || 1;
  const isLastQuestionInRound = (room.currentQuestionInRound + 1) >= totalQ;

  if (isLastQuestionInRound) {
    if (room.roundIndex + 1 < (room.totalRounds || ROUND_DEFS.length)) {
      startRound(room, room.roundIndex + 1);
    } else {
      room.status = 'finished';
      room.round = null;
    }
  } else {
    room.currentQuestionInRound++;
    startQuestion(room);
  }
}

export async function handleGameAction(body: any): Promise<GameResponse> {
  const { action, code, playerId } = body || {};

  // CREATE ROOM
  if (action === 'create') {
    let newCode = makeCode();
    let existing = await getRoomBlob(newCode);
    let attempts = 0;
    while (existing && attempts < 5) {
      newCode = makeCode();
      existing = await getRoomBlob(newCode);
      attempts++;
    }

    const hostId = `player_${Math.random().toString(36).slice(2, 10)}`;
    const cleanName = safeName(body.name);
    const chosenAvatar = safeAvatar(body.avatar);

    const room: InternalRoomState = {
      code: newCode,
      hostId,
      players: {
        [hostId]: {
          id: hostId,
          name: cleanName,
          avatar: chosenAvatar,
          ready: true,
          score: 0,
          connected: true,
          lastSeen: Date.now(),
        },
      },
      status: 'lobby',
      roundIndex: -1,
      totalRounds: 3, // 3-round standard preserving quick party gameplay
      questionsPerRound: 1,
      currentQuestionInRound: 0,
      round: null,
      intermissionEndsAt: 0,
      lastResult: null,
      feed: [{ id: '1', text: `${chosenAvatar} ${cleanName} created the room`, at: Date.now() }],
      usedQuestions: [],
      personalityVectors: {},
      emojiBursts: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const { success } = await createRoomBlob(newCode, room);
    if (!success) {
      return { ok: false, error: 'Could not create room. Please try again.' };
    }

    return {
      ok: true,
      room: publicRoom(room),
      playerId: hostId,
      privateRound: null,
    };
  }

  // ALL OTHER ACTIONS REQUIRE ROOM CODE
  const roomCode = String(code || '').trim().toUpperCase();
  if (!roomCode) {
    return { ok: false, error: 'Room code is required.' };
  }

  // JOIN ROOM
  if (action === 'join') {
    let newPlayerId = '';
    const cleanName = safeName(body.name);
    const chosenAvatar = safeAvatar(body.avatar);

    const { room, success } = await mutateRoomBlob(roomCode, (r) => {
      if (r.status !== 'lobby') return false;
      const existingPlayers = Object.values(r.players);
      if (existingPlayers.length >= 8) return false;
      if (existingPlayers.some(p => p.name.toLowerCase() === cleanName.toLowerCase())) return false;

      newPlayerId = `player_${Math.random().toString(36).slice(2, 10)}`;
      r.players[newPlayerId] = {
        id: newPlayerId,
        name: cleanName,
        avatar: chosenAvatar,
        ready: false,
        score: 0,
        connected: true,
        lastSeen: Date.now(),
      };
      r.feed.push({ id: Math.random().toString(36).slice(2, 8), text: `${chosenAvatar} ${cleanName} joined the room!`, at: Date.now() });
    });

    if (!success || !room || !newPlayerId) {
      return { ok: false, error: 'Cannot join room. Check code, room status, or if nickname is taken.' };
    }

    return {
      ok: true,
      room: publicRoom(room),
      playerId: newPlayerId,
      privateRound: null,
    };
  }

  // MUTATION ACTIONS
  let actionError: string | null = null;
  const { room, success } = await mutateRoomBlob(roomCode, (r) => {
    // Keep player alive
    if (playerId && r.players[playerId]) {
      r.players[playerId].lastSeen = Date.now();
      r.players[playerId].connected = true;
    }

    // Tick timers
    tickRoomState(r);

    if (action === 'poll') {
      return; // already updated lastSeen and ticked state
    }

    if (action === 'ready') {
      if (r.status === 'lobby' && playerId && r.players[playerId]) {
        r.players[playerId].ready = body.ready !== undefined ? !!body.ready : !!body.isReady;
      }
    } else if (action === 'config') {
      if (playerId !== r.hostId) {
        actionError = 'Only the host can change room settings.';
        return false;
      }
      if (r.status === 'lobby') {
        if (body.totalRounds) r.totalRounds = Math.min(7, Math.max(3, Number(body.totalRounds) || 3));
        if (body.questionsPerRound) r.questionsPerRound = Math.min(5, Math.max(1, Number(body.questionsPerRound) || 1));
      }
    } else if (action === 'start') {
      if (playerId !== r.hostId) {
        actionError = 'Only the host can start the game.';
        return false;
      }
      if (r.status === 'lobby') {
        const players = Object.values(r.players);
        if (players.length < 2) {
          actionError = 'Need at least 2 players to start.';
          return false;
        }
        if (!players.every(p => p.ready)) {
          actionError = 'All players must be ready.';
          return false;
        }
        for (const p of players) p.score = 0;
        r.usedQuestions = [];
        r.personalityVectors = {};
        startRound(r, 0);
      }
    } else if (action === 'submit') {
      if (r.status === 'playing' && r.round && playerId && r.players[playerId]) {
        const answer = String(body.text || body.answer || '').trim().slice(0, 200);
        if (answer && !r.round.submissions[playerId]) {
          const p = r.players[playerId];
          r.round.submissions[playerId] = {
            text: answer,
            player: { id: p.id, name: p.name, avatar: p.avatar },
          };
          r.feed.push({ id: Math.random().toString(36).slice(2, 8), text: `${p.avatar} ${p.name} locked in!`, at: Date.now() });

          // Auto-finish if all submitted
          if (Object.keys(r.round.submissions).length >= Object.keys(r.players).length) {
            finishQuestion(r);
          }
        }
      }
    } else if (action === 'reaction') {
      if (r.status === 'playing' && r.round && r.round.type === 'reaction' && playerId) {
        if (!r.round.reactionStarted && (body.reactionTimeMs !== undefined || Date.now() >= r.round.reactionGoAt)) {
          r.round.reactionStarted = true;
          r.round.reactionStartedAt = Date.now() - (body.reactionTimeMs !== undefined ? Number(body.reactionTimeMs) : 0);
        }
        if (r.round.reactionStarted && r.round.answers[playerId] === undefined) {
          const ms = body.reactionTimeMs !== undefined ? Number(body.reactionTimeMs) : (Date.now() - r.round.reactionStartedAt);
          r.round.answers[playerId] = ms;
          if (Object.keys(r.round.answers).length >= Object.keys(r.players).length) {
            finishQuestion(r);
          }
        }
      }
    } else if (action === 'emoji') {
      if (playerId && r.players[playerId] && body.emoji) {
        const p = r.players[playerId];
        r.emojiBursts.push({
          id: Math.random().toString(36).slice(2, 8),
          emoji: String(body.emoji).slice(0, 4),
          senderName: p.name,
          senderAvatar: p.avatar,
          at: Date.now(),
        });
        r.emojiBursts = r.emojiBursts.slice(-20);
      }
    } else if (action === 'next') {
      if (playerId !== r.hostId) {
        actionError = 'Only the host can advance to the next round.';
        return false;
      }
      if (r.status === 'intermission') {
        advanceNext(r);
      }
    } else if (action === 'rematch') {
      if (playerId !== r.hostId) {
        actionError = 'Only the host can start a rematch.';
        return false;
      }
      if (r.status === 'finished') {
        r.status = 'lobby';
        r.roundIndex = -1;
        r.round = null;
        r.lastResult = null;
        r.currentQuestionInRound = 0;
        r.usedQuestions = [];
        r.personalityVectors = {};
        for (const p of Object.values(r.players)) {
          p.score = 0;
          p.ready = p.id === r.hostId;
        }
        r.feed.push({ id: Math.random().toString(36).slice(2, 8), text: '🔄 Rematch lobby opened!', at: Date.now() });
      }
    }
  });

  if (actionError) {
    return { ok: false, error: actionError };
  }

  if (!room) {
    return { ok: false, error: 'Room not found.' };
  }

  // Filter recent emoji bursts (last 4 seconds)
  const recentBursts = room.emojiBursts.filter(e => Date.now() - e.at < 4000);

  return {
    ok: true,
    room: publicRoom(room),
    privateRound: playerId ? getPrivateRound(room, playerId) : null,
    emojiBursts: recentBursts,
  };
}

export async function handleGameRequest(req: Request): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    let body: any = {};
    if (req.method === 'POST') {
      body = await req.json().catch(() => ({}));
    } else if (req.method === 'GET') {
      const url = new URL(req.url);
      body = {
        action: url.searchParams.get('action') || 'poll',
        code: url.searchParams.get('code') || '',
        playerId: url.searchParams.get('playerId') || '',
      };
    }

    const result = await handleGameAction(body);
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 400,
      headers: corsHeaders,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
}
