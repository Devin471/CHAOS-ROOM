import {
  RoundType, AnswerTag, RankedAnswer, PlayerAward, AuthorInfo,
  PersonalityVector, PersonalityReport, PersonalityType, PartnerMatch,
  PublicRound, PublicRoom, InternalRoomState, Player
} from './types.js';

export const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const AVATARS = ['🦊','🐸','🐼','🐙','🦄','🐯','🐧','🦝','🤖','👽','🦖','🍕'];

export const rand = (n: number) => Math.floor(Math.random() * n);
export const pick = <T>(arr: T[]): T => arr[rand(arr.length)];
export const makeCode = () => Array.from({ length: 6 }, () => CODE_CHARS[rand(CODE_CHARS.length)]).join('');
export const safeName = (s: any) => String(s || 'Player').trim().replace(/[<>\u0000-\u001f]/g, '').slice(0, 18) || 'Player';
export const safeAvatar = (a: any) => AVATARS.includes(a) ? a : pick(AVATARS);

export function normalizeText(text: string): string {
  return String(text || '').trim().toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
}

// ============================================================
// 3 CORE ROUND DEFINITIONS (Preserves gameplay, 3-round standard)
// ============================================================
export const ROUND_DEFS: {
  type: RoundType;
  name: string;
  icon: string;
  subtitle: string;
  seconds: number;
}[] = [
  {
    type: 'creative',
    name: 'Chaos Brainstorm',
    icon: '🧠',
    subtitle: 'Submit your wittiest, funniest answer! The AI Judge ranks without mercy.',
    seconds: 35,
  },
  {
    type: 'reaction',
    name: 'Quick Hands',
    icon: '⚡',
    subtitle: 'Reflex check! Tap when GREEN — fastest reflexes take the crown.',
    seconds: 15,
  },
  {
    type: 'creative',
    name: 'FINAL CHAOS SHOWDOWN',
    icon: '🔥',
    subtitle: 'DOUBLE POINTS! Final showdown for the crown. Give it everything!',
    seconds: 40,
  },
];

// Dynamic procedural funny templates
export const DYNAMIC_TEMPLATES: (() => string)[] = [
  () => `You are elected President of ${pick(['Earth', 'a colony of pigeons', 'the underground mole kingdom', 'the internet', 'Antarctica'])}, but you can only communicate using ${pick(['interpretive dance', 'cooking recipes', 'ancient dinosaur roars', 'bad knock-knock jokes', 'haikus'])}. What is your first executive order?`,
  () => `You are on Shark Tank pitching ${pick(['a waterproof toaster', 'shoes made of solid cheese', 'an alarm clock that physically slaps you', 'a translator for judgmental cats', 'glow-in-the-dark toilet paper'])} to ${pick(['Elon Musk', 'Gordon Ramsay', 'Snoop Dogg', 'a panel of disappointed grandmas', 'Darth Vader'])}. What is your 10-second sales pitch?`,
  () => `An alien warlord threatens to vaporize humanity unless someone proves our worth with ${pick(['one dance move', 'one sandwich recipe', 'one ridiculous pickup line', 'one honest complaint about Monday mornings', 'an explanation of why socks disappear in dryers'])}. What is your emergency submission?`,
  () => `What is the single worst piece of advice you could give to someone ${pick(['going on a first date with a vampire', 'starting their first day as an astronaut', 'interviewing for the job of Mafia accountant', 'meeting their future in-laws at a nudist beach', 'trying to tame a wild honey badger'])}?`,
  () => `Write a 1-star Yelp review for ${pick(['the Garden of Eden', 'Noah’s Ark during day 39 of rain', 'the International Space Station restroom', 'a time-machine repair shop', 'a secret underground wizard tavern'])}.`,
  () => `You wake up and realize you are cursed: whenever you tell a lie, ${pick(['you sprout a pineapple on your head', 'a marching band plays behind you', 'you speak fluent backwards Latin', 'your clothes turn into neon spandex', 'a random potato drops from the sky'])}. How do you survive your job interview today?`,
  () => `What is the most suspicious or unhinged thing you could whisper to ${pick(['a stranger in a crowded elevator', 'the TSA security agent at the airport', 'your barista after taking a sip', 'your dentist right before they start drilling', 'the priest during a quiet confession'])}?`,
  () => `Scientists invent a machine that translates ${pick(['what cats actually think of humans', 'what office plants say about employees', 'what refrigerator leftovers think when the door opens', 'what GPS voices say when you miss an exit', 'what your search history says behind your back'])}. Quote the most scandalous thought.`,
  () => `If your last text message was carved onto your gravestone as your final words of wisdom to humanity, what does it teach future generations?`,
  () => `Describe a new Olympic sport that combines ${pick(['hot dog eating', 'figure skating', 'tax preparation', 'avoiding eye contact', 'pillow fighting'])} with ${pick(['extreme ironing', 'competitive napping', 'parallel parking', 'aggressive banjo playing', 'screaming at software updates'])}. Name the sport and its golden rule!`,
  () => `You are trapped in ${pick(['an IKEA warehouse after midnight with sentient mannequins', 'a supermarket aisle for 3 weeks', 'an elevator with 4 identical clones of yourself', 'a medieval dungeon with only a 3% smartphone battery', 'a reality TV show hosted by angry Canadian geese'])}. What is your master survival plan?`,
  () => `What would the warning label on a brand-new human being say if humans came fresh in a retail box with an instruction manual?`,
  () => `You are appointed judge in a chaotic court case where ${pick(['a golden retriever is suing its owner for fake ball throws', 'a Roomba is on trial for running over a wedding cake', 'a time traveler is being sued for spoiling movie endings', 'a ghost is being evicted for not paying rent', 'a pigeon is charged with espionage'])}. What is your final verdict?`,
  () => `Invent a ridiculous slang word for the year 2050, define what it means, and use it in a dramatic sentence!`,
  () => `If history’s greatest villains had to run ${pick(['a customer service call center', 'a kindergarten daycare', 'a vegan bakery', 'a motivational podcast', 'a high school marching band'])}, who would be the worst and what’s their slogan?`,
];

export const QUESTION_BANK: { prompt: string; category: string }[] = [
  { prompt: "You've been elected president but you can only communicate through interpretive dance. What's your first policy?", category: 'absurd' },
  { prompt: "A genie grants you one wish, but it must involve a rubber duck. What do you wish for?", category: 'absurd' },
  { prompt: "You wake up and everyone on Earth has swapped voices with their pet. How do you survive the day?", category: 'absurd' },
  { prompt: "You're stuck in an elevator with your past self for 10 minutes. What do you say to ruin their life?", category: 'absurd' },
  { prompt: "Scientists discover that laughing causes gravity to reverse for 3 seconds. How does society adapt?", category: 'absurd' },
  { prompt: "What's the worst possible advice you could give someone going on a first date?", category: 'advice' },
  { prompt: "How would you explain the internet to a medieval peasant using only food analogies?", category: 'advice' },
  { prompt: "Give the most useless productivity tip you can think of.", category: 'advice' },
  { prompt: "What terrible advice would you put on a motivational poster?", category: 'advice' },
  { prompt: "What's the most dangerous thing you could say to defuse an argument?", category: 'advice' },
  { prompt: "Invent a useless product that would somehow become a viral sensation.", category: 'invention' },
  { prompt: "You invent a machine that solves one of life's biggest problems. Unfortunately it creates a worse problem. What happened?", category: 'invention' },
  { prompt: "Create a new Olympic sport that combines two completely unrelated activities.", category: 'invention' },
  { prompt: "Describe a revolutionary app that nobody actually needs.", category: 'invention' },
  { prompt: "If you had to survive 30 days on a deserted island using only what's in your bag right now, what's your strategy?", category: 'survival' },
  { prompt: "Zombies have taken over. Your only weapon is whatever is within arm's reach right now. How do you survive?", category: 'survival' },
  { prompt: "What would happen if Shakespeare wrote the instruction manual for IKEA furniture?", category: 'famous' },
  { prompt: "Describe what Elon Musk's morning routine would look like if he was a raccoon.", category: 'famous' },
  { prompt: "What is the most suspicious thing you could say during a meeting to make everyone uncomfortable?", category: 'work' },
  { prompt: "Write the worst possible 'Out of Office' auto-reply email.", category: 'work' },
  { prompt: "If colors had a flavor, what would the color purple taste like and why?", category: 'chaos' },
  { prompt: "What's the worst possible name for a luxury brand of toilet paper?", category: 'chaos' },
  { prompt: "Describe the most dramatic thing that could happen at a hot dog eating contest.", category: 'food' },
  { prompt: "What would the most unhinged Twitter bio read in the year 3000?", category: 'social' },
  { prompt: "What's the least romantic thing someone could say during a marriage proposal?", category: 'relationship' },
];

export function pickFreshQuestion(usedQuestions: string[]): string {
  const usedSet = new Set(usedQuestions);
  const available = QUESTION_BANK.filter(q => !usedSet.has(q.prompt));

  if (available.length > 0 && Math.random() < 0.6) {
    const chosen = pick(available);
    return chosen.prompt;
  }

  for (let attempt = 0; attempt < 50; attempt++) {
    const templateFn = pick(DYNAMIC_TEMPLATES);
    const candidate = templateFn();
    if (!usedSet.has(candidate)) return candidate;
  }

  return `CHAOS DILEMMA #${rand(9000) + 1000}: You are stuck with ${pick(['a screaming goat', 'a sentient microwave', 'a mime with a megaphone'])}. What is your escape plan?`;
}

// ============================================================
// AI AUTO-RANKING ENGINE (Humor, Logic, Originality & Negative Penalties)
// ============================================================
export function autoRankAnswers(
  submissions: Record<string, { text: string; player: { id: string; name: string; avatar: string } }>,
  players: Record<string, Player>,
  roundType: RoundType,
  isFinalRound: boolean
): {
  rankedAnswers: RankedAnswer[];
  playerAwards: PlayerAward[];
  personalityDeltas: Record<string, Partial<PersonalityVector>>;
} {
  interface ScoredEntry {
    id: string;
    rawText: string;
    authors: AuthorInfo[];
    isMatch: boolean;
    humorScore: number;
    logicScore: number;
    originalityScore: number;
    totalScore: number;
    tags: AnswerTag[];
    aiReason: string;
  }

  const clusters = new Map<string, ScoredEntry>();
  for (const [playerId, sub] of Object.entries(submissions)) {
    const raw = String(sub.text || '').trim();
    const norm = normalizeText(raw);
    const p = players[playerId];
    const authorInfo: AuthorInfo = { id: playerId, name: p?.name || 'Player', avatar: p?.avatar || '🎮' };

    if (!clusters.has(norm)) {
      clusters.set(norm, {
        id: norm,
        rawText: raw,
        authors: [authorInfo],
        isMatch: false,
        humorScore: 0,
        logicScore: 0,
        originalityScore: 0,
        totalScore: 0,
        tags: [],
        aiReason: '',
      });
    } else {
      const c = clusters.get(norm)!;
      c.authors.push(authorInfo);
      c.isMatch = true;
    }
  }

  const humorWords = ['fart', 'butt', 'naked', 'toilet', 'drunk', 'chaos', 'panic', 'scream', 'weird', 'alien', 'robot', 'pizza', 'dinosaur', 'clown', 'explosion', 'fire', 'crash', 'invisible', 'giant', 'tiny', 'raccoon', 'goblin', 'dragon', 'potato', 'banana', 'zombie', 'ghost', 'witch', 'donut', 'spaghetti', 'mustache', 'yeet', 'epic', 'disaster', 'trap', 'sneak', 'murder', 'kidnap', 'escape', 'bribe', 'corrupt', 'absurd', 'ridiculous', 'hilarious', 'insane', 'crazy', 'bonkers', 'unhinged'];
  const logicWords = ['because', 'therefore', 'however', 'system', 'process', 'strategy', 'analysis', 'efficiency', 'implement', 'solution', 'calculate', 'optimize', 'structure', 'method', 'logical', 'rational', 'proven', 'scientific', 'data', 'evidence', 'fact', 'study', 'research', 'algorithm', 'protocol'];
  const creativeWords = ['imagine', 'create', 'design', 'invent', 'discover', 'dream', 'vision', 'art', 'magic', 'fantasy', 'story', 'poem', 'song', 'paint', 'sculpt', 'build', 'craft', 'unique', 'novel', 'original', 'twist', 'surprise', 'unexpected'];
  const darkWords = ['death', 'dead', 'kill', 'murder', 'blood', 'dark', 'evil', 'villain', 'sinister', 'ominous', 'cursed', 'doom', 'apocalypse', 'nightmare', 'horror', 'terrify', 'soul', 'demon', 'hell'];
  const lazyWords = ['idk', 'nothing', 'no idea', 'skip', 'pass', 'dunno', 'whatever', 'sure', 'fine', 'ok'];

  const allNorms = [...clusters.keys()];

  for (const [, entry] of clusters.entries()) {
    const norm = entry.id;
    const words = norm.split(' ');
    const wordCount = words.length;
    const charLen = norm.length;

    let humor = 0;
    let logic = 0;
    let originality = 0;

    const isGibberish = /^(.)\1{2,}$/.test(norm) || (norm.length > 5 && !/[aeiouy]/.test(norm));
    const isTooShort = norm.length < 3;
    const isLazyPhrase = lazyWords.some(lw => norm === lw || norm.startsWith(lw + ' '));

    if (isGibberish || isTooShort || isLazyPhrase) {
      entry.tags.push('LAZY', 'NEGATIVE');
      entry.totalScore = -15;
      entry.humorScore = 0;
      entry.logicScore = 0;
      entry.originalityScore = 0;
      entry.aiReason = pick([
        "Total nonsense or lazy submission. Penalized with negative points (-15 pts)!",
        "Keyboard smash or 1-word cop-out detected. The AI Judge awards negative score!",
        "The AI searched for effort and found zero. Minus 15 points!",
      ]);
      continue;
    }

    if (charLen > 20) { originality += 12; logic += 6; humor += 5; }
    if (charLen > 50) { humor += 10; originality += 8; }
    if (charLen > 90) { humor += 5; originality += 5; }

    const humorHits = humorWords.filter(hw => norm.includes(hw)).length;
    humor += Math.min(humorHits * 12, 45);
    if (humorHits >= 2) entry.tags.push('HILARIOUS');

    const logicHits = logicWords.filter(lw => norm.includes(lw)).length;
    logic += Math.min(logicHits * 10, 40);
    if (logicHits >= 2) entry.tags.push('LOGICAL');

    const creativeHits = creativeWords.filter(cw => norm.includes(cw)).length;
    originality += Math.min(creativeHits * 10, 35);
    if (creativeHits >= 2) entry.tags.push('CREATIVE');

    const darkHits = darkWords.filter(dw => norm.includes(dw)).length;
    humor += Math.min(darkHits * 6, 20);
    if (darkHits >= 1) entry.tags.push('DARK HUMOR');

    const exclamations = (entry.rawText.match(/!/g) || []).length;
    if (exclamations > 1) { humor += 8; entry.tags.push('CHAOTIC'); }

    if (entry.isMatch) {
      humor += 15;
      originality += 10;
      entry.tags.push('HIVEMIND');
    }

    humor += rand(13) - 6;
    logic += rand(11) - 5;
    originality += rand(11) - 5;

    if (isFinalRound) { humor *= 1.2; logic *= 1.2; originality *= 1.2; }

    entry.humorScore = Math.max(0, Math.min(100, Math.round(humor)));
    entry.logicScore = Math.max(0, Math.min(100, Math.round(logic)));
    entry.originalityScore = Math.max(0, Math.min(100, Math.round(originality)));

    entry.totalScore = Math.round(
      entry.humorScore * 0.45 +
      entry.logicScore * 0.25 +
      entry.originalityScore * 0.30
    );

    if (entry.totalScore < 10 && !entry.isMatch) {
      entry.totalScore = Math.max(-15, entry.totalScore - 15);
      entry.tags.push('CRINGE');
      if (entry.totalScore < 0) entry.tags.push('NEGATIVE');
    }

    if (entry.logicScore > 50 && !entry.tags.includes('LOGICAL')) entry.tags.push('GENIUS');
    if (entry.humorScore > 55 && entry.logicScore < 20) entry.tags.push('WTF?');

    entry.aiReason = generateAIReason(entry.tags);
  }

  const sorted = [...clusters.values()].sort((a, b) => b.totalScore - a.totalScore);
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
  const basePoints = [40, 28, 18, 10, 5, 3, 2, 1];

  const rankedAnswers: RankedAnswer[] = [];
  const playerAwards: PlayerAward[] = [];
  const personalityDeltas: Record<string, Partial<PersonalityVector>> = {};

  sorted.forEach((entry, idx) => {
    const rank = idx + 1;
    const medal = medals[idx] || `#${rank}`;
    let pts = basePoints[idx] ?? 1;

    if (entry.totalScore < 0) pts = entry.totalScore;
    else if (entry.totalScore < 10) pts = 0;

    if (entry.isMatch) pts += 20;
    if (isFinalRound) pts = Math.round(pts * 2);

    rankedAnswers.push({
      rank,
      medal,
      text: entry.rawText,
      authors: entry.authors,
      isMatch: entry.isMatch,
      pointsAwarded: pts,
      tags: entry.tags.slice(0, 3),
      aiReason: entry.aiReason,
      humorScore: entry.humorScore,
      logicScore: entry.logicScore,
      originalityScore: entry.originalityScore,
    });

    entry.authors.forEach(author => {
      playerAwards.push({
        id: author.id,
        name: author.name,
        avatar: author.avatar,
        points: pts,
        reason: `${medal} Rank #${rank} · ${entry.tags.slice(0, 2).join(' · ') || 'Evaluated'} (${pts > 0 ? '+' : ''}${pts} pts)`,
        rank,
        medal,
        isMatch: entry.isMatch,
        answer: entry.rawText,
        tags: entry.tags,
      });

      const delta: Partial<PersonalityVector> = { humor: 0, logic: 0, creativity: 0, chaos: 0, darkness: 0, laziness: 0 };
      if (entry.tags.includes('HILARIOUS') || entry.tags.includes('WTF?')) delta.humor = 15;
      if (entry.tags.includes('DARK HUMOR')) { delta.humor = 8; delta.darkness = 20; }
      if (entry.tags.includes('LOGICAL') || entry.tags.includes('GENIUS')) delta.logic = 20;
      if (entry.tags.includes('CREATIVE') || entry.tags.includes('POETIC')) delta.creativity = 20;
      if (entry.tags.includes('CHAOTIC')) delta.chaos = 20;
      if (entry.tags.includes('LAZY') || entry.tags.includes('NEGATIVE')) delta.laziness = 20;

      personalityDeltas[author.id] = delta;
    });
  });

  return { rankedAnswers, playerAwards, personalityDeltas };
}

function generateAIReason(tags: AnswerTag[]): string {
  if (tags.includes('LAZY') || tags.includes('NEGATIVE')) {
    return pick([
      "The AI judge wept a single digital tear. Minimal effort detected.",
      "Zero effort detected. The AI penalizes laziness with negative points!",
      "Confidently wrong or empty. The AI Judge docks points.",
    ]);
  }
  if (tags.includes('HILARIOUS')) {
    return pick([
      "Humor circuits overloaded. Emergency giggle protocol activated!",
      "Scientifically classified as: big funny. The AI has spoken.",
      "Found the joke AND the punchline with textbook execution.",
    ]);
  }
  if (tags.includes('GENIUS') || tags.includes('LOGICAL')) {
    return pick([
      "Impressive logical framework. The AI gives a respectful nod.",
      "Methodical and calculated. Suspiciously well-thought-out.",
      "Passed the AI's logic validation check with high honors.",
    ]);
  }
  if (tags.includes('CHAOTIC')) {
    return pick([
      "Total chaotic energy deployed. The AI respects the commitment.",
      "Unpredictable, unhinged, and somehow correct.",
      "The AI's prediction model exploded trying to anticipate this.",
    ]);
  }
  return pick([
    "Original thought detected. The AI approves with enthusiasm.",
    "A bold and creative take that stood out from the crowd.",
    "Creative flair registered by the judging algorithm.",
  ]);
}

// ============================================================
// PERSONALITY PROFILES & BEST PARTNER MATCHMAKING
// ============================================================
export function buildPersonalityReports(
  players: Player[],
  vectorsMap: Record<string, PersonalityVector>
): PersonalityReport[] {
  const reports: PersonalityReport[] = [];

  for (const player of players) {
    const vector = vectorsMap[player.id] || { humor: 40, logic: 35, creativity: 40, chaos: 30, darkness: 15, laziness: 0 };

    let archetype: { type: PersonalityType; emoji: string; description: string } = {
      type: 'The Comedian',
      emoji: '😂',
      description: "You came to bring laughter and chaos. Every question was an opportunity for comedy.",
    };

    if (vector.logic > 55 && vector.logic >= vector.humor) {
      archetype = { type: 'The Logical Mind', emoji: '🔬', description: "Calculated, rational, and strategic. You brought order to the chaos room." };
    } else if (vector.creativity > 55 && vector.creativity >= vector.humor) {
      archetype = { type: 'The Poet', emoji: '🎨', description: "Deeply imaginative and original. Your answers took turns nobody saw coming." };
    } else if (vector.chaos > 50) {
      archetype = { type: 'The Chaotic One', emoji: '🌪️', description: "Unpredictable and wild. You kept everyone on their toes." };
    } else if (vector.laziness > 25) {
      archetype = { type: 'The Wild Card', emoji: '😴', description: "Minimal effort, maximum audacity. You played by your own rules." };
    }

    const topTag: AnswerTag = vector.humor >= vector.logic && vector.humor >= vector.creativity
      ? 'HILARIOUS'
      : vector.logic > 40 ? 'LOGICAL'
      : vector.creativity > 35 ? 'CREATIVE'
      : 'CHAOTIC';

    reports.push({
      playerId: player.id,
      playerName: player.name,
      playerAvatar: player.avatar,
      archetype: archetype.type,
      archetypeEmoji: archetype.emoji,
      description: archetype.description,
      topTag,
      vector,
      bestPartners: [],
    });
  }

  // Calculate Best Partner Matching
  for (const report of reports) {
    const myVector = vectorsMap[report.playerId] || { humor: 40, logic: 35, creativity: 40, chaos: 30, darkness: 15, laziness: 0 };
    const partners: PartnerMatch[] = [];

    for (const other of reports) {
      if (other.playerId === report.playerId) continue;
      const theirVector = vectorsMap[other.playerId] || { humor: 40, logic: 35, creativity: 40, chaos: 30, darkness: 15, laziness: 0 };

      const humorSync = Math.max(0, 100 - Math.abs(myVector.humor - theirVector.humor));
      const logicSync = Math.max(0, 100 - Math.abs(myVector.logic - theirVector.logic));
      const creativeSync = Math.max(0, 100 - Math.abs(myVector.creativity - theirVector.creativity));
      const chaosSync = Math.max(0, 100 - Math.abs(myVector.chaos - theirVector.chaos));
      const compat = Math.max(45, Math.min(99, Math.round(humorSync * 0.35 + creativeSync * 0.25 + logicSync * 0.25 + chaosSync * 0.15)));

      const compatLabel =
        compat >= 85 ? 'COSMIC MIND MESH 🔥 (95%+ Synced)' :
        compat >= 70 ? 'DYNAMIC CHAOS DUO ⚡' :
        compat >= 55 ? 'SOLID THINKING ALLIES 🤝' : 'ODD COUPLE EXPERIMENT 🌀';

      const sharedTags: AnswerTag[] = [];
      if (myVector.humor > 20 && theirVector.humor > 20) sharedTags.push('HILARIOUS');
      if (myVector.chaos > 20 && theirVector.chaos > 20) sharedTags.push('CHAOTIC');
      if (myVector.logic > 20 && theirVector.logic > 20) sharedTags.push('LOGICAL');

      let reason = '';
      if (humorSync > 70 && creativeSync > 65) {
        reason = `${other.playerName} is your #1 Soulmate in Chaos! Both of you think on the same unhinged wavelength: you both favored hilarious answers (${humorSync}% Humor Sync), avoided boring cliches, and shared witty creative timing across all rounds!`;
      } else if (logicSync > 70) {
        reason = `${other.playerName} is your Best Strategic Mindset Partner! You both approached questions with clever logic (${logicSync}% Logic Match) and sharp analytical twists rather than pure randomness.`;
      } else if (chaosSync > 70) {
        reason = `${other.playerName} shares your high-voltage chaotic spirit! Neither of you played it safe — you took bold, unpredictable risks that kept everyone guessing.`;
      } else {
        reason = `${other.playerName} is your Perfect Complementary Partner! Your contrasting thinking styles balanced each other: when one brought chaos, the other brought logic.`;
      }

      partners.push({
        playerId: other.playerId,
        playerName: other.playerName,
        playerAvatar: other.playerAvatar,
        compatibilityScore: compat,
        compatibilityLabel: compatLabel,
        sharedTags,
        reason,
      });
    }

    report.bestPartners = partners.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  }

  return reports;
}

export function publicRoom(room: InternalRoomState): PublicRoom {
  let safeRound: PublicRound | null = null;
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
      challenge: r.challenge,
      submittedCount: r.type === 'reaction' ? Object.keys(r.answers).length : Object.keys(r.submissions).length,
      questionIndex: (room.currentQuestionInRound ?? 0) + 1,
      totalQuestions: room.questionsPerRound || 1,
    };
  }

  return {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    players: Object.values(room.players).map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      ready: p.ready,
      score: p.score,
      connected: p.connected,
      lastSeen: p.lastSeen,
    })),
    roundIndex: room.roundIndex,
    totalRounds: room.totalRounds || 3,
    questionsPerRound: room.questionsPerRound || 1,
    round: safeRound,
    lastResult: room.lastResult,
    feed: room.feed.slice(-8),
    personalityReports: room.status === 'finished' ? buildPersonalityReports(Object.values(room.players), room.personalityVectors) : null,
  };
}
