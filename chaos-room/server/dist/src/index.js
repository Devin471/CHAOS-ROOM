import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';
import { initDatabase, saveMatchResult, getTopPlayers } from './db.js';
dotenv.config();
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
// Health & Global Leaderboard API (backed by PostgreSQL)
app.get('/health', (_req, res) => {
    res.json({ ok: true, name: 'CHAOS ROOM ARCADE', version: '2.0.0-ts' });
});
app.get('/api/leaderboard', async (_req, res) => {
    const topPlayers = await getTopPlayers();
    res.json({ ok: true, topPlayers });
});
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});
const PORT = process.env.PORT || 3001;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const AVATARS = ['🦊', '🐸', '🐼', '🐙', '🦄', '🐯', '🐧', '🦝', '🤖', '👽', '🦖', '🍕'];
const rooms = new Map();
const ROUND_DEFS = [
    { type: 'secret', name: 'Secret Mission', icon: '🕵️', subtitle: 'Submit your best answer. Trickster must blend in.', seconds: 35 },
    { type: 'word', name: 'Word Trap', icon: '📝', subtitle: 'One prompt is different. Spot the imposter!', seconds: 40 },
    { type: 'bluff', name: 'Bluff Master', icon: '😂', subtitle: 'Write the funniest or most believable answer. Rank the best!', seconds: 40 },
    { type: 'reaction', name: 'Quick Hands', icon: '⚡', subtitle: 'Wait for green… then strike at lightning speed.', seconds: 12 },
    { type: 'accuse', name: 'Who Did It?', icon: '🗳️', subtitle: 'Accuse the Trickster and expose the chaos.', seconds: 25 },
    { type: 'mini', name: 'Chaos Mini-Game', icon: '🎲', subtitle: 'Rapid fire puzzle! Fastest correct answers rank highest.', seconds: 30 },
    { type: 'final', name: 'Final Chaos', icon: '🔥', subtitle: 'Double points! Grand finale answer ranking & showdown.', seconds: 35 }
];
const WORD_PAIRS = [
    ['A thing you would bring to a deserted island', 'A thing you would bring on a camping trip'],
    ['Something that is always sticky', 'Something that is always slippery'],
    ['A suspicious thing to say at a wedding', 'A suspicious thing to say at a job interview'],
    ['An animal that would make a terrible roommate', 'An animal that would make a great roommate'],
    ['Something you should never put in a microwave', 'Something you often put in a microwave'],
    ['A terrible superpower', 'An underrated superpower']
];
const BLUFF_PROMPTS = [
    'Invent a ridiculous excuse for being 45 minutes late.',
    'What is the worst possible name for a luxury 5-star hotel?',
    'What would a raccoon say if it was elected Prime Minister?',
    'Describe a disaster first date in exactly five words.',
    'What is the most suspicious thing you could whisper to someone in an elevator?',
    'Invent an absurd new Olympic sport that should never be broadcast.',
    'What is the secret ingredient in the cafeteria mystery meat?',
    'What would your pet complain about if it could talk for 10 seconds?'
];
const SECRET_PROMPTS = [
    'What would you realistically do with 10 million dollars right now?',
    'If you had to survive a zombie apocalypse with 1 household item, what is it?',
    'What is a secret talent that would be totally useless in an emergency?',
    'What is the dumbest purchase you have ever made with zero regrets?',
    'If you could rename the Earth to anything, what would you name it?'
];
const MINI_CHALLENGES = [
    { kind: 'unscramble', prompt: 'Unscramble this word', answer: 'BANANA', scramble: 'NABANA', hint: 'A yellow fruit' },
    { kind: 'math', prompt: 'Solve before everyone else', answer: '42', question: '6 × 7' },
    { kind: 'emoji', prompt: 'Guess the phrase from emojis', answer: 'COLD FEET', question: '🥶 🦶' },
    { kind: 'memory', prompt: 'What number comes next?', answer: '32', question: '2, 4, 8, 16, ?' },
    { kind: 'word', prompt: 'Type this word BACKWARDS: CATION', answer: 'NOITAC', question: 'CATION' },
    { kind: 'trivia', prompt: 'How many sides does an octagon have?', answer: '8', question: 'Sides on an octagon?' }
];
const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
const makeCode = () => Array.from({ length: 6 }, () => CODE_CHARS[rand(CODE_CHARS.length)]).join('');
const safeName = (s) => String(s || 'Player').trim().replace(/[<>\u0000-\u001f]/g, '').slice(0, 18) || 'Player';
const safeAvatar = (a) => AVATARS.includes(a) ? a : pick(AVATARS);
function normalizeText(text) {
    return String(text || '').trim().toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
}
// Answer Ranking Algorithm:
// Compares identical answers (Hivemind consensus) and ranks entries by votes & popularity
function rankSubmissions(submissions, votes, playersMap) {
    const clusters = new Map();
    for (const [id, sub] of submissions.entries()) {
        const raw = String(sub.text || '').trim();
        const norm = normalizeText(raw);
        const p = playersMap.get(id);
        const authorInfo = { id, name: p?.name || 'Player', avatar: p?.avatar || '🎮' };
        if (!clusters.has(norm)) {
            clusters.set(norm, {
                norm,
                text: raw,
                authors: [authorInfo],
                isMatch: false,
                votes: 0,
                voters: []
            });
        }
        else {
            const cluster = clusters.get(norm);
            cluster.authors.push(authorInfo);
            cluster.isMatch = true; // HIVEMIND: Matching answer!
        }
    }
    // Count votes
    for (const [voterId, target] of votes.entries()) {
        const voter = playersMap.get(voterId);
        const voterName = voter?.name || 'Player';
        for (const cluster of clusters.values()) {
            const matchedByAuthor = cluster.authors.some(a => a.id === target);
            const matchedByNorm = cluster.norm === target;
            if (matchedByAuthor || matchedByNorm) {
                cluster.votes++;
                cluster.voters.push({ id: voterId, name: voterName });
                break;
            }
        }
    }
    // Sort: votes first, matches second, authors count third
    const rankedClusters = [...clusters.values()].sort((a, b) => {
        if (b.votes !== a.votes)
            return b.votes - a.votes;
        if (b.isMatch !== a.isMatch)
            return b.isMatch ? 1 : -1;
        return b.authors.length - a.authors.length;
    });
    const rankBonus = [35, 25, 15];
    const medals = ['🥇', '🥈', '🥉'];
    const playerAwards = [];
    rankedClusters.forEach((c, idx) => {
        c.rank = idx + 1;
        c.medal = medals[idx] || `#${idx + 1}`;
        const baseRankPts = rankBonus[idx] !== undefined ? rankBonus[idx] : 10;
        c.pointsPerAuthor = baseRankPts;
        c.authors.forEach((author) => {
            let pts = baseRankPts;
            const reasons = [];
            reasons.push(`${c.medal} Rank #${c.rank} Answer (+${baseRankPts} pts)`);
            if (c.isMatch) {
                const matchBonus = 25;
                pts += matchBonus;
                reasons.push(`🤝 Hivemind Match (+${matchBonus} pts)`);
            }
            if (c.votes > 0) {
                const votePts = c.votes * 15;
                pts += votePts;
                reasons.push(`🗳️ ${c.votes} Vote${c.votes > 1 ? 's' : ''} (+${votePts} pts)`);
            }
            playerAwards.push({
                id: author.id,
                name: author.name,
                avatar: author.avatar,
                points: pts,
                reason: reasons.join(' · '),
                rank: c.rank,
                medal: c.medal,
                isMatch: c.isMatch,
                answer: c.text,
                votes: c.votes
            });
        });
    });
    return { rankedClusters, playerAwards };
}
function publicRoom(room) {
    let safeRound = null;
    if (room.round) {
        const r = room.round;
        safeRound = {
            type: r.type,
            name: r.name,
            icon: r.icon,
            subtitle: r.subtitle,
            prompt: r.prompt,
            number: r.number,
            seconds: r.seconds,
            phase: r.phase || 'submitting',
            endsAt: r.endsAt,
            startedAt: r.startedAt,
            reactionStarted: r.reactionStarted || false,
            votingOptions: r.votingOptions || null,
            challenge: r.challenge ? { prompt: r.challenge.prompt, question: r.challenge.question || r.challenge.scramble || r.challenge.hint } : null,
            submittedCount: r.submissions.size,
            votedCount: r.votes.size
        };
    }
    return {
        code: room.code,
        hostId: room.hostId,
        status: room.status,
        players: [...room.players.values()].map(p => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            ready: p.ready,
            score: p.score,
            connected: p.connected
        })),
        roundIndex: room.roundIndex,
        round: safeRound,
        lastResult: room.lastResult,
        feed: room.feed.slice(-8)
    };
}
function emitRoom(room) {
    io.to(room.code).emit('room:update', publicRoom(room));
}
function addFeed(room, text) {
    room.feed.push({ id: randomBytes(4).toString('hex'), text, at: Date.now() });
    room.feed = room.feed.slice(-15);
}
function playerFor(room, socket) {
    return room?.players.get(socket.id);
}
function sendPrivate(room, player) {
    if (!room.round || !player)
        return;
    const r = room.round;
    const mySubmission = r.submissions?.get(player.id)?.text || null;
    const data = {
        type: r.type,
        phase: r.phase || 'submitting',
        prompt: r.playerPrompt?.[player.id] || r.prompt,
        role: r.roles?.[player.id] || null,
        target: r.target === player.id ? 'self' : null,
        myAnswer: mySubmission,
        alreadySubmitted: r.submissions?.has(player.id) || false,
        alreadyVoted: r.votes?.has(player.id) || false,
        reactionStarted: !!r.reactionStarted
    };
    io.to(player.id).emit('round:private', data);
}
function sendPrivates(room) {
    for (const p of room.players.values())
        sendPrivate(room, p);
}
function transitionToVotingPhase(room) {
    const r = room.round;
    if (!r || r.phase === 'voting')
        return;
    r.phase = 'voting';
    if (['bluff', 'secret', 'word'].includes(r.type)) {
        const rawSubmissions = [...r.submissions.entries()];
        const seen = new Map();
        rawSubmissions.forEach(([authorId, sub]) => {
            const norm = normalizeText(sub.text);
            if (!seen.has(norm)) {
                seen.set(norm, {
                    id: norm,
                    text: sub.text,
                    authorIds: [authorId]
                });
            }
            else {
                seen.get(norm).authorIds.push(authorId);
            }
        });
        r.votingOptions = [...seen.values()].sort(() => Math.random() - 0.5);
        r.prompt = r.type === 'bluff'
            ? 'VOTE: Which answer is the funniest, smartest, or most believable?'
            : r.type === 'word'
                ? 'VOTE: Spot the odd answer or vote for the best one!'
                : 'VOTE: Rank and pick your favorite answer!';
    }
    r.endsAt = Date.now() + 16000;
    if (room.timer)
        clearTimeout(room.timer);
    room.timer = setTimeout(() => finishRound(room), 16000);
    emitRoom(room);
    sendPrivates(room);
}
function startRound(room, index) {
    if (room.timer)
        clearTimeout(room.timer);
    room.roundIndex = index;
    room.lastResult = null;
    const def = ROUND_DEFS[index];
    const players = [...room.players.values()];
    const round = {
        ...def,
        number: index + 1,
        phase: 'submitting',
        submissions: new Map(),
        votes: new Map(),
        answers: new Map(),
        roles: {},
        playerPrompt: {},
        votingOptions: null,
        startedAt: Date.now(),
        endsAt: Date.now() + def.seconds * 1000,
        target: null
    };
    if (def.type === 'secret' || def.type === 'word' || def.type === 'accuse' || def.type === 'final') {
        const saboteur = pick(players);
        round.target = saboteur.id;
        players.forEach(p => round.roles[p.id] = p.id === saboteur.id ? 'TRICKSTER' : 'CREW');
    }
    if (def.type === 'word') {
        const [main, odd] = pick(WORD_PAIRS);
        round.prompt = main;
        players.forEach(p => round.playerPrompt[p.id] = p.id === round.target ? odd : main);
    }
    else if (def.type === 'bluff') {
        round.prompt = pick(BLUFF_PROMPTS);
    }
    else if (def.type === 'secret') {
        round.prompt = pick(SECRET_PROMPTS);
    }
    else if (def.type === 'reaction') {
        round.prompt = 'Wait until the screen turns GREEN, then tap as fast as you can!';
        round.reactionStarted = false;
        round.reactionDelay = 1800 + rand(3500);
        round.reactionTimeout = setTimeout(() => {
            if (room.round !== round || room.status !== 'playing')
                return;
            round.reactionStarted = true;
            round.startedAt = Date.now();
            io.to(room.code).emit('reaction:go', { at: round.startedAt });
            emitRoom(room);
        }, round.reactionDelay);
    }
    else if (def.type === 'mini') {
        round.challenge = pick(MINI_CHALLENGES);
        round.prompt = round.challenge.prompt;
    }
    else if (def.type === 'final') {
        round.prompt = 'Final Showdown: Submit your final battle answer & accuse the ultimate Trickster!';
    }
    else if (def.type === 'accuse') {
        round.prompt = 'Vote for the player you suspect is the Trickster. You cannot vote for yourself.';
    }
    room.round = round;
    room.status = 'playing';
    addFeed(room, `${def.icon} Round ${index + 1}: ${def.name} started!`);
    emitRoom(room);
    sendPrivates(room);
    if (def.type === 'reaction')
        io.to(room.code).emit('reaction:wait', { prompt: round.prompt });
    room.timer = setTimeout(() => {
        if (['bluff', 'secret', 'word'].includes(round.type) && round.phase === 'submitting' && round.submissions.size > 0) {
            transitionToVotingPhase(room);
        }
        else {
            finishRound(room);
        }
    }, def.seconds * 1000);
}
function finishRound(room) {
    if (!room || room.status !== 'playing' || !room.round)
        return;
    if (room.timer)
        clearTimeout(room.timer);
    const r = room.round;
    if (r.reactionTimeout)
        clearTimeout(r.reactionTimeout);
    const players = [...room.players.values()];
    const results = [];
    const add = (id, pts, reason) => {
        const p = room.players.get(id);
        if (p && pts) {
            p.score += pts;
            results.push({ id, name: p.name, avatar: p.avatar, points: pts, reason });
        }
    };
    let rankedAnswersData = null;
    // ANSWER RANKING LOGIC (for Question rounds)
    if (r.submissions && r.submissions.size > 0 && ['secret', 'word', 'bluff', 'final'].includes(r.type)) {
        const { rankedClusters, playerAwards } = rankSubmissions(r.submissions, r.votes, room.players);
        rankedAnswersData = rankedClusters.map((c) => ({
            rank: c.rank,
            medal: c.medal,
            text: c.text,
            authors: c.authors,
            isMatch: c.isMatch,
            votes: c.votes,
            pointsAwarded: c.pointsPerAuthor + (c.isMatch ? 25 : 0) + (c.votes * 15)
        }));
        for (const award of playerAwards) {
            add(award.id, award.points, award.reason);
        }
    }
    if (r.type === 'secret') {
        if (r.submissions.has(r.target))
            add(r.target, 20, '🕵️ Trickster blended into the answers');
        else
            add(r.target, -10, 'Trickster failed to submit');
    }
    else if (r.type === 'word') {
        const votes = [...r.votes.entries()];
        const caught = votes.some(([voter, target]) => target === r.target && voter !== r.target);
        for (const [voter, target] of votes) {
            if (target === r.target)
                add(voter, 15, '🎯 Spotted the odd-prompt Trickster');
        }
        if (!caught)
            add(r.target, 25, '🦊 Word Trickster escaped unnoticed');
        else
            add(r.target, -5, 'Word Trickster was caught');
    }
    else if (r.type === 'reaction') {
        const ranked = [...r.answers.entries()].sort((a, b) => a[1] - b[1]);
        ranked.forEach(([id, ms], i) => {
            const pts = Math.max(0, 30 - i * 5);
            add(id, pts, i === 0 ? `⚡ 1ST PLACE Reflexes (${ms}ms)` : `Place #${i + 1} (${ms}ms)`);
        });
        for (const p of players)
            if (!r.answers.has(p.id))
                add(p.id, -5, 'Slept through the reaction');
    }
    else if (r.type === 'accuse') {
        const counts = new Map();
        for (const [voter, target] of r.votes) {
            counts.set(target, (counts.get(target) || 0) + 1);
            add(voter, target === r.target ? 25 : -5, target === r.target ? '🎯 Correct Accusation!' : '❌ Wrong Accusation');
        }
        if (!r.votes.size || (counts.get(r.target) || 0) === 0)
            add(r.target, 30, '👑 Completely Fooled Everyone');
    }
    else if (r.type === 'mini') {
        for (const [id, sub] of r.submissions) {
            const isCorrect = String(sub.text).trim().toUpperCase() === String(r.challenge.answer).trim().toUpperCase();
            add(id, isCorrect ? 30 : 5, isCorrect ? '🎉 Mini-game Solved Correctly!' : 'Attempted answer');
        }
    }
    else if (r.type === 'final') {
        for (const [voter, target] of r.votes) {
            add(voter, target === r.target ? 40 : -10, target === r.target ? '🔥 Nailed the Final Accusation (+40)' : 'Missed final accusation');
        }
        if (!r.votes.size || ![...r.votes.values()].includes(r.target)) {
            add(r.target, 45, '👑 Survived Final Chaos Uncaught (+45)');
        }
    }
    room.lastResult = {
        round: r.number,
        name: r.name,
        type: r.type,
        results,
        rankedAnswers: rankedAnswersData,
        reveal: {
            targetName: room.players.get(r.target)?.name || null,
            targetAvatar: room.players.get(r.target)?.avatar || null,
            targetId: r.target,
            prompt: r.prompt,
            challenge: r.challenge ? { prompt: r.challenge.prompt, question: r.challenge.question || r.challenge.scramble || r.challenge.hint } : null
        }
    };
    addFeed(room, `Round ${r.number} complete — scores updated!`);
    room.status = r.number >= ROUND_DEFS.length ? 'finished' : 'intermission';
    room.round = null;
    emitRoom(room);
    if (room.status === 'intermission') {
        room.timer = setTimeout(() => {
            if (rooms.has(room.code) && room.status === 'intermission') {
                startRound(room, room.roundIndex + 1);
            }
        }, 8500);
    }
    else {
        const winner = [...room.players.values()].sort((a, b) => b.score - a.score)[0];
        room.lastResult.winner = winner ? { id: winner.id, name: winner.name, avatar: winner.avatar, score: winner.score } : null;
        emitRoom(room);
        // Save match to PostgreSQL database
        const sortedFinal = [...room.players.values()].sort((a, b) => b.score - a.score);
        saveMatchResult(room.code, winner ? { name: winner.name, avatar: winner.avatar, score: winner.score } : null, sortedFinal.map(p => ({ name: p.name, avatar: p.avatar, score: p.score })), ROUND_DEFS.length);
    }
}
function createRoom(socket, name, avatar) {
    let code = makeCode();
    while (rooms.has(code))
        code = makeCode();
    const room = {
        code,
        hostId: socket.id,
        players: new Map(),
        status: 'lobby',
        roundIndex: -1,
        round: null,
        timer: null,
        lastResult: null,
        feed: []
    };
    const chosenAvatar = safeAvatar(avatar);
    room.players.set(socket.id, {
        id: socket.id,
        name: safeName(name),
        avatar: chosenAvatar,
        ready: true,
        score: 0,
        connected: true
    });
    rooms.set(code, room);
    socket.join(code);
    socket.roomCode = code;
    addFeed(room, `${chosenAvatar} ${safeName(name)} created the room`);
    emitRoom(room);
    socket.emit('room:joined', { code, id: socket.id });
}
io.on('connection', (socket) => {
    socket.on('room:create', ({ name, avatar } = {}) => createRoom(socket, name, avatar));
    socket.on('room:join', ({ code, name, avatar } = {}) => {
        code = String(code || '').trim().toUpperCase();
        const room = rooms.get(code);
        if (!room)
            return socket.emit('game:error', 'Room not found. Check the code and try again.');
        if (room.status !== 'lobby')
            return socket.emit('game:error', 'This game has already started. Ask the host to create a new room.');
        if (room.players.size >= 8)
            return socket.emit('game:error', 'This room is full (8 players maximum).');
        const clean = safeName(name);
        if ([...room.players.values()].some(p => p.name.toLowerCase() === clean.toLowerCase())) {
            return socket.emit('game:error', 'That nickname is already taken in this room.');
        }
        const chosenAvatar = safeAvatar(avatar);
        room.players.set(socket.id, {
            id: socket.id,
            name: clean,
            avatar: chosenAvatar,
            ready: false,
            score: 0,
            connected: true
        });
        socket.join(code);
        socket.roomCode = code;
        addFeed(room, `${chosenAvatar} ${clean} joined the chaos!`);
        emitRoom(room);
        socket.emit('room:joined', { code, id: socket.id });
    });
    socket.on('player:avatar', ({ avatar } = {}) => {
        const room = rooms.get(socket.roomCode);
        if (!room)
            return;
        const p = playerFor(room, socket);
        if (!p)
            return;
        p.avatar = safeAvatar(avatar);
        emitRoom(room);
    });
    socket.on('player:ready', ({ ready } = {}) => {
        const room = rooms.get(socket.roomCode);
        if (!room)
            return;
        const p = playerFor(room, socket);
        if (!p || room.status !== 'lobby')
            return;
        p.ready = !!ready;
        emitRoom(room);
    });
    socket.on('game:start', () => {
        const room = rooms.get(socket.roomCode);
        if (!room)
            return;
        if (socket.id !== room.hostId)
            return socket.emit('game:error', 'Only the host can start the game.');
        if (room.status !== 'lobby')
            return;
        if (room.players.size < 2)
            return socket.emit('game:error', 'You need at least 2 players to start.');
        if ([...room.players.values()].some(p => !p.ready))
            return socket.emit('game:error', 'Everyone must be ready before starting.');
        for (const p of room.players.values())
            p.score = 0;
        startRound(room, 0);
    });
    socket.on('round:submit', ({ text } = {}) => {
        const room = rooms.get(socket.roomCode);
        if (!room)
            return;
        const p = playerFor(room, socket);
        const r = room?.round;
        if (!p || !r || room.status !== 'playing')
            return;
        if (!['secret', 'word', 'bluff', 'mini', 'final'].includes(r.type))
            return;
        const answer = String(text || '').trim().slice(0, 160);
        if (!answer || r.submissions.has(socket.id))
            return;
        r.submissions.set(socket.id, { text: answer, player: { id: p.id, name: p.name, avatar: p.avatar } });
        emitRoom(room);
        sendPrivates(room);
        if (r.submissions.size === room.players.size) {
            if (['bluff', 'secret', 'word'].includes(r.type)) {
                transitionToVotingPhase(room);
            }
            else if (['mini'].includes(r.type)) {
                finishRound(room);
            }
            else if (r.type === 'final' && r.votes.size === room.players.size) {
                finishRound(room);
            }
        }
    });
    socket.on('round:vote', ({ targetId, targetAnswer } = {}) => {
        const room = rooms.get(socket.roomCode);
        if (!room)
            return;
        const p = playerFor(room, socket);
        const r = room?.round;
        if (!p || !r || room.status !== 'playing' || r.votes.has(socket.id))
            return;
        const voteTarget = targetAnswer || targetId;
        if (!voteTarget)
            return;
        const myAnswerNorm = normalizeText(r.submissions.get(socket.id)?.text);
        if (targetAnswer && targetAnswer === myAnswerNorm) {
            return socket.emit('game:error', 'You cannot vote for your own answer!');
        }
        if (targetId && targetId === socket.id) {
            return socket.emit('game:error', 'You cannot vote for yourself!');
        }
        r.votes.set(socket.id, voteTarget);
        emitRoom(room);
        sendPrivates(room);
        if (r.votes.size >= room.players.size - (r.phase === 'voting' ? 0 : 1)) {
            finishRound(room);
        }
    });
    socket.on('reaction:tap', () => {
        const room = rooms.get(socket.roomCode);
        if (!room)
            return;
        const r = room?.round;
        const p = playerFor(room, socket);
        if (!p || !r || r.type !== 'reaction' || !r.reactionStarted || r.answers.has(socket.id))
            return;
        r.answers.set(socket.id, Date.now() - r.startedAt);
        emitRoom(room);
        if (r.answers.size === room.players.size)
            finishRound(room);
    });
    socket.on('reaction:emoji', ({ emoji } = {}) => {
        const room = rooms.get(socket.roomCode);
        if (!room)
            return;
        const p = playerFor(room, socket);
        if (!p || !emoji)
            return;
        io.to(room.code).emit('emoji:burst', {
            id: randomBytes(4).toString('hex'),
            emoji,
            senderName: p.name,
            senderAvatar: p.avatar
        });
    });
    socket.on('game:next', () => {
        const room = rooms.get(socket.roomCode);
        if (!room || socket.id !== room.hostId || room.status !== 'intermission')
            return;
        if (room.timer)
            clearTimeout(room.timer);
        startRound(room, room.roundIndex + 1);
    });
    socket.on('game:rematch', () => {
        const room = rooms.get(socket.roomCode);
        if (!room || socket.id !== room.hostId || room.status !== 'finished')
            return;
        if (room.timer)
            clearTimeout(room.timer);
        room.roundIndex = -1;
        room.lastResult = null;
        room.status = 'lobby';
        room.round = null;
        for (const p of room.players.values()) {
            p.score = 0;
            p.ready = p.id === room.hostId;
        }
        addFeed(room, '🔄 Rematch lobby opened!');
        emitRoom(room);
    });
    socket.on('disconnect', () => {
        const code = socket.roomCode;
        const room = rooms.get(code);
        if (!room)
            return;
        const p = room.players.get(socket.id);
        if (p) {
            p.connected = false;
            addFeed(room, `${p.name} disconnected`);
        }
        if (room.status === 'lobby') {
            room.players.delete(socket.id);
            if (!room.players.size) {
                rooms.delete(code);
                return;
            }
            if (room.hostId === socket.id)
                room.hostId = room.players.keys().next().value;
        }
        emitRoom(room);
    });
});
// Initialize PostgreSQL database and launch HTTP server
initDatabase().finally(() => {
    httpServer.listen(PORT, () => console.log(`🚀 CHAOS ROOM TypeScript server listening on port ${PORT}`));
});
