
module.exports = exports = {
  nav: [
    {
      path: '/',
      name: 'Home'
    }, {
      path: '#about',
      name: 'About'
    }, {
      path: 'https://github.com/familyfound/familyfound/issues',
      name: 'Issues',
      target: '_blank'
    }, {
      path: '/settings',
      icon: 'icon-cog'
    }, {
      path: 'https://github.com/familyfound/familyfound/',
      target: '_blank',
      icon: 'icon-github'
    }
  ],
  routes: {
    '/': 'PersonView',
    '/person/:id': 'PersonView',
    '/settings': 'Settings'
  }
};

