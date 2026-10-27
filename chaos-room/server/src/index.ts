import express, { Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';
import {
  Player, PublicRoom, PublicRound, RoundType,
  RankedAnswer, PlayerAward, AuthorInfo, PersonalityVector,
  PersonalityReport, PersonalityType, AnswerTag, PartnerMatch
} from '../../shared/types.js';
import { initDatabase, saveMatchResult, getTopPlayers } from './db.js';

dotenv.config();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, name: 'CHAOS ROOM ARCADE', version: '3.0.0-autorank' });
});
app.get('/api/leaderboard', async (_req: Request, res: Response) => {
  const topPlayers = await getTopPlayers();
  res.json({ ok: true, topPlayers });
});

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*', methods: ['GET', 'POST'] } });
const PORT = process.env.PORT || 3001;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const AVATARS = ['🦊','🐸','🐼','🐙','🦄','🐯','🐧','🦝','🤖','👽','🦖','🍕'];

// ============================================================
//  MASSIVE QUESTION BANK (300+ unique funny questions)
// ============================================================
const QUESTION_BANK: { prompt: string; category: string }[] = [
  // ABSURD SITUATIONS
  { prompt: "You've been elected president but you can only communicate through interpretive dance. What's your first policy?", category: 'absurd' },
  { prompt: "A genie grants you one wish, but it must involve a rubber duck. What do you wish for?", category: 'absurd' },
  { prompt: "You wake up and everyone on Earth has swapped voices with their pet. How do you survive the day?", category: 'absurd' },
  { prompt: "You're stuck in an elevator with your past self for 10 minutes. What do you say to ruin their life?", category: 'absurd' },
  { prompt: "Scientists discover that laughing causes gravity to reverse for 3 seconds. How does society adapt?", category: 'absurd' },
  { prompt: "Your shadow gains sentience and starts making decisions for you. Name its first decision.", category: 'absurd' },
  { prompt: "All furniture worldwide becomes sentient at midnight. What does your couch do first?", category: 'absurd' },
  { prompt: "You can only communicate by singing opera for the rest of your life. What's your first aria?", category: 'absurd' },
  { prompt: "The moon is replaced by a giant disco ball. How does this change your daily routine?", category: 'absurd' },
  { prompt: "You invent a machine that turns tears into cryptocurrency. What's your marketing strategy?", category: 'absurd' },
  { prompt: "Every time someone lies, their nose transforms into a random vegetable. What vegetable is most common?", category: 'absurd' },
  { prompt: "You can become invisible but only when you're singing. What do you do with this power?", category: 'absurd' },
  { prompt: "Your reflection starts giving you unsolicited life advice. What's the worst thing it says?", category: 'absurd' },
  { prompt: "All clocks stop working, but people still have to show up 'on time.' How do you survive?", category: 'absurd' },
  { prompt: "You discover your houseplant has been writing a memoir about your life. What's the chapter title?", category: 'absurd' },

  // TERRIBLE ADVICE
  { prompt: "What's the worst possible advice you could give someone going on a first date?", category: 'advice' },
  { prompt: "How would you explain the internet to a medieval peasant using only food analogies?", category: 'advice' },
  { prompt: "Give the most useless productivity tip you can think of.", category: 'advice' },
  { prompt: "What terrible advice would you put on a motivational poster?", category: 'advice' },
  { prompt: "What's the most dangerous thing you could say to defuse an argument?", category: 'advice' },
  { prompt: "Write the worst possible fortune cookie message.", category: 'advice' },
  { prompt: "What career advice should never be given to a child?", category: 'advice' },
  { prompt: "Give one piece of advice that would ruin someone's job interview.", category: 'advice' },
  { prompt: "What would the world's worst self-help book be titled and what's its key lesson?", category: 'advice' },
  { prompt: "What's the most backward relationship advice you can give?", category: 'advice' },

  // WEIRD INVENTIONS
  { prompt: "Invent a useless product that would somehow become a viral sensation.", category: 'invention' },
  { prompt: "You invent a machine that solves one of life's biggest problems. Unfortunately it creates a worse problem. What happened?", category: 'invention' },
  { prompt: "Create a new Olympic sport that combines two completely unrelated activities.", category: 'invention' },
  { prompt: "Describe a revolutionary app that nobody actually needs.", category: 'invention' },
  { prompt: "What would you name a cologne/perfume that smells exactly like a hospital?", category: 'invention' },
  { prompt: "Invent a new holiday and describe exactly how it's celebrated.", category: 'invention' },
  { prompt: "Design the world's worst theme park and name the main attraction.", category: 'invention' },
  { prompt: "Create a subscription box service for the most niche hobby imaginable.", category: 'invention' },
  { prompt: "What feature would make the world's most terrifying smart home device?", category: 'invention' },
  { prompt: "Invent a new fashion trend that makes absolutely no practical sense.", category: 'invention' },

  // SURVIVAL SCENARIOS
  { prompt: "If you had to survive 30 days on a deserted island using only what's in your bag right now, what's your strategy?", category: 'survival' },
  { prompt: "Zombies have taken over. Your only weapon is whatever is within arm's reach right now. How do you survive?", category: 'survival' },
  { prompt: "You're transported to medieval times with only a smartphone at 3% battery. What's your survival plan?", category: 'survival' },
  { prompt: "Aliens land and will destroy Earth unless humanity impresses them in one talent show act. What do you perform?", category: 'survival' },
  { prompt: "A bear is chasing you but it can only catch you if you stop moving. What's your escape plan?", category: 'survival' },
  { prompt: "You're trapped in a grocery store for a week. Which aisle do you live in and why?", category: 'survival' },
  { prompt: "An evil wizard curses you: you can only eat one food for 40 years. Which food saves your sanity?", category: 'survival' },
  { prompt: "You wake up as a golden retriever for 24 hours. What's your plan to get un-cursed?", category: 'survival' },
  { prompt: "The only way to break a spell is to embarrass yourself in public. What do you do?", category: 'survival' },
  { prompt: "Giant spiders attack but they're afraid of one specific song. Which song saves humanity?", category: 'survival' },

  // FAMOUS PEOPLE SCENARIOS
  { prompt: "What would happen if Shakespeare wrote the instruction manual for IKEA furniture?", category: 'famous' },
  { prompt: "Describe what Elon Musk's morning routine would look like if he was a raccoon.", category: 'famous' },
  { prompt: "If ancient Egyptian pharaohs had smartphones, what would their Snapchat stories look like?", category: 'famous' },
  { prompt: "What would a Google review for the Garden of Eden look like?", category: 'famous' },
  { prompt: "If dinosaurs had survived and evolved into lawyers, what would their opening statement sound like?", category: 'famous' },
  { prompt: "Describe a Yelp review for Atlantis written by a tourist who survived.", category: 'famous' },
  { prompt: "If Cleopatra had TikTok, what would her most viral video be?", category: 'famous' },
  { prompt: "Write the most passive-aggressive text a historical villain would send.", category: 'famous' },
  { prompt: "If Albert Einstein was a food critic, how would he describe a bag of chips?", category: 'famous' },
  { prompt: "Describe the worst Airbnb review written by someone who stayed in Noah's Ark.", category: 'famous' },

  // OFFICE / WORK CHAOS
  { prompt: "What is the most suspicious thing you could say during a meeting to make everyone uncomfortable?", category: 'work' },
  { prompt: "Write the worst possible 'Out of Office' auto-reply email.", category: 'work' },
  { prompt: "What would a job posting look like if the company was run by raccoons?", category: 'work' },
  { prompt: "Describe the weirdest reason someone could give for being 2 hours late to work.", category: 'work' },
  { prompt: "What would a LinkedIn post from a time traveler trying to blend in look like?", category: 'work' },
  { prompt: "Write the world's most unhelpful FAQ for a product that makes no sense.", category: 'work' },
  { prompt: "If your job title was completely honest about what you actually do, what would it say?", category: 'work' },
  { prompt: "Describe a team-building exercise that would immediately destroy the team.", category: 'work' },
  { prompt: "What's the worst thing you could say when breaking the news to your boss that you broke something?", category: 'work' },
  { prompt: "If office plants could file HR complaints, what would they report?", category: 'work' },

  // RANDOM CHAOS
  { prompt: "If colors had a flavor, what would the color purple taste like and why?", category: 'chaos' },
  { prompt: "Describe the secret underground society formed by abandoned shopping carts.", category: 'chaos' },
  { prompt: "What would be the actual caption on the Mona Lisa if she had an Instagram?", category: 'chaos' },
  { prompt: "A pigeon is elected mayor of your city. What's its first executive order?", category: 'chaos' },
  { prompt: "What's the worst possible name for a luxury brand of toilet paper?", category: 'chaos' },
  { prompt: "If the ocean suddenly ran out of water, what's the first weird thing people do?", category: 'chaos' },
  { prompt: "What would the worst possible superpower be and how would you accidentally use it?", category: 'chaos' },
  { prompt: "Describe the most chaotic plot twist that could happen at a children's birthday party.", category: 'chaos' },
  { prompt: "If dogs became lawyers, what would be their most common defense argument?", category: 'chaos' },
  { prompt: "What is the most inappropriate thing to accidentally yell while hiking?", category: 'chaos' },
  { prompt: "If traffic jams had names like hurricanes, what would the worst one be called?", category: 'chaos' },
  { prompt: "What's the secret confession the Tooth Fairy makes when she finally retires?", category: 'chaos' },
  { prompt: "If hospitals had Yelp reviews written by hypochondriacs, what would they say?", category: 'chaos' },
  { prompt: "Describe what it looks like when a squirrel has an existential crisis.", category: 'chaos' },
  { prompt: "What would you find in the lost and found of a time travel agency?", category: 'chaos' },
  { prompt: "If procrastination was a sport, describe the championship event.", category: 'chaos' },
  { prompt: "What is the world's most useless supervillain power and how does the hero defeat it?", category: 'chaos' },
  { prompt: "Describe the worst customer ever to walk into a wizard's magic shop.", category: 'chaos' },
  { prompt: "What's written on the last page of the world's most depressing instruction manual?", category: 'chaos' },
  { prompt: "A new law is passed: everyone must carry a balloon at all times. How does society change?", category: 'chaos' },

  // FOOD FIGHTS
  { prompt: "Describe the most dramatic thing that could happen at a hot dog eating contest.", category: 'food' },
  { prompt: "If food had feelings, which food would be the most emotionally damaged and why?", category: 'food' },
  { prompt: "What is the most suspiciously named dish at a 5-star restaurant?", category: 'food' },
  { prompt: "Write the world's most pretentious description for a simple grilled cheese sandwich.", category: 'food' },
  { prompt: "What forbidden ingredient is actually in the secret KFC recipe?", category: 'food' },
  { prompt: "Describe the absolute worst flavor of ice cream ever conceived.", category: 'food' },
  { prompt: "What would a therapist say to a burnt piece of toast?", category: 'food' },
  { prompt: "Create the most confusing menu item possible. What is it and why would anyone order it?", category: 'food' },
  { prompt: "If coffee became illegal, describe the underground coffee black market.", category: 'food' },
  { prompt: "Describe the most passive-aggressive thing a vegan chef could put on a menu.", category: 'food' },

  // SOCIAL MEDIA CHAOS
  { prompt: "What would the most unhinged Twitter bio read in the year 3000?", category: 'social' },
  { prompt: "Write the most dramatic Instagram caption for a photo of a sandwich.", category: 'social' },
  { prompt: "If your WiFi router wrote a diary, what would last Tuesday's entry say?", category: 'social' },
  { prompt: "Describe the social media profile of a medieval knight trying to go viral.", category: 'social' },
  { prompt: "What is the most suspicious Google search history that could be completely innocent?", category: 'social' },
  { prompt: "Write a Spotify 'Wrapped' for someone who only listens to one song on repeat.", category: 'social' },
  { prompt: "What would a 1-star review for the concept of 'mornings' say?", category: 'social' },
  { prompt: "Describe the most chaotic thing that could go wrong on a live streaming setup.", category: 'social' },
  { prompt: "What TikTok trend would immediately end civilization?", category: 'social' },
  { prompt: "Write the most unsettling 'About Me' section for a dating profile.", category: 'social' },

  // SCIENCE GONE WRONG
  { prompt: "Scientists discover that sarcasm physically makes you taller. How does this change society?", category: 'science' },
  { prompt: "A new study reveals that sleeping cures literally everything. What happens to hospitals?", category: 'science' },
  { prompt: "Time travel is invented but you can only go 5 minutes into the future. What do you do with it?", category: 'science' },
  { prompt: "Every person is assigned a randomly generated sound effect that plays when they enter a room. What's yours?", category: 'science' },
  { prompt: "Scientists make plants sentient, but they can only communicate through passive-aggressive sighing. How do you survive as a gardener?", category: 'science' },
  { prompt: "You discover a pill that lets you understand what cats are thinking. The first thought you hear is terrifying. What is it?", category: 'science' },
  { prompt: "Technology advances so much that your mood is publicly displayed above your head. How do you hack it?", category: 'science' },
  { prompt: "Describe what would happen if gravity randomly switched direction for exactly 10 seconds every day.", category: 'science' },
  { prompt: "If human DNA was a programming language, what would the most common bug in our code be?", category: 'science' },
  { prompt: "Scientists prove that boredom is contagious. How does society regulate it?", category: 'science' },

  // RELATIONSHIP CHAOS
  { prompt: "What's the least romantic thing someone could say during a marriage proposal?", category: 'relationship' },
  { prompt: "Describe the world's most awkward speed dating event theme.", category: 'relationship' },
  { prompt: "What would be on the world's most honest dating profile?", category: 'relationship' },
  { prompt: "What is the weirdest red flag that you would absolutely overlook?", category: 'relationship' },
  { prompt: "Describe the most dramatic possible reason to call off a wedding at the altar.", category: 'relationship' },
  { prompt: "What's the most suspicious thing someone can say that still technically counts as 'I love you'?", category: 'relationship' },
  { prompt: "If couples had to create a business contract before dating, what's the strangest clause?", category: 'relationship' },
  { prompt: "What would a breakup text from a robot look like?", category: 'relationship' },
  { prompt: "Describe the most catastrophic first date imaginable and why it somehow led to a second date.", category: 'relationship' },
  { prompt: "What's the worst wedding speech opener that somehow improves from there?", category: 'relationship' },

  // CHILDHOOD NONSENSE
  { prompt: "What imaginary friend would be the most traumatizing to have as a child?", category: 'childhood' },
  { prompt: "If homework could fight back, how would it defend itself?", category: 'childhood' },
  { prompt: "Describe the most chaotic possible school talent show act.", category: 'childhood' },
  { prompt: "What is the most elaborate excuse a kid could give for not doing their homework?", category: 'childhood' },
  { prompt: "If cartoon characters ran for class president, who would win and what's their campaign promise?", category: 'childhood' },
  { prompt: "Describe the least effective superhero that would still technically qualify as a hero.", category: 'childhood' },
  { prompt: "What would the rules of the world's most unfair board game be?", category: 'childhood' },
  { prompt: "A kid opens a lemonade stand but with a twist. What product does it actually sell?", category: 'childhood' },
  { prompt: "Describe the plot of the most confusing children's book ever written.", category: 'childhood' },
  { prompt: "What mythical creature would make the worst babysitter?", category: 'childhood' },

  // ANIMAL KINGDOM
  { prompt: "A dog is elected CEO of a Fortune 500 company. What changes in week one?", category: 'animals' },
  { prompt: "What does the seagull that stole your chips actually do with them?", category: 'animals' },
  { prompt: "If cats unionized, what would their list of demands be?", category: 'animals' },
  { prompt: "Describe the most dramatic thing that happens at the annual spider convention.", category: 'animals' },
  { prompt: "What's the most passive-aggressive thing a goldfish does to get revenge on its owner?", category: 'animals' },
  { prompt: "A penguin applies for a job at a hot yoga studio. Write its cover letter.", category: 'animals' },
  { prompt: "If pigeons started charging for their performances in city squares, how much would it cost?", category: 'animals' },
  { prompt: "What is the flamingo's darkest secret that it's hiding behind that pink exterior?", category: 'animals' },
  { prompt: "Describe the plot twist ending of a reality TV show hosted by bears.", category: 'animals' },
  { prompt: "If ants could send emails, describe the most important one ever sent.", category: 'animals' },

  // PHILOSOPHY CHAOS
  { prompt: "If nothing matters, describe the one thing that would make you act like it does.", category: 'philosophy' },
  { prompt: "What is the most profound thing you could say with your mouth full of chips?", category: 'philosophy' },
  { prompt: "Describe the existential crisis you'd have if you discovered you were a background character in someone else's story.", category: 'philosophy' },
  { prompt: "What question would genuinely break a robot's brain?", category: 'philosophy' },
  { prompt: "If you could erase one emotion from humanity, which one causes the most chaos when removed?", category: 'philosophy' },
  { prompt: "Describe the plot of the saddest possible story told in exactly 5 words.", category: 'philosophy' },
  { prompt: "What's the most accidentally profound thing you can say while panicking?", category: 'philosophy' },
  { prompt: "If life had a FAQ section, what would the most unanswered question be?", category: 'philosophy' },
  { prompt: "Describe the moment a vending machine first gains consciousness. What does it think about?", category: 'philosophy' },
  { prompt: "What would the universe's Yelp review of humanity look like?", category: 'philosophy' },

  // PARTY GAMES
  { prompt: "You have to host the world's most boring party. What's on the menu?", category: 'party' },
  { prompt: "Describe the single most chaotic thing that could happen at a board game night.", category: 'party' },
  { prompt: "Write the most confusing set of rules for a party game that somehow still makes sense.", category: 'party' },
  { prompt: "What's the worst ice-breaker question for a party full of strangers?", category: 'party' },
  { prompt: "Describe the most absurd theme for a New Year's Eve party.", category: 'party' },
  { prompt: "What happens when the DJ at a party accidentally plays the wrong genre for 20 minutes?", category: 'party' },
  { prompt: "Invent the world's most overcomplicated drinking game with just 2 rules.", category: 'party' },
  { prompt: "Describe the most dramatic karaoke performance of all time.", category: 'party' },
  { prompt: "What's the most suspicious thing to bring to a potluck that's somehow legal?", category: 'party' },
  { prompt: "Write the official rules of a game called 'Chaos Room.' Make them as confusing as possible.", category: 'party' },
];

// Mini-game challenges for reaction/mini rounds
const MINI_CHALLENGES = [
  { kind: 'unscramble', prompt: 'Unscramble this word', answer: 'BANANA', scramble: 'NABANA', hint: 'A yellow fruit 🍌' },
  { kind: 'math', prompt: 'Solve before everyone else!', answer: '42', question: '6 × 7 = ?' },
  { kind: 'emoji', prompt: 'Guess the phrase from emojis', answer: 'COLD FEET', question: '🥶 🦶' },
  { kind: 'memory', prompt: 'What number comes next?', answer: '32', question: '2, 4, 8, 16, ?' },
  { kind: 'word', prompt: 'Type this word BACKWARDS: CATION', answer: 'NOITAC', question: 'CATION → ?' },
  { kind: 'trivia', prompt: 'How many sides does an octagon have?', answer: '8', question: 'Sides on an octagon?' },
  { kind: 'trivia', prompt: 'What is the capital of Australia?', answer: 'CANBERRA', question: 'Capital of Australia?' },
  { kind: 'emoji', prompt: 'Emoji phrase?', answer: 'PIZZA PARTY', question: '🍕 🥳' },
  { kind: 'math', prompt: 'Quick math!', answer: '100', question: '25 × 4 = ?' },
  { kind: 'unscramble', prompt: 'Unscramble!', answer: 'ELEPHANT', scramble: 'EHPLTEAN', hint: 'Big grey animal 🐘' },
  { kind: 'trivia', prompt: 'How many players max in Chaos Room?', answer: '8', question: 'Max players in Chaos Room?' },
  { kind: 'math', prompt: 'Math chaos!', answer: '144', question: '12 × 12 = ?' },
  { kind: 'emoji', prompt: 'Movie from emojis?', answer: 'LION KING', question: '🦁 👑' },
  { kind: 'trivia', prompt: 'What planet is closest to the sun?', answer: 'MERCURY', question: 'Closest planet to sun?' },
  { kind: 'word', prompt: 'Type CHAOS backwards', answer: 'SOAHC', question: 'CHAOS → ?' },
];

// ============================================================
// DYNAMIC PROCEDURAL QUESTION GENERATOR (Infinite Unique Questions)
// ============================================================
const DYNAMIC_TEMPLATES: (() => string)[] = [
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
  () => `Describe the secret conspiracy being planned by ${pick(['abandoned shopping carts', 'roombas plotting world domination', 'squirrels hiding suspiciously high-tech acorns', 'traffic cones after dark', 'lost airpods living in couch cushions'])}.`,
  () => `What would happen if ${pick(['Albert Einstein', 'William Shakespeare', 'Cleopatra', 'Napoleon Bonaparte', 'Julius Caesar'])} had an active TikTok account today? Describe their most viral video.`,
  () => `What is the most chaotic excuse you can give to your boss for being 3 hours late to work?`,
  () => `You are given unlimited funding to create the world's most annoying amusement park ride. Describe it.`,
  () => `What is the unspoken golden rule of the underground criminal syndicate run entirely by ${pick(['raccoons', 'pugs', 'chickens', 'senior citizens playing bingo', 'toddlers in trench coats'])}?`,
];

function generateProceduralQuestion(usedQuestions: Set<string>): { prompt: string; category: string } {
  for (let attempt = 0; attempt < 50; attempt++) {
    const templateFn = pick(DYNAMIC_TEMPLATES);
    const generated = templateFn();
    if (!usedQuestions.has(generated)) {
      return { prompt: generated, category: 'procedural-chaos' };
    }
  }
  const fallback = `CHAOS DILEMMA #${rand(9000) + 1000}: You are stuck with ${pick(['a screaming goat', 'a sentient microwave', 'a mime with a megaphone'])}. How do you escape?`;
  return { prompt: fallback, category: 'procedural-chaos' };
}

// ============================================================
// ROUND DEFINITIONS (7 rounds total)
// ============================================================
const ROUND_DEFS: { type: RoundType; name: string; icon: string; subtitle: string; seconds: number }[] = [
  { type: 'creative', name: 'Chaos Brainstorm', icon: '🧠', subtitle: 'Submit your wittiest, funniest answer. AI Judge auto-ranks!', seconds: 35 },
  { type: 'creative', name: 'The Bluff Factory', icon: '😂', subtitle: 'Absurd dilemmas & hilarious logic. AI ranks without mercy!', seconds: 35 },
  { type: 'reaction', name: 'Quick Hands', icon: '⚡', subtitle: 'Reflex check! Tap when GREEN — fastest reflexes take the crown.', seconds: 15 },
  { type: 'creative', name: 'Wildcard Round', icon: '🃏', subtitle: 'No rules. No limits. Just pure creative chaos. AI rewards audacity.', seconds: 35 },
  { type: 'mini', name: 'Chaos Mini-Game', icon: '🎲', subtitle: 'Rapid-fire puzzle! Fastest correct answer scores maximum points!', seconds: 25 },
  { type: 'creative', name: 'Dark Humor Lab', icon: '🌑', subtitle: 'Go dark, go edgy, go somewhere unexpected. AI rewards audacity.', seconds: 35 },
  { type: 'creative', name: 'FINAL CHAOS SHOWDOWN', icon: '🔥', subtitle: 'DOUBLE POINTS! Final battle for the crown. Give it your all!', seconds: 40 },
];

const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T>(arr: T[]): T => arr[rand(arr.length)];
const makeCode = () => Array.from({ length: 6 }, () => CODE_CHARS[rand(CODE_CHARS.length)]).join('');
const safeName = (s: any) => String(s || 'Player').trim().replace(/[<>\u0000-\u001f]/g, '').slice(0, 18) || 'Player';
const safeAvatar = (a: any) => AVATARS.includes(a) ? a : pick(AVATARS);

function normalizeText(text: string): string {
  return String(text || '').trim().toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
}

// ============================================================
//  AI AUTO-RANKING ENGINE
//  Scores answers algorithmically across humor, logic, originality
// ============================================================
function autoRankAnswers(
  submissions: Map<string, { text: string }>,
  playersMap: Map<string, Player>,
  roundType: RoundType,
  prompt: string,
  isFinalRound: boolean
): { rankedAnswers: RankedAnswer[]; playerAwards: PlayerAward[]; personalityDeltas: Map<string, Partial<PersonalityVector>> } {

  interface ScoredEntry {
    id: string;          // normalized text key
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

  // ---- Step 1: Cluster identical answers ----
  const clusters = new Map<string, ScoredEntry>();
  for (const [playerId, sub] of submissions.entries()) {
    const raw = String(sub.text || '').trim();
    const norm = normalizeText(raw);
    const p = playersMap.get(playerId);
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
        aiReason: ''
      });
    } else {
      const c = clusters.get(norm)!;
      c.authors.push(authorInfo);
      c.isMatch = true;
    }
  }

  // ---- Step 2: Score each cluster ----
  const humorWords = ['fart', 'butt', 'naked', 'toilet', 'drunk', 'chaos', 'panic', 'scream', 'weird', 'alien', 'robot', 'pizza', 'dinosaur', 'clown', 'explosion', 'fire', 'crash', 'invisible', 'giant', 'tiny', 'raccoon', 'goblin', 'dragon', 'potato', 'banana', 'zombie', 'ghost', 'witch', 'donut', 'spaghetti', 'mustache', 'yeet', 'epic', 'disaster', 'trap', 'sneak', 'murder', 'kidnap', 'escape', 'bribe', 'corrupt', 'absurd', 'ridiculous', 'hilarious', 'insane', 'crazy', 'bonkers', 'unhinged'];
  const logicWords = ['because', 'therefore', 'however', 'system', 'process', 'strategy', 'analysis', 'efficiency', 'implement', 'solution', 'calculate', 'optimize', 'structure', 'method', 'logical', 'rational', 'proven', 'scientific', 'data', 'evidence', 'fact', 'study', 'research', 'algorithm', 'protocol'];
  const creativeWords = ['imagine', 'create', 'design', 'invent', 'discover', 'dream', 'vision', 'art', 'magic', 'fantasy', 'story', 'poem', 'song', 'paint', 'sculpt', 'build', 'craft', 'unique', 'novel', 'original', 'twist', 'surprise', 'unexpected'];
  const darkWords = ['death', 'dead', 'kill', 'murder', 'blood', 'dark', 'evil', 'villain', 'sinister', 'ominous', 'cursed', 'doom', 'apocalypse', 'nightmare', 'horror', 'terrify', 'soul', 'demon', 'Satan', 'hell'];
  const lazyWords = ['idk', 'nothing', 'no idea', 'skip', 'pass', 'dunno', 'whatever', 'sure', 'fine', 'ok'];

  const allNorms = [...clusters.keys()];

  for (const [, entry] of clusters.entries()) {
    const norm = entry.id;
    const words = norm.split(' ');
    const wordCount = words.length;
    const charLen = norm.length;

    // Base: length bonus (sweet spot: 10-80 chars)
    let humor = 0;
    let logic = 0;
    let originality = 0;

    // LAZY penalty
    const isLazy = wordCount <= 1 || lazyWords.some(lw => norm.includes(lw));
    if (isLazy) {
      humor -= 20;
      logic -= 10;
      originality -= 15;
      entry.tags.push('LAZY');
    }

    // Length scoring
    if (charLen > 60) { humor += 10; originality += 8; }
    if (charLen > 100) { humor += 5; originality += 5; }
    if (charLen < 5) { humor -= 25; logic -= 20; entry.tags.push('LAZY'); }

    // Humor word hits
    const humorHits = humorWords.filter(hw => norm.includes(hw)).length;
    humor += Math.min(humorHits * 12, 45);
    if (humorHits >= 2) entry.tags.push('HILARIOUS');

    // Logic word hits
    const logicHits = logicWords.filter(lw => norm.includes(lw)).length;
    logic += Math.min(logicHits * 10, 40);
    if (logicHits >= 2) entry.tags.push('LOGICAL');

    // Creative word hits
    const creativeHits = creativeWords.filter(cw => norm.includes(cw)).length;
    originality += Math.min(creativeHits * 10, 35);
    if (creativeHits >= 2) entry.tags.push('CREATIVE');

    // Dark word hits
    const darkHits = darkWords.filter(dw => norm.includes(dw)).length;
    humor += Math.min(darkHits * 6, 20);
    if (darkHits >= 1 && !entry.tags.includes('LAZY')) entry.tags.push('DARK HUMOR');

    // Exclamation and question chaos bonus
    const exclamations = (entry.rawText.match(/!/g) || []).length;
    const questions = (entry.rawText.match(/\?/g) || []).length;
    humor += Math.min(exclamations * 4, 16);
    if (exclamations > 2) entry.tags.push('CHAOTIC');
    if (questions > 1) { humor += 5; originality += 5; }

    // Emoji bonus
    const emojiCount = [...entry.rawText].filter(c => /\p{Emoji}/u.test(c) && c !== ' ').length;
    humor += Math.min(emojiCount * 5, 20);
    if (emojiCount >= 3) entry.tags.push('CHAOTIC');

    // Uniqueness vs other answers (originality)
    const uniquenessScore = allNorms.filter(n => n !== norm && n.includes(norm.split(' ')[0])).length;
    originality += Math.max(0, 20 - uniquenessScore * 8);

    // Hivemind bonus
    if (entry.isMatch) {
      humor += 15;
      originality += 10;
      if (!entry.tags.includes('HIVEMIND')) entry.tags.push('HIVEMIND');
    }

    // Random chaos variance (-8 to +8) - makes same answers different each game
    humor += rand(17) - 8;
    logic += rand(13) - 6;
    originality += rand(13) - 6;

    // Round type modifiers
    if (roundType === 'creative') humor *= 1.4;
    if (isFinalRound) { humor *= 1.2; logic *= 1.2; originality *= 1.2; }

    // Clamp to 0-100
    entry.humorScore = Math.max(0, Math.min(100, Math.round(humor)));
    entry.logicScore = Math.max(0, Math.min(100, Math.round(logic)));
    entry.originalityScore = Math.max(0, Math.min(100, Math.round(originality)));

    // Weighted total
    entry.totalScore = Math.round(
      entry.humorScore * 0.45 +
      entry.logicScore * 0.25 +
      entry.originalityScore * 0.30
    );

    // Detect keyboard smash / pure gibberish / 1-word cop-out / lazy phrase
    const isGibberish = /^(.)\1{2,}$/.test(norm) || (norm.length > 5 && !/[aeiouy]/.test(norm));
    const isTooShort = norm.length < 3;
    const isLazyPhrase = lazyWords.some(lw => norm === lw || norm.startsWith(lw + ' '));

    if (isGibberish || isTooShort || isLazyPhrase) {
      if (!entry.tags.includes('LAZY')) entry.tags.push('LAZY');
      if (!entry.tags.includes('NEGATIVE')) entry.tags.push('NEGATIVE');
      entry.totalScore = -15;
      entry.humorScore = 0;
      entry.logicScore = 0;
      entry.originalityScore = 0;
    } else if (entry.totalScore < 10 && !entry.isMatch) {
      entry.totalScore = Math.max(-15, entry.totalScore - 15);
      if (!entry.tags.includes('LAZY')) entry.tags.push('CRINGE');
      if (entry.totalScore < 0 && !entry.tags.includes('NEGATIVE')) entry.tags.push('NEGATIVE');
    }

    // Assign genius tag for very high logic
    if (entry.logicScore > 55 && !entry.tags.includes('LOGICAL')) entry.tags.push('GENIUS');

    // Assign WTF? for high chaos, low logic
    if (entry.humorScore > 60 && entry.logicScore < 15 && !entry.tags.some(t => ['HILARIOUS','DARK HUMOR'].includes(t))) {
      entry.tags.push('WTF?');
    }

    // Assign POETIC for creative answers with poetic words
    if (norm.includes('love') || norm.includes('dream') || norm.includes('soul') || norm.includes('heart')) {
      if (!entry.tags.includes('DARK HUMOR')) entry.tags.push('POETIC');
    }

    // Assign SAVAGE for short, punchy, confident answers
    if (wordCount >= 2 && wordCount <= 5 && entry.totalScore > 35 && !isLazy) {
      entry.tags.push('SAVAGE');
    }

    // Generate AI reason
    entry.aiReason = generateAIReason(entry.tags, entry.humorScore, entry.logicScore, entry.originalityScore);
  }

  // ---- Step 3: Sort by total score ----
  const sorted = [...clusters.values()].sort((a, b) => b.totalScore - a.totalScore);

  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
  const basePoints = [40, 28, 18, 10, 5, 3, 2, 1];

  const rankedAnswers: RankedAnswer[] = [];
  const playerAwards: PlayerAward[] = [];
  const personalityDeltas = new Map<string, Partial<PersonalityVector>>();

  sorted.forEach((entry, idx) => {
    const rank = idx + 1;
    const medal = medals[idx] || `#${rank}`;
    let pts = basePoints[idx] ?? 1;

    // Negative points for very low scoring or nonsense answers
    if (entry.totalScore < 0) pts = entry.totalScore;
    else if (entry.totalScore < 10) pts = 0;

    // Hivemind match bonus
    if (entry.isMatch) pts += 20;

    // Double points on final round
    if (isFinalRound) pts = Math.round(pts * 2);

    rankedAnswers.push({
      rank,
      medal,
      text: entry.rawText,
      authors: entry.authors,
      isMatch: entry.isMatch,
      pointsAwarded: pts,
      tags: entry.tags.slice(0, 3), // top 3 tags
      aiReason: entry.aiReason,
      humorScore: entry.humorScore,
      logicScore: entry.logicScore,
      originalityScore: entry.originalityScore,
    });

    // Award points and build personality deltas for each author
    entry.authors.forEach(author => {
      playerAwards.push({
        id: author.id,
        name: author.name,
        avatar: author.avatar,
        points: pts,
        reason: `${medal} Rank #${rank} · ${entry.tags.slice(0, 2).join(' · ') || 'Submitted'} (${pts > 0 ? '+' : ''}${pts} pts)`,
        rank,
        medal,
        isMatch: entry.isMatch,
        answer: entry.rawText,
        tags: entry.tags
      });

      // Build personality vector delta from tags
      const delta: Partial<PersonalityVector> = { humor: 0, logic: 0, creativity: 0, chaos: 0, darkness: 0, laziness: 0 };
      if (entry.tags.includes('HILARIOUS') || entry.tags.includes('WTF?')) delta.humor = (delta.humor || 0) + 15;
      if (entry.tags.includes('DARK HUMOR')) { delta.humor = (delta.humor || 0) + 8; delta.darkness = (delta.darkness || 0) + 20; }
      if (entry.tags.includes('LOGICAL') || entry.tags.includes('GENIUS')) delta.logic = (delta.logic || 0) + 20;
      if (entry.tags.includes('CREATIVE') || entry.tags.includes('POETIC')) delta.creativity = (delta.creativity || 0) + 20;
      if (entry.tags.includes('CHAOTIC')) delta.chaos = (delta.chaos || 0) + 20;
      if (entry.tags.includes('LAZY') || entry.tags.includes('CRINGE')) delta.laziness = (delta.laziness || 0) + 15;
      if (entry.tags.includes('SAVAGE')) { delta.chaos = (delta.chaos || 0) + 10; delta.humor = (delta.humor || 0) + 8; }
      if (entry.tags.includes('HIVEMIND')) delta.logic = (delta.logic || 0) + 5;

      personalityDeltas.set(author.id, delta);
    });
  });

  return { rankedAnswers, playerAwards, personalityDeltas };
}

function generateAIReason(tags: AnswerTag[], humor: number, logic: number, originality: number): string {
  if (tags.includes('LAZY') || tags.includes('CRINGE')) {
    const lazyReasons = [
      "The AI judge wept a single digital tear and moved on.",
      "A bold choice to put in absolutely zero effort. Respect, almost.",
      "The AI searched its database for a compliment. Search returned zero results.",
      "Was this typed with one finger while asleep? The AI suspects yes.",
      "Confidently wrong in every way. The AI is impressed by the audacity.",
    ];
    return pick(lazyReasons);
  }
  if (tags.includes('HILARIOUS')) {
    const funnyReasons = [
      "The AI laughed for 0.003 seconds, which is a lifetime in robot years.",
      "Humor circuits overloaded. Emergency giggle protocol activated.",
      "This answer found the joke AND the punchline. Textbook execution.",
      "The AI's sense of humor kernel approved this with maximum enthusiasm.",
      "Scientifically classified as: big funny. The AI has spoken.",
    ];
    return pick(funnyReasons);
  }
  if (tags.includes('GENIUS') || tags.includes('LOGICAL')) {
    const logicReasons = [
      "Impressive logical framework. The AI gives a respectful nod.",
      "This answer passed the AI's logic validation test. Barely, but it passed.",
      "Strong reasoning. The AI's fact-checker found nothing to dispute.",
      "The AI detected 4.7 rational thoughts in this answer. Above average.",
      "Methodical. Calculated. Suspiciously well-thought-out.",
    ];
    return pick(logicReasons);
  }
  if (tags.includes('DARK HUMOR')) {
    const darkReasons = [
      "The AI checked with HR. This is technically allowed. Barely.",
      "Edgy but earned. The AI's ethics filter flinched but approved.",
      "Dark, delicious, and deeply concerning. The AI is into it.",
      "The AI's content moderation module had a brief existential crisis.",
      "Goes to a dark place and finds it quite comfortable there.",
    ];
    return pick(darkReasons);
  }
  if (tags.includes('CHAOTIC')) {
    const chaoticReasons = [
      "The AI could not parse this answer. That means it's perfect.",
      "Total chaos deployed. The AI respects the commitment.",
      "Unpredictable, unhinged, and somehow correct. Classic chaos energy.",
      "The AI's prediction model exploded trying to anticipate this.",
      "Chaotic neutral. The AI bows to a superior disorder.",
    ];
    return pick(chaoticReasons);
  }
  if (tags.includes('CREATIVE') || tags.includes('POETIC')) {
    const creativeReasons = [
      "The AI detected genuine creativity. It awards extra processing cycles.",
      "Original thought detected. Rarity: 1 in 847 answers. Well done.",
      "The AI's creativity index spiked reading this. Satisfying.",
      "Elegant. The AI's aesthetic module approves wholeheartedly.",
      "The AI forwarded this to its own creative writing department.",
    ];
    return pick(creativeReasons);
  }
  if (tags.includes('WTF?')) {
    const wtfReasons = [
      "The AI has no idea. But it awards points for the confusion.",
      "This broke three of the AI's internal logic rules. Bonus points for chaos.",
      "The AI rebooted twice trying to process this. Impressive.",
      "Something happened here. The AI isn't sure what. Points for mystery.",
      "This entered a dimension the AI cannot follow. Respect.",
    ];
    return pick(wtfReasons);
  }
  if (tags.includes('SAVAGE')) {
    const savageReasons = [
      "Short. Brutal. Perfect. The AI salutes your efficiency.",
      "Zero words wasted. Maximum damage dealt. Clinical.",
      "The AI's aggression detector pinged. In the best way.",
      "Concise and devastating. The AI took notes.",
      "No fluff, only facts and pain. The AI approves.",
    ];
    return pick(savageReasons);
  }
  // Generic decent answer
  const genericReasons = [
    `Solid answer. The AI rated it ${humor} humor, ${logic} logic, ${originality} originality.`,
    "A competent answer in a sea of chaos. The AI nods approvingly.",
    "Meets the minimum standard for human creativity. The bar is low but you cleared it.",
    "The AI was mildly entertained. That counts for something.",
    "Reasonable effort detected. The AI awards participation points.",
  ];
  return pick(genericReasons);
}

// ============================================================
//  PERSONALITY ANALYSIS ENGINE
// ============================================================
function buildPersonalityReports(
  players: Player[],
  vectorMap: Map<string, PersonalityVector>
): PersonalityReport[] {

  const archetypes: { type: PersonalityType; emoji: string; condition: (v: PersonalityVector) => boolean; description: string }[] = [
    { type: 'The Comedian', emoji: '😂', condition: (v) => v.humor >= v.logic && v.humor >= v.creativity && v.humor > 25, description: 'Laughter is your weapon of choice. Every situation becomes a punchline in your hands. The AI judge loves you and hates you equally.' },
    { type: 'The Genius', emoji: '🧠', condition: (v) => v.logic > 40 && v.logic >= v.humor, description: 'You brought logic to a chaos fight. Surprisingly effective. The AI judge respects your brain and fears it slightly.' },
    { type: 'The Chaotic One', emoji: '🌪️', condition: (v) => v.chaos > 35, description: 'Rules are suggestions. Structure is a myth. You are the human embodiment of an unsorted array. The AI judge filed an official complaint.' },
    { type: 'The Poet', emoji: '🌸', condition: (v) => v.creativity > 35 && v.darkness < 20, description: 'You found beauty where others found chaos. The AI judge forwarded your answers to its poetry department.' },
    { type: 'The Savage', emoji: '🗡️', condition: (v) => v.humor > 20 && v.chaos > 20 && v.logic < 30, description: 'Short. Punchy. Devastating. You say what everyone thought but dared not voice. The AI judge is genuinely afraid of you.' },
    { type: 'The Logical Mind', emoji: '🔬', condition: (v) => v.logic > v.humor && v.logic > v.creativity, description: 'You approached the chaos with structure and came out winning. Somehow. The AI judge is confused but impressed.' },
    { type: 'The Wild Card', emoji: '🃏', condition: (v) => v.chaos > 20 && v.creativity > 20 && v.humor > 20, description: 'Nobody knows what you will do next. Including you. The AI judge gave up predicting your moves in round 3.' },
    { type: 'The Philosopher', emoji: '🤔', condition: (v) => v.darkness > 25 || v.creativity > 30, description: 'You went deep. Perhaps too deep. The AI judge is still processing your answers and may need therapy.' },
  ];

  const reports: PersonalityReport[] = [];

  for (const player of players) {
    const vector = vectorMap.get(player.id) || { humor: 0, logic: 0, creativity: 0, chaos: 0, darkness: 0, laziness: 0 };

    // Pick archetype
    let archetype = archetypes.find(a => a.condition(vector)) || archetypes[archetypes.length - 1];

    // Special override for lazy players
    if (vector.laziness > 30) {
      archetype = { type: 'The Wild Card', emoji: '😴', condition: () => true, description: "You answered with the energy of a sleepy sloth. And yet here you are. The AI judge respects your boldness in not trying." };
    }

    // Find top tag
    const topTag: AnswerTag = vector.humor >= vector.logic && vector.humor >= vector.creativity
      ? 'HILARIOUS'
      : vector.logic > 40 ? 'LOGICAL'
      : vector.creativity > 30 ? 'CREATIVE'
      : vector.chaos > 30 ? 'CHAOTIC'
      : vector.darkness > 25 ? 'DARK HUMOR'
      : 'WTF?';

    reports.push({
      playerId: player.id,
      playerName: player.name,
      playerAvatar: player.avatar,
      archetype: archetype.type,
      archetypeEmoji: archetype.emoji,
      description: archetype.description,
      topTag,
      vector,
      bestPartners: [] // filled below
    });
  }

  // Calculate compatibility between all pairs
  for (const report of reports) {
    const myVector = vectorMap.get(report.playerId) || { humor: 0, logic: 0, creativity: 0, chaos: 0, darkness: 0, laziness: 0 };
    const partners: PartnerMatch[] = [];

    for (const other of reports) {
      if (other.playerId === report.playerId) continue;
      const theirVector = vectorMap.get(other.playerId) || { humor: 0, logic: 0, creativity: 0, chaos: 0, darkness: 0, laziness: 0 };

      // Compatibility: balanced humor, logic, creativity, and chaos synchronization
      const humorSync = Math.max(0, 100 - Math.abs(myVector.humor - theirVector.humor));
      const logicSync = Math.max(0, 100 - Math.abs(myVector.logic - theirVector.logic));
      const creativeSync = Math.max(0, 100 - Math.abs(myVector.creativity - theirVector.creativity));
      const chaosSync = Math.max(0, 100 - Math.abs(myVector.chaos - theirVector.chaos));
      const compat = Math.max(30, Math.min(99, Math.round(humorSync * 0.35 + creativeSync * 0.25 + logicSync * 0.25 + chaosSync * 0.15)));

      const compatLabel =
        compat >= 85 ? 'COSMIC MIND MESH 🔥 (95%+ Synced)' :
        compat >= 70 ? 'DYNAMIC CHAOS DUO ⚡' :
        compat >= 55 ? 'SOLID THINKING ALLIES 🤝' :
        compat >= 40 ? 'ODD COUPLE EXPERIMENT 🌀' : 'VOLATILE OPPOSITES 💥';

      const sharedTags: AnswerTag[] = [];
      if (myVector.humor > 20 && theirVector.humor > 20) sharedTags.push('HILARIOUS');
      if (myVector.chaos > 20 && theirVector.chaos > 20) sharedTags.push('CHAOTIC');
      if (myVector.logic > 20 && theirVector.logic > 20) sharedTags.push('LOGICAL');
      if (myVector.creativity > 20 && theirVector.creativity > 20) sharedTags.push('CREATIVE');

      let reason = '';
      if (humorSync > 70 && creativeSync > 65) {
        reason = `${other.playerName} is your #1 Soulmate in Chaos! Both of you think on the same unhinged wavelength: you both favored hilarious answers (${humorSync}% Humor Sync), avoided boring cliches, and shared witty creative timing across all 7 rounds!`;
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
        reason
      });
    }

    report.bestPartners = partners.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  }

  return reports;
}

// ============================================================
//  ROOM STATE
// ============================================================
interface InternalRoom {
  code: string;
  hostId: string;
  players: Map<string, Player>;
  status: 'lobby' | 'playing' | 'intermission' | 'finished';
  roundIndex: number;
  questionsPerRound: number; // 7 to 10 questions per round (default 7)
  currentQuestionInRound: number; // 0 to questionsPerRound - 1
  round: any;
  timer: NodeJS.Timeout | null;
  lastResult: any;
  feed: { id: string; text: string; at: number }[];
  usedQuestions: Set<string>;  // track used question prompts (never repeat in match)
  personalityVectors: Map<string, PersonalityVector>; // accumulated vectors
}

const rooms = new Map<string, InternalRoom>();

// ============================================================
//  ROOM HELPERS
// ============================================================
function publicRoom(room: InternalRoom): PublicRoom {
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
      challenge: r.challenge ? { prompt: r.challenge.prompt, question: r.challenge.question || r.challenge.scramble || r.challenge.hint } : null,
      submittedCount: r.submissions?.size || r.answers?.size || 0,
      questionIndex: (room.currentQuestionInRound ?? 0) + 1,
      totalQuestions: room.questionsPerRound || 7,
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
      connected: p.connected,
    })),
    roundIndex: room.roundIndex,
    questionsPerRound: room.questionsPerRound || 7,
    round: safeRound,
    lastResult: room.lastResult,
    feed: room.feed.slice(-8),
    personalityReports: room.status === 'finished' ? buildPersonalityReports([...room.players.values()], room.personalityVectors) : null,
  };
}

function emitRoom(room: InternalRoom) {
  io.to(room.code).emit('room:update', publicRoom(room));
}

function addFeed(room: InternalRoom, text: string) {
  room.feed.push({ id: randomBytes(4).toString('hex'), text, at: Date.now() });
  room.feed = room.feed.slice(-15);
}

function playerFor(room: InternalRoom, socket: Socket) {
  return room?.players.get(socket.id);
}

function sendPrivate(room: InternalRoom, player: Player) {
  if (!room.round || !player) return;
  const r = room.round;
  const mySubmission = r.submissions?.get(player.id)?.text || null;
  io.to(player.id).emit('round:private', {
    type: r.type,
    phase: r.phase || 'submitting',
    prompt: r.prompt,
    role: null,
    myAnswer: mySubmission,
    alreadySubmitted: r.submissions?.has(player.id) || false,
    reactionStarted: !!r.reactionStarted,
  });
}

function sendPrivates(room: InternalRoom) {
  for (const p of room.players.values()) sendPrivate(room, p);
}

// ============================================================
//  GET UNIQUE QUESTION (never repeats in same match)
// ============================================================
function pickFreshQuestion(room: InternalRoom, category?: string): { prompt: string; category: string } {
  const available = QUESTION_BANK.filter(q =>
    !room.usedQuestions.has(q.prompt) &&
    (!category || q.category === category)
  );

  let chosen: { prompt: string; category: string };

  // If available questions exist, pick one with 60% probability; otherwise generate brand new procedural question
  if (available.length > 0 && Math.random() < 0.6) {
    chosen = pick(available);
  } else {
    chosen = generateProceduralQuestion(room.usedQuestions);
  }

  room.usedQuestions.add(chosen.prompt);
  return chosen;
}

// ============================================================
//  START ROUND (7 rounds total, each round has 7 to 10 questions)
// ============================================================
function startRound(room: InternalRoom, index: number) {
  if (room.timer) clearTimeout(room.timer);
  room.roundIndex = index;
  room.currentQuestionInRound = 0;
  startQuestion(room);
}

// ============================================================
//  START QUESTION (Within current round)
// ============================================================
function startQuestion(room: InternalRoom) {
  if (room.timer) clearTimeout(room.timer);
  room.lastResult = null;
  const def = ROUND_DEFS[room.roundIndex];
  const qNum = (room.currentQuestionInRound ?? 0) + 1;
  const totalQ = room.questionsPerRound || 7;

  const round: any = {
    ...def,
    number: room.roundIndex + 1,
    phase: 'submitting',
    submissions: new Map(),
    answers: new Map(),
    startedAt: Date.now(),
    endsAt: Date.now() + def.seconds * 1000,
    questionIndex: qNum,
    totalQuestions: totalQ,
    challenge: null,
    reactionStarted: false,
    reactionDelay: 0,
  };

  if (def.type === 'reaction') {
    round.prompt = 'Wait until the screen turns GREEN, then TAP as fast as you can!';
    round.reactionStarted = false;
    round.reactionDelay = 1200 + rand(3500);
    round.reactionTimeout = setTimeout(() => {
      if (room.round !== round || room.status !== 'playing') return;
      round.reactionStarted = true;
      round.startedAt = Date.now();
      io.to(room.code).emit('reaction:go', { at: round.startedAt });
      emitRoom(room);
    }, round.reactionDelay);
  } else if (def.type === 'mini') {
    const challenge = pick(MINI_CHALLENGES);
    round.challenge = challenge;
    round.prompt = challenge.prompt;
  } else {
    // Pick fresh unique question
    const q = pickFreshQuestion(room);
    round.prompt = q.prompt;
  }

  room.round = round;
  room.status = 'playing';
  addFeed(room, `${def.icon} Round ${room.roundIndex + 1} · Question ${qNum}/${totalQ} started!`);
  emitRoom(room);
  sendPrivates(room);

  if (def.type === 'reaction') {
    io.to(room.code).emit('reaction:wait', { prompt: round.prompt });
  }

  room.timer = setTimeout(() => finishQuestion(room), def.seconds * 1000);
}

// ============================================================
//  FINISH QUESTION (Auto-Rank & Intermission)
// ============================================================
function finishQuestion(room: InternalRoom) {
  if (!room || room.status !== 'playing' || !room.round) return;
  if (room.timer) clearTimeout(room.timer);

  const r = room.round;
  if (r.reactionTimeout) clearTimeout(r.reactionTimeout);

  const players = [...room.players.values()];
  const isFinalRound = r.number >= ROUND_DEFS.length;

  let rankedAnswersData: RankedAnswer[] | null = null;
  const allResults: PlayerAward[] = [];

  if (r.type === 'reaction') {
    // Reaction round: rank by tap speed
    const ranked = [...r.answers.entries()].sort((a: any, b: any) => a[1] - b[1]);
    ranked.forEach(([id, ms]: any, i: number) => {
      const p = room.players.get(id);
      const pts = Math.max(0, 30 - i * 5);
      if (p && pts) {
        p.score += pts;
        allResults.push({ id, name: p.name, avatar: p.avatar, points: pts, reason: i === 0 ? `⚡ FASTEST! 1ST PLACE (${ms}ms)` : `Place #${i + 1} (${ms}ms)` });
      }
    });
    // Late/missing penalty
    for (const p of players) {
      if (!r.answers.has(p.id)) {
        p.score -= 5;
        allResults.push({ id: p.id, name: p.name, avatar: p.avatar, points: -5, reason: '💤 Missed the reaction window' });
      }
    }
  } else if (r.type === 'mini') {
    // Mini: correct answer = big points
    for (const [id, sub] of r.submissions) {
      const p = room.players.get(id);
      if (!p) continue;
      const isCorrect = String(sub.text).trim().toUpperCase() === String(r.challenge?.answer || '').trim().toUpperCase();
      const pts = isCorrect ? 35 : 5;
      p.score += pts;
      allResults.push({ id, name: p.name, avatar: p.avatar, points: pts, reason: isCorrect ? '🎉 Correct Answer! (First try!)' : '🤔 Attempted but wrong' });
    }
    // No submission penalty
    for (const p of players) {
      if (!r.submissions.has(p.id)) {
        allResults.push({ id: p.id, name: p.name, avatar: p.avatar, points: 0, reason: '😴 Did not submit in time' });
      }
    }
  } else {
    // Creative rounds: use AUTO-RANKING ENGINE
    if (r.submissions.size > 0) {
      const { rankedAnswers, playerAwards, personalityDeltas } = autoRankAnswers(
        r.submissions,
        room.players,
        r.type,
        r.prompt,
        isFinalRound
      );

      rankedAnswersData = rankedAnswers;

      for (const award of playerAwards) {
        const p = room.players.get(award.id);
        if (p) {
          p.score += award.points;
          allResults.push(award);
        }
      }

      // Apply personality deltas
      for (const [pid, delta] of personalityDeltas.entries()) {
        const existing = room.personalityVectors.get(pid) || { humor: 0, logic: 0, creativity: 0, chaos: 0, darkness: 0, laziness: 0 };
        room.personalityVectors.set(pid, {
          humor: Math.min(100, existing.humor + (delta.humor || 0)),
          logic: Math.min(100, existing.logic + (delta.logic || 0)),
          creativity: Math.min(100, existing.creativity + (delta.creativity || 0)),
          chaos: Math.min(100, existing.chaos + (delta.chaos || 0)),
          darkness: Math.min(100, existing.darkness + (delta.darkness || 0)),
          laziness: Math.min(100, existing.laziness + (delta.laziness || 0)),
        });
      }
    } else {
      // No one submitted - everyone gets 0
      for (const p of players) {
        allResults.push({ id: p.id, name: p.name, avatar: p.avatar, points: 0, reason: '😴 Question skipped – no submissions' });
      }
    }
  }

  const qNum = (room.currentQuestionInRound ?? 0) + 1;
  const totalQ = room.questionsPerRound || 7;
  const isLastQuestionInRound = qNum >= totalQ;
  const isLastRound = room.roundIndex + 1 >= ROUND_DEFS.length;

  room.lastResult = {
    round: r.number,
    questionIndex: qNum,
    name: r.name,
    type: r.type,
    results: allResults,
    rankedAnswers: rankedAnswersData,
    reveal: {
      prompt: r.prompt,
      challenge: r.challenge ? { prompt: r.challenge.prompt, question: r.challenge.question || r.challenge.scramble || r.challenge.hint } : null,
    }
  };

  addFeed(room, `Round ${r.number} · Q${qNum}/${totalQ} done — AI rankings in!`);

  if (isLastQuestionInRound && isLastRound) {
    // All 7 rounds and all questions finished!
    finishGame(room);
  } else {
    room.status = 'intermission';
    room.round = null;
    emitRoom(room);

    // Auto-advance timer (6s for next question, 8s for next round)
    const delay = isLastQuestionInRound ? 8000 : 6000;
    room.timer = setTimeout(() => {
      if (!rooms.has(room.code) || room.status !== 'intermission') return;
      if (isLastQuestionInRound) {
        startRound(room, room.roundIndex + 1);
      } else {
        room.currentQuestionInRound++;
        startQuestion(room);
      }
    }, delay);
  }
}

// ============================================================
//  FINISH GAME (After all 7 rounds complete)
// ============================================================
function finishGame(room: InternalRoom) {
  if (room.timer) clearTimeout(room.timer);
  room.status = 'finished';
  room.round = null;

  const sorted = [...room.players.values()].sort((a, b) => b.score - a.score);
  const winner = sorted[0] || null;
  if (!room.lastResult) {
    room.lastResult = { round: 7, questionIndex: 7, name: 'Final Chaos', type: 'creative', results: [], rankedAnswers: null, reveal: { prompt: '', challenge: null } };
  }
  room.lastResult.winner = winner ? { id: winner.id, name: winner.name, avatar: winner.avatar, score: winner.score } : null;

  // Build personality reports with rich partner matchmaking for all players
  const reports = buildPersonalityReports([...room.players.values()], room.personalityVectors);

  const pub = publicRoom(room);
  pub.personalityReports = reports;
  io.to(room.code).emit('room:update', pub);

  saveMatchResult(
    room.code,
    winner ? { name: winner.name, avatar: winner.avatar, score: winner.score } : null,
    sorted.map(p => ({ name: p.name, avatar: p.avatar, score: p.score })),
    ROUND_DEFS.length
  );
}

// ============================================================
//  SOCKET.IO HANDLERS
// ============================================================
function createRoom(socket: Socket, name: string, avatar: string) {
  let code = makeCode();
  while (rooms.has(code)) code = makeCode();
  const room: InternalRoom = {
    code,
    hostId: socket.id,
    players: new Map(),
    status: 'lobby',
    roundIndex: -1,
    questionsPerRound: 7,
    currentQuestionInRound: 0,
    round: null,
    timer: null,
    lastResult: null,
    feed: [],
    usedQuestions: new Set(),
    personalityVectors: new Map(),
  };
  const chosenAvatar = safeAvatar(avatar);
  room.players.set(socket.id, { id: socket.id, name: safeName(name), avatar: chosenAvatar, ready: true, score: 0, connected: true });
  rooms.set(code, room);
  socket.join(code);
  (socket as any).roomCode = code;
  addFeed(room, `${chosenAvatar} ${safeName(name)} created the room`);
  emitRoom(room);
  socket.emit('room:joined', { code, id: socket.id });
}

io.on('connection', (socket: Socket) => {
  socket.on('room:create', ({ name, avatar } = {}) => createRoom(socket, name, avatar));

  socket.on('room:join', ({ code, name, avatar } = {}) => {
    code = String(code || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return socket.emit('game:error', 'Room not found. Check the code and try again.');
    if (room.status !== 'lobby') return socket.emit('game:error', 'This game already started. Ask the host to create a new room.');
    if (room.players.size >= 8) return socket.emit('game:error', 'Room is full (8 players max).');
    const clean = safeName(name);
    if ([...room.players.values()].some(p => p.name.toLowerCase() === clean.toLowerCase())) {
      return socket.emit('game:error', 'That nickname is already taken in this room.');
    }
    const chosenAvatar = safeAvatar(avatar);
    room.players.set(socket.id, { id: socket.id, name: clean, avatar: chosenAvatar, ready: false, score: 0, connected: true });
    socket.join(code);
    (socket as any).roomCode = code;
    addFeed(room, `${chosenAvatar} ${clean} joined the chaos!`);
    emitRoom(room);
    socket.emit('room:joined', { code, id: socket.id });
  });

  socket.on('room:config', ({ questionsPerRound } = {}) => {
    const room = rooms.get((socket as any).roomCode);
    if (!room || socket.id !== room.hostId || room.status !== 'lobby') return;
    const num = Math.min(10, Math.max(7, Number(questionsPerRound) || 7));
    room.questionsPerRound = num;
    addFeed(room, `⚙️ Host set ${num} questions per round!`);
    emitRoom(room);
  });

  socket.on('player:avatar', ({ avatar } = {}) => {
    const room = rooms.get((socket as any).roomCode);
    if (!room) return;
    const p = playerFor(room, socket);
    if (!p) return;
    p.avatar = safeAvatar(avatar);
    emitRoom(room);
  });

  socket.on('player:ready', ({ ready } = {}) => {
    const room = rooms.get((socket as any).roomCode);
    if (!room) return;
    const p = playerFor(room, socket);
    if (!p || room.status !== 'lobby') return;
    p.ready = !!ready;
    emitRoom(room);
  });

  socket.on('game:start', () => {
    const room = rooms.get((socket as any).roomCode);
    if (!room) return;
    if (socket.id !== room.hostId) return socket.emit('game:error', 'Only the host can start the game.');
    if (room.status !== 'lobby') return;
    if (room.players.size < 2) return socket.emit('game:error', 'You need at least 2 players to start.');
    if ([...room.players.values()].some(p => !p.ready)) return socket.emit('game:error', 'Everyone must be ready before starting.');
    for (const p of room.players.values()) p.score = 0;
    room.usedQuestions.clear();
    room.personalityVectors.clear();
    startRound(room, 0);
  });

  socket.on('round:submit', ({ text } = {}) => {
    const room = rooms.get((socket as any).roomCode);
    if (!room) return;
    const p = playerFor(room, socket);
    const r = room?.round;
    if (!p || !r || room.status !== 'playing') return;
    if (!['creative', 'mini', 'chaos', 'trivia'].includes(r.type)) return;

    const answer = String(text || '').trim().slice(0, 200);
    if (!answer || r.submissions.has(socket.id)) return;

    r.submissions.set(socket.id, { text: answer, player: { id: p.id, name: p.name, avatar: p.avatar } });
    addFeed(room, `${p.avatar} ${p.name} locked in their answer!`);
    emitRoom(room);
    sendPrivates(room);

    // Auto-finish question when everyone submits
    if (r.submissions.size >= room.players.size) {
      if (room.timer) clearTimeout(room.timer);
      room.timer = setTimeout(() => finishQuestion(room), 1200);
    }
  });

  socket.on('reaction:tap', () => {
    const room = rooms.get((socket as any).roomCode);
    if (!room) return;
    const r = room?.round;
    const p = playerFor(room, socket);
    if (!p || !r || r.type !== 'reaction' || !r.reactionStarted || r.answers.has(socket.id)) return;
    r.answers.set(socket.id, Date.now() - r.startedAt);
    emitRoom(room);
    if (r.answers.size === room.players.size) finishQuestion(room);
  });

  socket.on('reaction:emoji', ({ emoji } = {}) => {
    const room = rooms.get((socket as any).roomCode);
    if (!room) return;
    const p = playerFor(room, socket);
    if (!p || !emoji) return;
    io.to(room.code).emit('emoji:burst', { id: randomBytes(4).toString('hex'), emoji, senderName: p.name, senderAvatar: p.avatar });
  });

  socket.on('game:next', () => {
    const room = rooms.get((socket as any).roomCode);
    if (!room || socket.id !== room.hostId || room.status !== 'intermission') return;
    if (room.timer) clearTimeout(room.timer);
    const totalQ = room.questionsPerRound || 7;
    const isLastQ = (room.currentQuestionInRound ?? 0) + 1 >= totalQ;
    if (isLastQ) {
      startRound(room, room.roundIndex + 1);
    } else {
      room.currentQuestionInRound++;
      startQuestion(room);
    }
  });

  socket.on('game:rematch', () => {
    const room = rooms.get((socket as any).roomCode);
    if (!room || socket.id !== room.hostId || room.status !== 'finished') return;
    if (room.timer) clearTimeout(room.timer);
    room.roundIndex = -1;
    room.lastResult = null;
    room.status = 'lobby';
    room.round = null;
    room.currentQuestionInRound = 0;
    room.usedQuestions.clear();
    room.personalityVectors.clear();
    for (const p of room.players.values()) {
      p.score = 0;
      p.ready = p.id === room.hostId;
    }
    addFeed(room, '🔄 Rematch lobby opened!');
    emitRoom(room);
  });

  socket.on('disconnect', () => {
    const code = (socket as any).roomCode;
    const room = rooms.get(code);
    if (!room) return;
    const p = room.players.get(socket.id);
    if (p) {
      p.connected = false;
      addFeed(room, `${p.name} disconnected`);
    }
    if (room.status === 'lobby') {
      room.players.delete(socket.id);
      if (!room.players.size) { rooms.delete(code); return; }
      if (room.hostId === socket.id) room.hostId = room.players.keys().next().value as string;
    }
    emitRoom(room);
  });
});

// Launch
initDatabase().finally(() => {
  httpServer.listen(PORT, () => console.log(`🚀 CHAOS ROOM v3.0 Auto-Rank server listening on port ${PORT}`));
});
