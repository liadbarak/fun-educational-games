/*
 * Word lists, one entry per theme.
 *
 * `learner` words are short and common, and each carries a plain one-line
 * meaning written for someone whose English is limited — the meaning is shown
 * when the word is found, which is the only teaching the mode does.
 *
 * `native` words are longer and deliberately less obvious. No meanings; the
 * challenge there is finding them, not understanding them.
 *
 * Nothing here may be longer than the smallest grid it can appear in (10 for
 * learner, 13 for native), or it can never be placed.
 */
const THEMES = [
  {
    key: 'animals',
    name: 'Animals',
    learner: [
      { word: 'CAT',   meaning: 'a small pet with whiskers' },
      { word: 'DOG',   meaning: 'a pet that barks' },
      { word: 'COW',   meaning: 'a farm animal that gives milk' },
      { word: 'PIG',   meaning: 'a pink farm animal' },
      { word: 'HEN',   meaning: 'a female chicken' },
      { word: 'FISH',  meaning: 'an animal that lives in water' },
      { word: 'BIRD',  meaning: 'an animal with wings' },
      { word: 'DUCK',  meaning: 'a bird that swims' },
      { word: 'GOAT',  meaning: 'a farm animal with horns' },
      { word: 'HORSE', meaning: 'a large animal you can ride' },
      { word: 'SHEEP', meaning: 'a farm animal with wool' },
      { word: 'MOUSE', meaning: 'a very small animal with a long tail' },
    ],
    native: [
      'ELEPHANT', 'PORCUPINE', 'ALBATROSS', 'CHIMPANZEE', 'RHINOCEROS',
      'HEDGEHOG', 'FLAMINGO', 'CROCODILE', 'PANGOLIN', 'WOLVERINE',
      'ARMADILLO', 'MONGOOSE', 'OTTER', 'BADGER', 'HERON', 'LEMUR',
      'TAPIR', 'IGUANA',
    ],
  },

  {
    key: 'food',
    name: 'Food',
    learner: [
      { word: 'EGG',    meaning: 'a food that comes from a hen' },
      { word: 'RICE',   meaning: 'small white grains you boil' },
      { word: 'MILK',   meaning: 'a white drink from a cow' },
      { word: 'SOUP',   meaning: 'a hot liquid food you eat with a spoon' },
      { word: 'CAKE',   meaning: 'a sweet food for birthdays' },
      { word: 'MEAT',   meaning: 'food that comes from an animal' },
      { word: 'SALT',   meaning: 'white grains that make food taste better' },
      { word: 'BREAD',  meaning: 'a food made from flour, baked in an oven' },
      { word: 'APPLE',  meaning: 'a round red or green fruit' },
      { word: 'JUICE',  meaning: 'a drink made from fruit' },
      { word: 'HONEY',  meaning: 'a sweet food made by bees' },
      { word: 'CHEESE', meaning: 'a solid food made from milk' },
    ],
    native: [
      'ASPARAGUS', 'ARTICHOKE', 'CINNAMON', 'MERINGUE', 'RISOTTO',
      'AUBERGINE', 'CORIANDER', 'PARMESAN', 'ANCHOVY', 'MARZIPAN',
      'RHUBARB', 'SAFFRON', 'CHUTNEY', 'GNOCCHI', 'PISTACHIO',
      'TAMARIND', 'POLENTA', 'QUINCE',
    ],
  },

  {
    key: 'colours',
    name: 'Colours',
    learner: [
      { word: 'RED',    meaning: 'the colour of blood' },
      { word: 'BLUE',   meaning: 'the colour of the sky' },
      { word: 'PINK',   meaning: 'a light red colour' },
      { word: 'GREY',   meaning: 'the colour between black and white' },
      { word: 'GOLD',   meaning: 'the colour of a shiny yellow metal' },
      { word: 'GREEN',  meaning: 'the colour of grass' },
      { word: 'BLACK',  meaning: 'the colour of night' },
      { word: 'WHITE',  meaning: 'the colour of snow' },
      { word: 'BROWN',  meaning: 'the colour of wood or soil' },
      { word: 'ORANGE', meaning: 'the colour between red and yellow' },
      { word: 'PURPLE', meaning: 'the colour between red and blue' },
      { word: 'SILVER', meaning: 'the colour of a shiny grey metal' },
    ],
    native: [
      'VERMILION', 'TURQUOISE', 'CHARTREUSE', 'BURGUNDY', 'LAVENDER',
      'MAGENTA', 'CERULEAN', 'SCARLET', 'EMERALD', 'CRIMSON',
      'INDIGO', 'MAROON', 'VIOLET', 'AMBER', 'OCHRE', 'TEAL',
      'SEPIA', 'MAUVE',
    ],
  },

  {
    key: 'halloween',
    name: 'Halloween',
    learner: [
      { word: 'BAT',     meaning: 'a small animal that flies at night' },
      { word: 'CAT',      meaning: 'a small pet that says meow' },
      { word: 'MASK',     meaning: 'you wear this to cover your face' },
      { word: 'MOON',     meaning: 'it shines in the sky at night' },
      { word: 'DARK',     meaning: 'when there is no light at all' },
      { word: 'CANDY',    meaning: 'sweet treats children collect' },
      { word: 'GHOST',    meaning: 'the spirit of a dead person, in stories' },
      { word: 'WITCH',    meaning: 'a woman in stories who does magic' },
      { word: 'BONES',    meaning: 'the hard white parts inside a body' },
      { word: 'BROOM',    meaning: 'you sweep the floor with this' },
      { word: 'SPIDER',   meaning: 'a small creature with eight legs' },
      { word: 'PUMPKIN',  meaning: 'a big orange vegetable people carve' },
    ],
    native: [
      'SKELETON', 'VAMPIRE', 'WEREWOLF', 'HAUNTED', 'CAULDRON', 'GRAVEYARD',
      'COSTUME', 'LANTERN', 'GOBLIN', 'ZOMBIE', 'POTION', 'COBWEB',
      'SHADOW', 'MIDNIGHT', 'PHANTOM', 'SPECTRE', 'TOMBSTONE', 'MUMMY',
    ],
  },

  {
    key: 'christmas',
    name: 'Christmas',
    learner: [
      { word: 'ELF',      meaning: 'a small helper in a red and green hat' },
      { word: 'TREE',     meaning: 'a tall plant people decorate in December' },
      { word: 'GIFT',     meaning: 'something you wrap and give to someone' },
      { word: 'SNOW',     meaning: 'soft white flakes falling from the sky' },
      { word: 'STAR',     meaning: 'it shines at night, and tops the tree' },
      { word: 'BELL',     meaning: 'a metal cup that rings when you shake it' },
      { word: 'SANTA',    meaning: 'the man in red who brings presents' },
      { word: 'CAROL',    meaning: 'a song people sing in December' },
      { word: 'ANGEL',    meaning: 'a figure with wings, usually in white' },
      { word: 'SLEIGH',   meaning: 'a sledge pulled across the snow' },
      { word: 'CANDLE',   meaning: 'wax with a wick that gives light' },
      { word: 'REINDEER', meaning: 'an animal with antlers that pulls a sledge' },
    ],
    native: [
      'MISTLETOE', 'TINSEL', 'NATIVITY', 'WREATH', 'GARLAND', 'CHIMNEY',
      'STOCKING', 'ORNAMENT', 'MARZIPAN', 'PANTOMIME', 'YULETIDE', 'CRACKER',
      'BAUBLE', 'EPIPHANY', 'MANGER', 'TOBOGGAN', 'SPRUCE', 'FRANKINCENSE',
    ],
  },

  {
    key: 'space',
    name: 'Space',
    learner: [
      { word: 'SKY',    meaning: 'what you see above you outdoors' },
      { word: 'SUN',    meaning: 'the star that gives us light and heat' },
      { word: 'MOON',   meaning: 'it circles the Earth and glows at night' },
      { word: 'STAR',   meaning: 'a burning ball of gas, very far away' },
      { word: 'MARS',   meaning: 'the red planet, fourth from the sun' },
      { word: 'EARTH',  meaning: 'the planet we live on' },
      { word: 'ORBIT',  meaning: 'the path one body takes around another' },
      { word: 'COMET',  meaning: 'an icy body with a long bright tail' },
      { word: 'ALIEN',  meaning: 'a living thing from another world' },
      { word: 'LUNAR',  meaning: 'to do with the moon' },
      { word: 'ROCKET', meaning: 'it launches into the sky on a column of fire' },
      { word: 'PLANET', meaning: 'a large body that circles a star' },
    ],
    native: [
      'ASTEROID', 'NEBULA', 'GALAXY', 'SATELLITE', 'ECLIPSE', 'METEORITE',
      'TELESCOPE', 'GRAVITY', 'SUPERNOVA', 'ASTRONAUT', 'JUPITER', 'SATURN',
      'NEPTUNE', 'URANUS', 'MERCURY', 'PULSAR', 'QUASAR', 'COSMOS',
    ],
  },

  {
    key: 'ocean',
    name: 'Ocean',
    learner: [
      { word: 'FISH',  meaning: 'an animal that swims and has gills' },
      { word: 'CRAB',  meaning: 'it walks sideways and has claws' },
      { word: 'WAVE',  meaning: 'moving water that rolls onto a beach' },
      { word: 'SAND',  meaning: 'tiny grains you walk on at the beach' },
      { word: 'BOAT',  meaning: 'it floats and carries people on water' },
      { word: 'SEAL',  meaning: 'a smooth grey animal that barks' },
      { word: 'DEEP',  meaning: 'a very long way down' },
      { word: 'SHARK', meaning: 'a large fish with rows of sharp teeth' },
      { word: 'WHALE', meaning: 'the biggest animal in the sea' },
      { word: 'SHELL', meaning: 'the hard case a sea creature leaves behind' },
      { word: 'CORAL', meaning: 'a hard, colourful growth under the sea' },
      { word: 'SQUID', meaning: 'a soft creature with ten arms' },
    ],
    native: [
      'PLANKTON', 'BARNACLE', 'ANEMONE', 'JELLYFISH', 'SEAHORSE', 'STINGRAY',
      'OCTOPUS', 'DOLPHIN', 'LOBSTER', 'TRENCH', 'CURRENT', 'LAGOON',
      'ESTUARY', 'MOLLUSC', 'CRUSTACEAN', 'NAUTILUS', 'ABYSS', 'KELP',
    ],
  },

  {
    key: 'dinosaurs',
    name: 'Dinosaurs',
    learner: [
      { word: 'EGG',    meaning: 'a shell with a baby animal growing inside' },
      { word: 'BONE',   meaning: 'a hard white part of a skeleton' },
      { word: 'CLAW',   meaning: 'a sharp curved nail on a foot' },
      { word: 'TAIL',   meaning: 'the long part at the back of an animal' },
      { word: 'HORN',   meaning: 'a hard point growing from the head' },
      { word: 'ROAR',   meaning: 'a very loud, very deep sound' },
      { word: 'NEST',   meaning: 'where eggs are kept safe' },
      { word: 'TOOTH',  meaning: 'used for biting and chewing' },
      { word: 'SCALE',  meaning: 'one of the small plates covering skin' },
      { word: 'GIANT',  meaning: 'extremely large' },
      { word: 'SPIKE',  meaning: 'a sharp pointed part sticking out' },
      { word: 'FOSSIL', meaning: 'remains that have slowly turned to stone' },
    ],
    native: [
      'TRICERATOPS', 'STEGOSAURUS', 'PTERODACTYL', 'SPINOSAURUS', 'ALLOSAURUS',
      'DIPLODOCUS', 'IGUANODON', 'CRETACEOUS', 'MESOZOIC', 'JURASSIC',
      'TRIASSIC', 'PREDATOR', 'CARNIVORE', 'HERBIVORE', 'SKELETON',
      'EXTINCT', 'AMBER', 'TALON',
    ],
  },

  {
    key: 'sports',
    name: 'Sports',
    learner: [
      { word: 'RUN',   meaning: 'move fast on your feet' },
      { word: 'WIN',   meaning: 'finish first, or beat the other side' },
      { word: 'BALL',  meaning: 'a round thing you kick or throw' },
      { word: 'SWIM',  meaning: 'move yourself through water' },
      { word: 'JUMP',  meaning: 'push off the ground into the air' },
      { word: 'TEAM',  meaning: 'a group who play on the same side' },
      { word: 'GOAL',  meaning: 'where you score a point' },
      { word: 'RACE',  meaning: 'a contest to be the fastest' },
      { word: 'KICK',  meaning: 'hit something with your foot' },
      { word: 'THROW', meaning: 'send something through the air by hand' },
      { word: 'CATCH', meaning: 'take hold of something in the air' },
      { word: 'MATCH', meaning: 'a game between two sides' },
    ],
    native: [
      'BADMINTON', 'GYMNASTICS', 'ATHLETICS', 'LACROSSE', 'ROUNDERS',
      'ARCHERY', 'FENCING', 'CANOEING', 'TRIATHLON', 'DECATHLON',
      'SNOOKER', 'CURLING', 'HANDBALL', 'ROWING', 'SAILING', 'SKATING',
      'HURDLES', 'DISCUS',
    ],
  },

  {
    key: 'body',
    name: 'The Body',
    learner: [
      { word: 'ARM',    meaning: 'the long part between shoulder and hand' },
      { word: 'LEG',    meaning: 'you walk on two of these' },
      { word: 'HAND',   meaning: 'you hold things with this' },
      { word: 'FOOT',   meaning: 'you stand on two of these' },
      { word: 'HEAD',   meaning: 'the top of your body, above the neck' },
      { word: 'NOSE',   meaning: 'you smell and breathe through this' },
      { word: 'HAIR',   meaning: 'it grows on top of your head' },
      { word: 'KNEE',   meaning: 'the joint in the middle of your leg' },
      { word: 'MOUTH',  meaning: 'you eat and speak with this' },
      { word: 'TOOTH',  meaning: 'you chew your food with these' },
      { word: 'HEART',  meaning: 'it beats inside your chest' },
      { word: 'FINGER', meaning: 'you have five of these on each hand' },
    ],
    native: [
      'SHOULDER', 'ELBOW', 'ANKLE', 'WRIST', 'KNUCKLE', 'EYEBROW',
      'EYELASH', 'FOREHEAD', 'THUMB', 'SPINE', 'RIBCAGE', 'COLLARBONE',
      'TENDON', 'KIDNEY', 'PANCREAS', 'ABDOMEN', 'TEMPLE', 'LIVER',
    ],
  },
];
