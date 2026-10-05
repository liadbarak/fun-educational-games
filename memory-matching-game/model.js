/* Pure rules; pairs always share the exact same item ID and artwork. */
const MemoryModel = (() => {
  const themes = {
    animals: ['Cat','Dog','Fox','Bear','Panda','Rabbit','Frog','Owl','Pig','Mouse','Lion','Koala'],
    letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    dinosaurs: ['Rex','Triceratops','Stegosaurus','Diplodocus','Spinosaurus','Ankylosaurus','Parasaurolophus','Velociraptor','Brachiosaurus','Iguanodon','Pachycephalosaurus','Carnotaurus'],
    food: ['Apple','Pear','Orange','Grapes','Banana','Cherry','Carrot','Pizza','Cookie','Ice cream','Watermelon','Strawberry'],
    space: ['Rocket','Moon','Sun','Earth','Saturn','Star','Comet','Astronaut','Satellite','UFO','Telescope','Galaxy']
  };
  const levels = {easy:6, medium:8, hard:12};
  function shuffle(items, random = Math.random) {
    const a = items.slice();
    for (let i=a.length-1;i>0;i--) { const j=Math.floor(random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
    return a;
  }
  class Game {
    constructor(theme='animals', difficulty='easy', random=Math.random) {
      if (!themes[theme] || !levels[difficulty]) throw new Error('Unknown game settings');
      this.theme=theme; this.difficulty=difficulty; this.pairs=levels[difficulty];
      const items=shuffle(themes[theme].map((name,id)=>({name,id})),random).slice(0,this.pairs);
      this.cards=shuffle(items.flatMap(item=>[{...item},{...item}]),random);
      this.open=[]; this.matched=new Set(); this.moves=0; this.matches=0;
    }
    flip(index) {
      if (!Number.isInteger(index) || !this.cards[index] || this.open.length===2 || this.matched.has(index) || this.open.includes(index) || this.complete) return 'ignored';
      this.open.push(index);
      if(this.open.length===1) return 'first';
      this.moves++;
      if(this.cards[this.open[0]].id===this.cards[index].id) {
        this.open.forEach(i=>this.matched.add(i)); this.open=[]; this.matches++;
        return this.complete ? 'complete' : 'match';
      }
      return 'miss';
    }
    conceal() { this.open=[]; }
    get complete() { return this.matches===this.pairs; }
  }
  function better(candidate, best) { return !best || candidate.moves<best.moves || (candidate.moves===best.moves && candidate.seconds<best.seconds); }
  return {themes,levels,Game,better};
})();
if(typeof module!=='undefined') module.exports=MemoryModel;
