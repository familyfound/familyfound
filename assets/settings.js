
module.exports = {
  name: 'main',
  title: 'FamilyFound',
  settings: [
    {
      name: 'displayGens',
      value: 3,
      range: {
        min: 3,
        max: 7
      },
      type: 'range',
      description: 'the number of generations to display'
    }
  ]
};
