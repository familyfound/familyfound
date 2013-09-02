
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
    {
      path: '/',
      title: 'Todos'
    }, {
      path: '/person/',
      match: true,
      title: 'Tree'
    }, {
      path: '/photos/',
      match: true,
      title: 'Photos'
    }
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

