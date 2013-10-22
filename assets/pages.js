
module.exports = exports = {
  nav: [
    {
      path: '/',
      name: 'Todos'
    }, {
      path: '/person/',
      match: true,
      name: 'Tree'
    }, {
      path: 'https://github.com/familyfound/familyfound/issues',
      name: 'Issues',
      target: '_blank'
    /** }, {
      path: '/settings',
      icon: 'icon-cog'
    **/
    }, {
      path: 'https://github.com/familyfound/familyfound/',
      target: '_blank',
      icon: 'icon-github'
    }
  ],
  subNav: [
  ],
  routes: {
    '/': 'TodoView',
    '/person/': 'PersonView',
    '/person/:id': 'PersonView',
    '/photos/': 'PhotosView',
    '/photos/:id': 'PhotosView',
    // '/settings': 'Settings'
  }
};

