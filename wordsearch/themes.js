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
];
