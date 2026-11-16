export const sportsCategories = [
  ['tennis', 'Tennis', '#b86a53'], ['basketball', 'Basketball', '#c5963f'],
  ['soccer', 'Football', '#56856b'], ['other', 'Other tagged sports', '#8f7187'],
  ['unspecified', 'Sport not specified', '#8d928a'],
];

export const civicCategories = [
  ['School', 'Schools', '#4d5e81'], ['Hospital', 'Hospitals', '#aa6570'],
  ['public', 'Police & municipal office', '#82715d'], ['culture', 'Cinemas & theatre', '#8d739d'],
];

export function categoryFilter(layer, value) {
  if (value === 'all') return null;
  const property = layer === 'sports' ? 'sport' : 'category';
  const groups = layer === 'sports'
    ? { other: ['multi', 'volleyball', 'handball', 'athletics', 'fitness', 'bmx'], unspecified: [null] }
    : { public: ['Police', 'Municipal office'], culture: ['Cinema', 'Theatre'] };
  return ['in', ['get', property], ['literal', groups[value] || [value]]];
}
